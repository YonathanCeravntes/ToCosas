import { RecommendationsService } from './recommendations.service';
import { DISCRETIONARY_GLOBAL_CATEGORIES } from './recommendations.constants';
import { FORBIDDEN_BRAND_TERMS } from '../copilot/copilot.constants';

/**
 * Tests del cupo con desplazamiento (DEC-0007 §10.2) y de la lista curada
 * (DEC-0007 §10.1). Se prueba `applyWithDisplacement` vía generateForUser con
 * mocks; el foco es la regla, no las consultas.
 */

function buildService(activeRecs: Array<{ id: string; priorityScore: number }>) {
  const created: unknown[] = [];
  const updated: unknown[] = [];
  const prisma = {
    recommendation: {
      findUnique: jest.fn().mockResolvedValue(null), // sin dedupe previo
      findMany: jest.fn().mockResolvedValue(
        activeRecs.map((r) => ({ ...r, status: 'new' })),
      ),
      create: jest.fn((args) => { created.push(args.data); return Promise.resolve(args.data); }),
      update: jest.fn((args) => { updated.push(args); return Promise.resolve({}); }),
    },
    transaction: { findMany: jest.fn().mockResolvedValue([]) },
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
  return { service: new RecommendationsService(prisma, simulations), created, updated };
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
