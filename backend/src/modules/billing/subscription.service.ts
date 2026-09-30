import { Injectable, Logger } from '@nestjs/common';
import { PaymentProviderKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export const TRIAL_DAYS = 7;

/**
 * Ciclo de vida de suscripciones (ARQ-0009 §4.3). La fuente de verdad del
 * acceso es SIEMPRE esta tabla (DEC-0009 §10.4); `UserSettings.plan` se
 * mantiene como caché de visualización y se sincroniza aquí.
 */
@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Trial de 7 días al registrarse, UNA sola vez por usuario (DEC-0009 §4.8). */
  async grantTrialOnce(userId: string, now: Date = new Date()): Promise<boolean> {
    const previous = await this.prisma.subscription.findFirst({ where: { userId } });
    if (previous) return false; // ya tuvo alguna suscripción/trial
    await this.prisma.subscription.create({
      data: {
        userId,
        status: 'trial',
        provider: 'manual',
        trialEndsAt: new Date(now.getTime() + TRIAL_DAYS * 86_400_000),
      },
    });
    await this.syncPlanCache(userId);
    return true;
  }

  /** Activa/extiende Millo+ por un proveedor (promo, admin, RevenueCat). */
  async activate(
    userId: string,
    provider: PaymentProviderKind,
    days: number | null,
    providerRef?: string,
    now: Date = new Date(),
  ) {
    const sub = await this.prisma.subscription.create({
      data: {
        userId,
        status: 'active',
        provider,
        providerRef: providerRef ?? null,
        currentPeriodEnd: days ? new Date(now.getTime() + days * 86_400_000) : null,
      },
    });
    await this.syncPlanCache(userId);
    return sub;
  }

  /**
   * Sincroniza desde un evento de RevenueCat (webhook). Eventos soportados:
   * INITIAL_PURCHASE/RENEWAL/UNCANCELLATION → active hasta expiration;
   * CANCELLATION → canceled (mantiene acceso hasta expiration);
   * EXPIRATION → expired.
   */
  async syncFromRevenueCat(event: {
    type: string;
    app_user_id: string;
    expiration_at_ms?: number;
    id?: string;
  }): Promise<void> {
    const userId = event.app_user_id;
    const periodEnd = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
    const existing = await this.prisma.subscription.findFirst({
      where: { userId, provider: 'revenuecat' },
      orderBy: { createdAt: 'desc' },
    });

    const statusFor = (type: string) =>
      type === 'EXPIRATION' ? 'expired' : type === 'CANCELLATION' ? 'canceled' : 'active';
    const status = statusFor(event.type);

    if (existing) {
      await this.prisma.subscription.update({
        where: { id: existing.id },
        data: { status, currentPeriodEnd: periodEnd, providerRef: event.id ?? existing.providerRef },
      });
    } else {
      await this.prisma.subscription.create({
        data: { userId, status, provider: 'revenuecat', providerRef: event.id ?? null, currentPeriodEnd: periodEnd },
      });
    }
    await this.syncPlanCache(userId);
  }

  /** Estado para la UI (Ajustes/paywall). */
  async statusFor(userId: string, now: Date = new Date()) {
    const subs = await this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const current = subs.find((s) => {
      if (s.status === 'trial') return !!s.trialEndsAt && s.trialEndsAt > now;
      if (s.status === 'active' || s.status === 'canceled')
        return !s.currentPeriodEnd || s.currentPeriodEnd > now;
      return false;
    });
    return {
      plan: current ? 'premium' : 'free',
      status: current?.status ?? null,
      provider: current?.provider ?? null,
      until: current?.status === 'trial' ? current.trialEndsAt : current?.currentPeriodEnd ?? null,
      hadTrial: subs.some((s) => s.status === 'trial' || s.trialEndsAt !== null),
    };
  }

  /** Job diario: marca vencidas y degrada la caché (§4.3). */
  async expireDue(now: Date = new Date()): Promise<number> {
    const due = await this.prisma.subscription.findMany({
      where: {
        OR: [
          { status: 'trial', trialEndsAt: { lt: now } },
          { status: { in: ['active', 'canceled'] }, currentPeriodEnd: { not: null, lt: now } },
        ],
      },
    });
    for (const sub of due) {
      await this.prisma.subscription.update({ where: { id: sub.id }, data: { status: 'expired' } });
      await this.syncPlanCache(sub.userId);
    }
    if (due.length > 0) this.logger.log(`Suscripciones expiradas: ${due.length}`);
    return due.length;
  }

  /** Caché de visualización (NUNCA usada para autorización, DEC-0009 §10.4). */
  async syncPlanCache(userId: string, now: Date = new Date()): Promise<void> {
    const subs = await this.prisma.subscription.findMany({
      where: { userId, status: { in: ['trial', 'active', 'canceled'] } },
    });
    const premium = subs.some((s) =>
      s.status === 'trial'
        ? !!s.trialEndsAt && s.trialEndsAt > now
        : !s.currentPeriodEnd || s.currentPeriodEnd > now,
    );
    await this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, plan: premium ? 'premium' : 'free' },
      update: { plan: premium ? 'premium' : 'free' },
    });
  }
}
