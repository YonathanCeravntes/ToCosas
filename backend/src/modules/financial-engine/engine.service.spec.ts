import { EngineService } from './engine.service';
import { COLD_START_DAYS, MetricKey } from './engine.constants';

/** Prisma mock mínimo para recompute/coldStart. */
function buildPrisma(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    transaction: {
      groupBy: jest.fn().mockResolvedValue([
        { kind: 'ingreso', _sum: { amount: 4_000_000 } },
        { kind: 'gasto', _sum: { amount: 1_000_000 } },
        { kind: 'pago_deuda', _sum: { amount: 500_000 } },
      ]),
      findFirst: jest.fn().mockResolvedValue({ occurredAt: new Date('2026-04-01T00:00:00Z') }),
    },
    fixedItem: { findMany: jest.fn().mockResolvedValue([]) },
    debt: {
      findMany: jest.fn().mockResolvedValue([
        { monthlyPayment: 500_000, currentBalance: 10_000_000 },
      ]),
    },
    account: {
      findMany: jest.fn().mockResolvedValue([
        { currentBalance: 3_000_000, isLiquid: true, includeInNetWorth: true, isEmergencyFund: false },
      ]),
    },
    asset: { findMany: jest.fn().mockResolvedValue([]) },
    metricReading: {
      upsert: jest.fn().mockResolvedValue({}),
      // Usado por la integración del Score (FIN-004) para leer trend.net_worth.
      findFirst: jest.fn().mockResolvedValue(null),
    },
    ...overrides,
  } as never;
}

describe('EngineService', () => {
  const now = new Date('2026-07-15T12:00:00Z');

  it('recompute calcula y hace upsert de las métricas del mes', async () => {
    const prisma = buildPrisma();
    const service = new EngineService(prisma);
    const metrics = await service.recompute('u1', now);

    const get = (k: string) => metrics.find((m) => m.metricKey === k)?.value;
    expect(get(MetricKey.Cashflow)).toBe(2_500_000); // 4M − 1M − 0.5M
    expect(get(MetricKey.Dti)).toBe(0.125); // 500k / max(0, 4M)
    expect(get(MetricKey.NetWorth)).toBe(-7_000_000); // 3M − 10M

    // Upsert idempotente: ancla del mes + clave compuesta única. Además de las
    // métricas core, el ciclo persiste el Score y sus pilares (FIN-004).
    const upsert = (prisma as never as { metricReading: { upsert: jest.Mock } })
      .metricReading.upsert;
    const keys = upsert.mock.calls.map(
      (c) => c[0].where.userId_metricKey_period_capturedAt.metricKey as string,
    );
    expect(keys.filter((k) => !k.startsWith('score'))).toHaveLength(metrics.length);
    expect(keys).toContain('score');
    expect(keys).toContain('score.version');
    const call = upsert.mock.calls[0][0];
    expect(call.where.userId_metricKey_period_capturedAt.capturedAt.toISOString()).toBe(
      '2026-07-01T00:00:00.000Z',
    );
    expect(call.where.userId_metricKey_period_capturedAt.period).toBe('month');
  });

  it('recompute repetido produce los mismos upserts (estado absoluto)', async () => {
    const prisma = buildPrisma();
    const service = new EngineService(prisma);
    const a = await service.recompute('u1', now);
    const b = await service.recompute('u1', now);
    expect(b).toEqual(a); // mismo resultado — el upsert no duplica filas
  });

  describe('coldStartStatus (DEC-0003 §10.2, umbral global)', () => {
    it('usuario con ≥60 días de historial → habilitado', async () => {
      const prisma = buildPrisma(); // primera tx 2026-04-01, now 2026-07-15 → 105 días
      const service = new EngineService(prisma);
      const cold = await service.coldStartStatus('u1', now);
      expect(cold.enabled).toBe(true);
      expect(cold.historyDays).toBeGreaterThanOrEqual(COLD_START_DAYS);
      expect(cold.remainingDays).toBe(0);
    });

    it('usuario nuevo → deshabilitado con días restantes', async () => {
      const prisma = buildPrisma({
        transaction: {
          groupBy: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn().mockResolvedValue({ occurredAt: new Date('2026-07-05T00:00:00Z') }),
        },
      });
      const service = new EngineService(prisma);
      const cold = await service.coldStartStatus('u1', now);
      expect(cold.enabled).toBe(false);
      expect(cold.remainingDays).toBe(COLD_START_DAYS - 10);
    });

    it('usuario sin transacciones → deshabilitado', async () => {
      const prisma = buildPrisma({
        transaction: {
          groupBy: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn().mockResolvedValue(null),
        },
      });
      const service = new EngineService(prisma);
      const cold = await service.coldStartStatus('u1', now);
      expect(cold.enabled).toBe(false);
      expect(cold.remainingDays).toBe(COLD_START_DAYS);
    });
  });
});
