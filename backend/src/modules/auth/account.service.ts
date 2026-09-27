import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from './password.service';

/**
 * FIN-039 · Cuenta y datos (Ley 1581: acceso, portabilidad, supresión).
 *
 *  - `me`: perfil + banderas de onboarding/consentimiento.
 *  - `exportData`: todo lo del usuario en un JSON legible (portabilidad).
 *  - `deleteAccount`: borrado lógico + ANONIMIZACIÓN inmediata. El `email`/`phone`
 *    se liberan (resuelve M7: un correo borrado puede volver a registrarse), la
 *    contraseña se anula (ningún token nuevo), los canales se revocan. Los datos
 *    financieros quedan bajo `deletedAt` durante el período de gracia.
 *  - `purgeExpired`: purga física automática a los 30 días (`DEC-0040` §3), la corre
 *    `AccountPurgeScheduler` cada madrugada.
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        currency: true,
        locale: true,
        timezone: true,
        onboardingDone: true,
        createdAt: true,
        settings: { select: { dataConsentAt: true, plan: true } },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const { settings, ...rest } = user;
    return { ...rest, dataConsentAt: settings?.dataConsentAt ?? null, plan: settings?.plan ?? 'free' };
  }

  async markOnboardingDone(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { onboardingDone: true } });
    return { onboardingDone: true };
  }

  async acceptDataPolicy(userId: string) {
    const now = new Date();
    await this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, dataConsentAt: now },
      update: { dataConsentAt: now },
    });
    return { dataConsentAt: now };
  }

  async exportData(userId: string) {
    const [user, debts, transactions, accounts, assets, incomeSources, fixedItems, insurances, purchases] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, fullName: true, currency: true, locale: true, timezone: true, createdAt: true },
        }),
        this.prisma.debt.findMany({ where: { userId, deletedAt: null }, include: { entity: { select: { name: true } } } }),
        this.prisma.transaction.findMany({
          where: { userId, deletedAt: null },
          orderBy: { occurredAt: 'desc' },
          include: { category: { select: { name: true } }, debt: { select: { name: true } } },
        }),
        this.prisma.account.findMany({ where: { userId, deletedAt: null } }),
        this.prisma.asset.findMany({ where: { userId, deletedAt: null } }),
        this.prisma.incomeSource.findMany({ where: { userId, deletedAt: null }, include: { deductions: true } }),
        this.prisma.fixedItem.findMany({ where: { userId, deletedAt: null } }),
        this.prisma.debtInsurance.findMany({ where: { debt: { userId }, deletedAt: null } }),
        this.prisma.cardPurchase.findMany({ where: { debt: { userId }, deletedAt: null }, include: { installments: true } }),
      ]);
    return {
      exportedAt: new Date().toISOString(),
      format: 'millo-export-v1',
      user,
      debts,
      insurances,
      cardPurchases: purchases,
      transactions,
      accounts,
      assets,
      incomeSources,
      fixedItems,
    };
  }

  async deleteAccount(userId: string, password: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!user.passwordHash || !(await this.passwords.verify(password, user.passwordHash))) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }
    const now = new Date();
    const stamp = `deleted+${user.id}@deleted.millo.local`;
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          deletedAt: now,
          email: stamp,
          phoneE164: null,
          passwordHash: null,
          fullName: null,
          externalUid: null,
        },
      }),
      this.prisma.whatsappLink.updateMany({ where: { userId }, data: { status: 'revoked', optIn: false } }),
      this.prisma.telegramLink.updateMany({ where: { userId }, data: { status: 'revoked', optIn: false } }),
      this.prisma.device.deleteMany({ where: { userId } }),
      this.prisma.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } }),
      this.prisma.conversation.deleteMany({ where: { userId } }),
    ]);
    return { deleted: true };
  }

  /**
   * Purga física de cuentas borradas hace más de `graceDays` (DEC-0040 §3: 30 días,
   * decisión del Fundador 2026-09-27). Todas las FKs hacia `users` son
   * `ON DELETE CASCADE`, así que borrar el usuario elimina deudas, movimientos, cuentas,
   * activos, ingresos, recordatorios, métricas, logros, suscripciones, etc. Se borra
   * usuario por usuario para que un fallo aislado no bloquee al resto.
   */
  async purgeExpired(graceDays = 30, now: Date = new Date()): Promise<{ purged: number; failed: number }> {
    const cutoff = new Date(now.getTime() - graceDays * 24 * 60 * 60 * 1000);
    const expired = await this.prisma.user.findMany({
      where: { deletedAt: { not: null, lte: cutoff } },
      select: { id: true },
    });
    let purged = 0;
    let failed = 0;
    for (const { id } of expired) {
      try {
        await this.prisma.user.delete({ where: { id } });
        purged++;
      } catch (e) {
        failed++;
        this.logger.error(`No se pudo purgar la cuenta ${id}: ${(e as Error).message}`);
      }
    }
    return { purged, failed };
  }
}
