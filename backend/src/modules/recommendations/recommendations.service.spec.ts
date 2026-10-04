import { RecommendationsService } from './recommendations.service';
import { DISCRETIONARY_GLOBAL_CATEGORIES } from './recommendations.constants';
import { FORBIDDEN_BRAND_TERMS } from '../copilot/copilot.constants';

/**
 * Tests del cupo con desplazamiento (DEC-0007 §10.2) y de la lista curada
 * (DEC-0007 §10.1). Se prueba `applyWithDisplacement` vía generateForUser con
 * mocks; el foco es la regla, no las consultas.
 */

function buildService(
  activeRecs: Array<{ id: string; priorityScore: number }>,
  // FIN-021: lecturas persistidas del Motor (fuente oficial del fondo, §32).
  metricReadings: Array<{ metricKey: string; value: number }> = [],
) {
  const created: unknown[] = [];
  const updated: unknown[] = [];
  const superseded: unknown[] = [];
  const prisma = {
    recommendation: {
      findUnique: jest.fn().mockResolvedValue(null), // sin dedupe previo
      findMany: jest.fn().mockResolvedValue(
        activeRecs.map((r) => ({ ...r, status: 'new' })),
      ),
      create: jest.fn((args) => { created.push(args.data); return Promise.resolve(args.data); }),
      update: jest.fn((args) => { updated.push(args); return Promise.resolve({}); }),
      updateMany: jest.fn((args) => { superseded.push(args); return Promise.resolve({ count: 0 }); }),
    },
    transaction: { findMany: jest.fn().mockResolvedValue([]) },
    metricReading: { findMany: jest.fn().mockResolvedValue(metricReadings) },
  } as never;
  // Estado: excedente amplio + deuda cara → candidata de abono con prioridad alta.
  const simulations = {
    loadState: jest.fn().mockResolvedValue({
      income: 6_000_000,
      expense: 2_000_000,
      debtPayments: 0,
      fixedIncome: 6_000_000,
      fixedExpense: 1_000_000,
      debts: [{ id: 'd1', ref: 'deuda #1 (tarjeta_credito)', type: 'tarjeta_credito', balance: 8_000_000, ratePct: 32, rateBasis: 'EA', monthlyPayment: 400_000, remainingMonths: 24 }],
      liquidBalance: 10_000_000,
      emergencyBalance: 10_000_000,
      assetsOnly: 0,
      netWorthTrend: null,
    }),
    projectOnly: jest.fn().mockResolvedValue({
      before: { dti: 0.066 },
      delta: { score: 30 },
      specifics: { interestSaved: 2_500_000, monthsSaved: 8 },
    }),
  } as never;
  return { service: new RecommendationsService(prisma, simulations), created, updated, superseded, prisma, simulations };
}

describe('cupo de 3 con desplazamiento (DEC-0007 §10.2)', () => {
  it('prioridad estrictamente mayor → desplaza a la más débil (superseded)', async () => {
    const { service, created, updated } = buildService([
      { id: 'weak', priorityScore: 0.01 },
      { id: 'mid', priorityScore: 0.5 },
      { id: 'strong', priorityScore: 0.9 },
    ]);
    const n = await service.generateForUser('u1', new Date('2026-07-15T12:00:00Z'));
    expect(n).toBe(1);
    expect(created).toHaveLength(1);
    const dismissal = updated[0] as { where: { id: string }; data: { status: string; dismissReason: string } };
    expect(dismissal.where.id).toBe('weak');
    expect(dismissal.data.status).toBe('dismissed');
    expect(dismissal.data.dismissReason).toBe('superseded');
  });

  it('prioridad igual o menor → NO se crea este ciclo', async () => {
    const { service, created, updated } = buildService([
      { id: 'a', priorityScore: 0.99 },
      { id: 'b', priorityScore: 0.99 },
      { id: 'c', priorityScore: 0.99 },
    ]);
    const n = await service.generateForUser('u1', new Date('2026-07-15T12:00:00Z'));
    expect(n).toBe(0);
    expect(created).toHaveLength(0);
    expect(updated).toHaveLength(0); // nadie fue desplazado
  });
});

describe('lista curada discrecional (DEC-0007 §10.1)', () => {
  it('solo contiene nombres de categorías globales sembradas', () => {
    const seeded = ['Comida', 'Mercado', 'Transporte', 'Servicios', 'Arriendo', 'Salud', 'Entretenimiento', 'Ropa', 'Educación', 'Hogar', 'Otros gastos'];
    for (const cat of DISCRETIONARY_GLOBAL_CATEGORIES) {
      expect(seeded).toContain(cat);
    }
    // Esenciales fuera de la lista:
    for (const essential of ['Arriendo', 'Mercado', 'Salud', 'Servicios']) {
      expect(DISCRETIONARY_GLOBAL_CATEGORIES).not.toContain(essential);
    }
  });
});

describe('fondo de emergencia con hitos oficiales (FIN-021, DEC-0021 §5.1)', () => {
  const reading = (months: number, essential = 1_400_000) => [
    { metricKey: 'emergency_fund_months', value: months },
    { metricKey: 'essential_expense', value: essential },
  ];
  const fondoOf = (created: unknown[]) =>
    (created as Array<{ kind: string; title: string; body: string }>).find(
      (c) => c.kind === 'fondo_emergencia',
    );

  it('por debajo del colchón: la candidata apunta al colchón inicial y lo NOMBRA', async () => {
    const { service, created } = buildService([], reading(1.2));
    await service.generateForUser('u1', new Date('2026-07-15T12:00:00Z'));
    const fondo = fondoOf(created);
    // surplus 4M → aporte 1.2M; gap (3−1,2)×1,4M = 2,52M → 3 meses.
    expect(fondo?.title).toBe('Aparta $1.200.000/mes para tu colchón inicial');
    expect(fondo?.body).toContain('colchón inicial (3 meses de lo esencial cubiertos) en 3 meses');
  });

  it('entre hitos: apunta al fondo completo (antes NO se generaba — escala Alt C)', async () => {
    const { service, created } = buildService([], reading(4));
    await service.generateForUser('u1', new Date('2026-07-15T12:00:00Z'));
    expect(fondoOf(created)?.title).toContain('fondo completo');
  });

  it('fondo completo logrado o sin lectura del Motor: no se genera candidata', async () => {
    const done = buildService([], reading(6.5));
    await done.service.generateForUser('u1', new Date('2026-07-15T12:00:00Z'));
    expect(fondoOf(done.created)).toBeUndefined();

    const noData = buildService([], []);
    await noData.service.generateForUser('u1', new Date('2026-07-15T12:00:00Z'));
    expect(fondoOf(noData.created)).toBeUndefined();
  });
});

describe('genericidad (DEC-0005 §14.2 aplica a recomendaciones)', () => {
  it('los textos generados no nombran marcas', async () => {
    const { service, created } = buildService([]);
    await service.generateForUser('u1', new Date('2026-07-15T12:00:00Z'));
    const text = JSON.stringify(created).toLowerCase();
    for (const term of FORBIDDEN_BRAND_TERMS) {
      expect(text.includes(term)).toBe(false);
    }
  });
});

describe('BT-043: sin repetidas ni estrategias vacías', () => {
  it('al crear una candidata, retira las activas del mismo tipo de meses anteriores', async () => {
    const { service, created, superseded } = buildService([]);
    await service.generateForUser('u1', new Date('2026-10-04T12:00:00Z'));
    expect(created.length).toBeGreaterThan(0);
    const kinds = (superseded as Array<{ where: { kind: string }; data: { status: string } }>).map((s) => s.where.kind);
    for (const c of created as Array<{ kind: string }>) expect(kinds).toContain(c.kind);
    expect((superseded[0] as { data: { status: string } }).data.status).toBe('dismissed');
  });

  it('no recomienda un método de deudas si la diferencia de intereses es $0', async () => {
    const { service, created, simulations } = buildService([]);
    (simulations as unknown as { loadState: jest.Mock }).loadState.mockResolvedValueOnce({
      income: 6_000_000, expense: 2_000_000, debtPayments: 0, fixedIncome: 6_000_000, fixedExpense: 1_000_000,
      debts: [
        { id: 'd1', ref: 'deuda #1', type: 'libre_inversion', balance: 8_000_000, ratePct: 20, rateBasis: 'EA', monthlyPayment: 400_000, remainingMonths: 24 },
        { id: 'd2', ref: 'deuda #2', type: 'tarjeta_credito', balance: 3_000_000, ratePct: 28, rateBasis: 'EA', monthlyPayment: 200_000, remainingMonths: 18 },
      ],
      liquidBalance: 0, emergencyBalance: 0, assetsOnly: 0, netWorthTrend: null,
    });
    (simulations as unknown as { projectOnly: jest.Mock }).projectOnly.mockResolvedValue({
      before: { dti: 0.5 }, delta: { score: 30 }, specifics: { interestSaved: 0, monthsSaved: 0, interestDifference: 0, recommended: 'avalanche' },
    });
    await service.generateForUser('u1', new Date('2026-10-04T12:00:00Z'));
    expect((created as Array<{ kind: string }>).find((c) => c.kind === 'estrategia')).toBeUndefined();
  });

  it('la lista muestra una por tipo (la más reciente) y oculta estrategias de $0 ya guardadas', async () => {
    const { service, prisma } = buildService([]);
    const rows = [
      { id: 'e-sep', kind: 'estrategia', priorityScore: 0.1, createdAt: new Date('2026-09-02'), impact: { interestDifference: 0 } },
      { id: 'e-oct', kind: 'estrategia', priorityScore: 0.1, createdAt: new Date('2026-10-02'), impact: { interestDifference: 0 } },
      { id: 'a-sep', kind: 'abono_extra', priorityScore: 0.3, createdAt: new Date('2026-09-02'), impact: {} },
      { id: 'a-oct', kind: 'abono_extra', priorityScore: 0.3, createdAt: new Date('2026-10-02'), impact: {} },
    ];
    (prisma as unknown as { recommendation: { findMany: jest.Mock } }).recommendation.findMany.mockResolvedValueOnce(rows);
    const out = await service.list('u1');
    expect(out.map((r) => r.id)).toEqual(['a-oct']);
  });
});

describe('FIN-061: Motor de Salida Humano', () => {
  it('no recomienda recortar categorías (ni comida ni salidas), aunque el gasto sea alto', async () => {
    const { service, created, prisma } = buildService([]);
    (prisma as unknown as { transaction: { findMany: jest.Mock } }).transaction.findMany.mockResolvedValue([
      { amount: 900_000, category: { name: 'Comida' } },
      { amount: 700_000, category: { name: 'Salidas y entretenimiento' } },
    ]);
    await service.generateForUser('u1', new Date('2026-10-04T12:00:00Z'));
    expect((created as Array<{ kind: string }>).some((c) => c.kind === 'recorte_categoria')).toBe(false);
  });

  it('no recomienda avalancha/bola de nieve: el orden lo da el plan para liberar flujo', async () => {
    const { service, created, simulations } = buildService([]);
    (simulations as unknown as { projectOnly: jest.Mock }).projectOnly.mockResolvedValue({
      before: { dti: 0.6 }, delta: { score: 30 }, specifics: { interestSaved: 1_000_000, monthsSaved: 3, interestDifference: 2_000_000, recommended: 'avalanche' },
    });
    await service.generateForUser('u1', new Date('2026-10-04T12:00:00Z'));
    expect((created as Array<{ kind: string }>).some((c) => c.kind === 'estrategia')).toBe(false);
  });

  it('el abono extra va a la deuda que libera flujo primero (cuota ÷ saldo), con tasas en EA', async () => {
    const { service, created, simulations } = buildService([]);
    (simulations as unknown as { loadState: jest.Mock }).loadState.mockResolvedValueOnce({
      income: 6_000_000, expense: 2_000_000, debtPayments: 0, fixedIncome: 6_000_000, fixedExpense: 1_000_000,
      debts: [
        // Mayor tasa cruda, pero libera poco flujo (cuota pequeña frente al saldo).
        { id: 'grande', ref: 'deuda #1 (libre_inversion)', type: 'libre_inversion', balance: 50_000_000, ratePct: 30, rateBasis: 'EA', monthlyPayment: 1_000_000, remainingMonths: 60 },
        // 2,5 % mensual (≈34 % EA) y se termina rápido: libera su cuota pronto.
        { id: 'tarjeta', ref: 'deuda #2 (tarjeta_credito)', type: 'tarjeta_credito', balance: 2_000_000, ratePct: 2.5, rateBasis: 'MV', monthlyPayment: 330_000, remainingMonths: 7 },
      ],
      liquidBalance: 0, emergencyBalance: 0, assetsOnly: 0, netWorthTrend: null,
    });
    await service.generateForUser('u1', new Date('2026-10-04T12:00:00Z'));
    const abono = (created as Array<{ kind: string; title: string }>).find((c) => c.kind === 'abono_extra');
    expect(abono?.title).toContain('deuda #2');
  });

  it('la lista oculta recomendaciones retiradas que ya estaban guardadas', async () => {
    const { service, prisma } = buildService([]);
    (prisma as unknown as { recommendation: { findMany: jest.Mock } }).recommendation.findMany.mockResolvedValueOnce([
      { id: 'r1', kind: 'recorte_categoria', priorityScore: 0.9, createdAt: new Date('2026-10-01'), impact: {} },
      { id: 'f1', kind: 'fondo_emergencia', priorityScore: 0.5, createdAt: new Date('2026-10-01'), impact: {} },
    ]);
    const out = await service.list('u1');
    expect(out.map((r) => r.id)).toEqual(['f1']);
  });
});
