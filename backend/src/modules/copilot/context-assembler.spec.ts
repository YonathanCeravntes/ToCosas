import { ContextAssembler } from './context-assembler';
import { assertMinimized, MINIMIZED_BRAND } from './minimized-views';

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
  } as never;
}

describe('ContextAssembler — minimización (DEC-0005 §10.1)', () => {
  const assembler = new ContextAssembler(buildPrisma());

  async function allViewsSerialized(): Promise<string> {
    const [ctx, snapshot, debts, score] = await Promise.all([
      assembler.buildInitialContext(PII.userId, now),
      assembler.buildSnapshotView(PII.userId, now),
      assembler.buildDebtsView(PII.userId),
      assembler.buildScoreView(PII.userId, now),
    ]);
    return JSON.stringify([ctx, snapshot, debts, score]);
  }

  it('ninguna PII sembrada aparece en NINGUNA de las 4 vistas', async () => {
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
});
