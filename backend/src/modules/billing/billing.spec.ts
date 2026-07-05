import { BadRequestException, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { EntitlementsService } from './entitlements.service';
import { PromoService } from './promo.service';
import { SubscriptionService } from './subscription.service';
import { AdminGuard } from './billing.controller';

const now = new Date('2026-07-15T12:00:00Z');
const future = new Date('2026-08-15T12:00:00Z');
const past = new Date('2026-06-15T12:00:00Z');

describe('EntitlementsService (DEC-0009 §10.4 — lee Subscription, nunca la caché)', () => {
  function build(subs: unknown[], simCount = 0) {
    const prisma = {
      subscription: { findMany: jest.fn().mockResolvedValue(subs) },
      simulation: { count: jest.fn().mockResolvedValue(simCount) },
      // Nota deliberada: NO se mockea userSettings — si hasPremium lo tocara,
      // el test explota. Esa es la garantía del cambio obligatorio #4.
    } as never;
    return new EntitlementsService(prisma);
  }

  it('suscripción activa vigente → premium', async () => {
    const svc = build([{ status: 'active', currentPeriodEnd: future, trialEndsAt: null }]);
    expect(await svc.hasPremium('u1', now)).toBe(true);
  });

  it('CRÍTICO §10.4: suscripción expirada por fecha → free, aunque la caché `plan` diga premium', async () => {
    // La caché desactualizada no participa: solo cuentan las fechas de Subscription.
    const svc = build([{ status: 'active', currentPeriodEnd: past, trialEndsAt: null }]);
    expect(await svc.hasPremium('u1', now)).toBe(false);
  });

  it('trial vigente → premium; trial vencido → free', async () => {
    expect(await build([{ status: 'trial', trialEndsAt: future }]).hasPremium('u1', now)).toBe(true);
    expect(await build([{ status: 'trial', trialEndsAt: past }]).hasPremium('u1', now)).toBe(false);
  });

  it('matriz: límites free 10 IA / 5 sims; premium 100 / ilimitadas', async () => {
    const free = build([]);
    expect(await free.limit('u1', 'ai_daily_messages', now)).toBe(10);
    expect(await free.limit('u1', 'simulations_per_month', now)).toBe(5);
    const premium = build([{ status: 'active', currentPeriodEnd: future }]);
    expect(await premium.limit('u1', 'ai_daily_messages', now)).toBe(100);
    expect(await premium.limit('u1', 'simulations_per_month', now)).toBeNull();
  });

  it('cuota de simulaciones: 5ª permitida, 6ª bloqueada (free, sin grandfathering)', async () => {
    expect((await build([], 4).simulationQuota('u1', now)).allowed).toBe(true);
    expect((await build([], 5).simulationQuota('u1', now)).allowed).toBe(false);
  });
});

describe('PromoService (DEC-0009 §10.1/§10.2/§10.6)', () => {
  function build(redeemRows: unknown[]) {
    const adminLogs: unknown[] = [];
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue(redeemRows),
      promoCode: { create: jest.fn((a) => Promise.resolve(a.data)) },
      adminActionLog: { create: jest.fn((a) => { adminLogs.push(a.data); return Promise.resolve(a.data); }) },
    } as never;
    const subscriptions = { activate: jest.fn().mockResolvedValue({ id: 's1' }) } as never;
    return { service: new PromoService(prisma, subscriptions), prisma, subscriptions, adminLogs };
  }

  it('canje atómico: el UPDATE condicionado devuelve la fila y activa', async () => {
    const { service, subscriptions } = build([{ id: 'p1', duration_days: 30 }]);
    const result = await service.redeem('u1', 'millo-x');
    expect(result.days).toBe(30);
    expect((subscriptions as { activate: jest.Mock }).activate).toHaveBeenCalledWith('u1', 'promo', 30, 'p1');
  });

  it('canje sin filas (agotado/vencido/inexistente) → rechazo, sin activar', async () => {
    const { service, subscriptions } = build([]);
    await expect(service.redeem('u1', 'millo-x')).rejects.toThrow(BadRequestException);
    expect((subscriptions as { activate: jest.Mock }).activate).not.toHaveBeenCalled();
  });

  it('§10.6: crear código SIN maxUses (o inválido) se rechaza a nivel de servicio', async () => {
    const { service } = build([]);
    await expect(service.createCode({ maxUses: 0 })).rejects.toThrow(/maxUses/);
    await expect(service.createCode({ maxUses: -3 })).rejects.toThrow(/maxUses/);
    await expect(service.createCode({ maxUses: 2.5 as never })).rejects.toThrow(/maxUses/);
    const ok = await service.createCode({ maxUses: 10 });
    expect(ok.code).toMatch(/^MILLO-/);
  });

  it('§10.2: la activación administrativa exige reason y deja log inmutable', async () => {
    const { service, adminLogs } = build([]);
    await expect(service.adminActivate('adm', 'usr', 30, '')).rejects.toThrow(/reason/);
    await service.adminActivate('adm', 'usr', 30, 'early adopter');
    expect(adminLogs[0]).toMatchObject({
      adminUserId: 'adm',
      targetUserId: 'usr',
      action: 'activate_premium_30d',
      reason: 'early adopter',
    });
  });
});

describe('SubscriptionService — expiración y caché', () => {
  it('expireDue marca vencidas y degrada la caché de plan', async () => {
    const updates: unknown[] = [];
    const upserts: unknown[] = [];
    const prisma = {
      subscription: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 's1', userId: 'u1', status: 'trial', trialEndsAt: past }])
          .mockResolvedValue([]), // syncPlanCache: sin suscripciones vigentes
        update: jest.fn((a) => { updates.push(a); return Promise.resolve({}); }),
      },
      userSettings: { upsert: jest.fn((a) => { upserts.push(a); return Promise.resolve({}); }) },
    } as never;
    const svc = new SubscriptionService(prisma);
    expect(await svc.expireDue(now)).toBe(1);
    expect((updates[0] as { data: { status: string } }).data.status).toBe('expired');
    expect((upserts[0] as { update: { plan: string } }).update.plan).toBe('free');
  });
});

describe('AdminGuard (DEC-0009 §10.2 — cambio obligatorio #2)', () => {
  const ctxWith = (user: unknown): ExecutionContext =>
    ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) }) as never;
  const guardWith = (dbUser: { isAdmin: boolean } | null) =>
    new AdminGuard({ user: { findUnique: jest.fn().mockResolvedValue(dbUser) } } as never);

  it('rechaza a un usuario autenticado sin isAdmin', async () => {
    await expect(guardWith({ isAdmin: false }).canActivate(ctxWith({ id: 'u1' }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('permite a un usuario con isAdmin=true', async () => {
    expect(await guardWith({ isAdmin: true }).canActivate(ctxWith({ id: 'u1' }))).toBe(true);
  });

  it('lee req.user.id (forma real de JwtAuthGuard) — regresión: con solo `sub` rechaza', async () => {
    // JwtAuthGuard adjunta { id, email }; una versión previa leía `sub` y
    // rechazaba SIEMPRE, incluso a admins reales. Detectado por E2E.
    await expect(guardWith({ isAdmin: true }).canActivate(ctxWith({ sub: 'u1' }))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
