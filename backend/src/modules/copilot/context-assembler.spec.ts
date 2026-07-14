import { ContextAssembler, toMinimizedSimulationView } from './context-assembler';
import { assertMinimized, MINIMIZED_BRAND } from './minimized-views';
import { SimulationResult } from '../simulations/simulation-engine';

/**
 * TEST DE REGRESIÓN DE MINIMIZACIÓN (DEC-0005 §10.1 / ARQ-0005 v2 §4.3-A).
 *
 * Siembra PII deliberada en TODOS los campos de texto libre del dominio y
 * verifica que NINGUNA aparece en NINGUNA de las 4 vistas que pueden cruzar
 * hacia el LLM. Si alguien añade un campo al contexto, este test lo detecta.
 */

// PII sembrada — cada cadena es única y buscable.
const PII = {
  debtName: 'Préstamo de mi hermano Andrés Gómez cel 3001234567',
  fixedItemName: 'Arriendo donde mi tía en la Calle 45 #12-34',
  categoryName: 'Gastos de la clínica de mamá Luisa Pérez',
  accountName: 'Cuenta Bancolombia de Yonathan 912-345678-90',
  assetName: 'Apto heredado de la abuela Carmen en Chapinero',
  txNote: 'pago a Juan Restrepo cédula 79.123.456',
  email: 'yonathan.secreto@correo.com',
  phone: '+573001112222',
  userId: 'a1b2c3d4-0000-1111-2222-333344445555',
};

const now = new Date('2026-07-15T12:00:00Z');
const monthAnchor = new Date('2026-07-01T00:00:00Z');

function buildPrisma() {
  return {
    metricReading: {
      findMany: jest.fn().mockResolvedValue([
        { metricKey: 'score', value: 800, period: 'month', capturedAt: monthAnchor },
        { metricKey: 'score.debt', value: 90, period: 'month', capturedAt: monthAnchor },
        { metricKey: 'cashflow', value: 1_000_000, period: 'month', capturedAt: monthAnchor },
        { metricKey: 'dti', value: 0.1, period: 'month', capturedAt: monthAnchor },
      ]),
    },
    fixedItem: {
      findMany: jest.fn().mockResolvedValue([
        { kind: 'gasto', name: PII.fixedItemName, amount: 1_200_000, createdAt: now },
        { kind: 'ingreso', name: 'Salario de ' + PII.email, amount: 5_000_000, createdAt: now },
      ]),
    },
    account: {
      findMany: jest.fn().mockResolvedValue([
        {
          name: PII.accountName,
          currentBalance: 2_000_000,
          isLiquid: true,
          includeInNetWorth: true,
          isEmergencyFund: true,
        },
      ]),
    },
    asset: {
      findMany: jest.fn().mockResolvedValue([
        { name: PII.assetName, currentValue: 100_000_000, includeInNetWorth: true },
      ]),
    },
    debt: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: PII.userId,
          name: PII.debtName,
          debtType: 'prestamo_familiar',
          currentBalance: 3_000_000,
          interestRate: 15,
          rateBasis: 'EA',
          monthlyPayment: 200_000,
          createdAt: now,
          amortization: [{ periodNo: 24, dueDate: new Date('2028-07-01') }],
        },
      ]),
    },
    transaction: {
      findMany: jest.fn().mockResolvedValue([
        {
          amount: 300_000,
          occurredAt: now,
          note: PII.txNote,
          category: { name: PII.categoryName, isGlobal: false, createdAt: now },
        },
      ]),
    },
    // FIN-006: insight con PII deliberada en título/cuerpo/payload string —
    // la vista debe dejar pasar SOLO números.
    insight: {
      findMany: jest.fn().mockResolvedValue([
        {
          type: 'anomalia',
          severity: 'warning',
          title: `Gasto inusual en ${PII.categoryName}`,
          body: `Tu gasto en ${PII.categoryName} se disparó (nota: ${PII.txNote})`,
          payload: { zScore: 2.7, category: PII.categoryName, note: PII.txNote },
          createdAt: now,
        },
      ]),
    },
    financialMemoryFact: {
      findMany: jest.fn().mockResolvedValue([
        {
          kind: 'recurrencia',
          content: 'Gasto recurrente en categoría personalizada #1: ~$800.000 cerca del día 15.',
          tags: ['gasto', 'recurrente', 'categoría personalizada #1'],
        },
      ]),
    },
  } as never;
}

describe('ContextAssembler — minimización (DEC-0005 §10.1)', () => {
  // FIN-023: el contexto toma el desembolso real de la fuente única (stub =
  // suma de cuotas del mock, sin cargos aparte — cifras idénticas a antes).
  const outlayStub = { outlaysByUser: jest.fn().mockResolvedValue({ byDebt: new Map(), totalOutlay: 200_000 }) } as never;
  // FIN-027: fuente única del ingreso neto — stub simple (sin aserciones sobre su valor).
  const netIncomeStub = { compute: jest.fn().mockResolvedValue({ netFixedTotal: 5_000_000, deductions: [], grossFixedTotal: 5_000_000, grossVariableEstimate: 0, netMonthlyEstimate: 5_000_000, selfPaidDeductionsTotal: 0, hasDeductions: false }) } as never;
  const assembler = new ContextAssembler(buildPrisma(), outlayStub, netIncomeStub);

  async function allViewsSerialized(): Promise<string> {
    const [ctx, snapshot, debts, score, memory] = await Promise.all([
      assembler.buildInitialContext(PII.userId, now),
      assembler.buildSnapshotView(PII.userId, now),
      assembler.buildDebtsView(PII.userId),
      assembler.buildScoreView(PII.userId, now),
      assembler.buildMemoryView(PII.userId, now), // 5ª vista (FIN-006)
    ]);
    return JSON.stringify([ctx, snapshot, debts, score, memory]);
  }

  it('ninguna PII sembrada aparece en NINGUNA de las 5 vistas', async () => {
    const serialized = (await allViewsSerialized()).toLowerCase();
    for (const [field, value] of Object.entries(PII)) {
      // Se busca por fragmentos significativos de cada cadena sembrada.
      for (const fragment of value.toLowerCase().split(' ').filter((w) => w.length > 4)) {
        expect(`${field}→${serialized.includes(fragment)}`).toBe(`${field}→false`);
      }
    }
  });

  it('las deudas usan identificador no libre con el tipo (enum)', async () => {
    const view = await assembler.buildDebtsView(PII.userId);
    expect(view.debts[0].ref).toBe('deuda #1 (prestamo_familiar)');
    expect(JSON.stringify(view)).not.toContain('Andrés');
  });

  it('las categorías de usuario se anonimizan ("categoría personalizada #N")', async () => {
    const ctx = await assembler.buildInitialContext(PII.userId, now);
    expect(ctx.categorySpend[0].category).toBe('categoría personalizada #1');
  });

  it('los gastos fijos top se refieren como "gasto fijo #N"', async () => {
    const snap = await assembler.buildSnapshotView(PII.userId, now);
    expect(snap.budget.topFixedExpenses[0].ref).toMatch(/^gasto fijo #\d+$/);
  });

  it('las 4 vistas llevan la marca de minimización (validación runtime)', async () => {
    const ctx = await assembler.buildInitialContext(PII.userId, now);
    const snap = await assembler.buildSnapshotView(PII.userId, now);
    const debts = await assembler.buildDebtsView(PII.userId);
    const score = await assembler.buildScoreView(PII.userId, now);
    for (const v of [ctx, snap, debts, score]) {
      expect((v as { __minimized: string }).__minimized).toBe(MINIMIZED_BRAND);
      expect(() => assertMinimized(v as never)).not.toThrow();
    }
  });

  it('assertMinimized bloquea objetos de dominio crudos', () => {
    expect(() => assertMinimized({ name: PII.debtName } as never)).toThrow(/Bloqueado/);
  });

  it('6ª vista (FIN-007): el mapper de simulación filtra strings fuera del catálogo', () => {
    const fake = {
      type: 'abono_extra',
      before: { score: 700, band: 'estable', dti: 0.1, note: PII.txNote },
      after: { score: 720, band: 'saludable', dti: 0.1 },
      delta: { score: 20, dti: 0, cashflow: -300000, netWorth: 0 },
      specifics: {
        interestSaved: 2_000_000,
        newPayoffDate: '2028-01-01',
        recommended: 'avalanche',
        leakedName: PII.debtName, // string fuera de catálogo → debe filtrarse
      },
    } as unknown as SimulationResult;
    const view = toMinimizedSimulationView(fake);
    const s = JSON.stringify(view);
    expect(s).not.toContain('Andrés');
    expect(s).not.toContain('Restrepo');
    expect(view.specifics.newPayoffDate).toBe('2028-01-01'); // catálogo: fecha ISO
    expect(view.specifics.recommended).toBe('avalanche'); // catálogo: estrategia
    expect(view.before.band).toBe('estable'); // catálogo: banda
    expect(view.specifics.leakedName).toBeUndefined();
    expect(() => assertMinimized(view)).not.toThrow();
  });

  it('vista de memoria (FIN-006): de los insights pasan SOLO números del payload', async () => {
    const view = await assembler.buildMemoryView(PII.userId, now);
    expect(view.insights).toHaveLength(1);
    expect(view.insights[0].numbers).toEqual({ zScore: 2.7 }); // category/note (strings) filtrados
    expect(view.insights[0].type).toBe('anomalia');
    expect(JSON.stringify(view)).not.toContain('Luisa'); // PII del título/payload fuera
    expect(view.facts[0].content).toContain('categoría personalizada #1');
  });
});
