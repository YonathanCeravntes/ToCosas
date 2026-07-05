import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { monthStart } from '../financial-engine/metrics/series.util';

/** Catálogo tipado de features con entitlement (ARQ-0009 §4.2). */
export const Feature = {
  ScoreHistory: 'score_history',
  AiDailyMessages: 'ai_daily_messages',
  SimulationsPerMonth: 'simulations_per_month',
} as const;
export type Feature = (typeof Feature)[keyof typeof Feature];

/** Matriz oficial Free/Millo+ (DEC-0009 §4: 10/100 IA, 5/∞ simulaciones). */
const LIMITS: Record<Feature, { free: number | null; premium: number | null }> = {
  score_history: { free: 0, premium: null }, // null = ilimitado / acceso pleno
  ai_daily_messages: { free: 10, premium: 100 },
  simulations_per_month: { free: 5, premium: null },
};

/**
 * Autoridad ÚNICA de acceso premium (ARQ-0009 §4.2).
 *
 * DEC-0009 §10.4 (obligatorio): toda decisión de autorización lee `Subscription`
 * DIRECTAMENTE y valida fechas en el momento — NUNCA la caché `UserSettings.plan`
 * (esa caché existe solo para visualización barata en Ajustes).
 */
@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async hasPremium(userId: string, now: Date = new Date()): Promise<boolean> {
    const subs = await this.prisma.subscription.findMany({
      where: { userId, status: { in: ['trial', 'active'] } },
    });
    return subs.some((s) => {
      if (s.status === 'trial') return !!s.trialEndsAt && s.trialEndsAt > now;
      // active: sin fecha fin = vigente (p. ej. activación administrativa abierta)
      return !s.currentPeriodEnd || s.currentPeriodEnd > now;
    });
  }

  /** Límite vigente para una feature (null = ilimitado). */
  async limit(userId: string, feature: Feature, now: Date = new Date()): Promise<number | null> {
    const premium = await this.hasPremium(userId, now);
    return premium ? LIMITS[feature].premium : LIMITS[feature].free;
  }

  /** Cuota de simulaciones del mes: usadas, límite y disponibilidad. */
  async simulationQuota(userId: string, now: Date = new Date()) {
    const limit = await this.limit(userId, Feature.SimulationsPerMonth, now);
    if (limit === null) return { used: 0, limit: null, allowed: true };
    const used = await this.prisma.simulation.count({
      where: { userId, createdAt: { gte: monthStart(now) } },
    });
    return { used, limit, allowed: used < limit };
  }
}
