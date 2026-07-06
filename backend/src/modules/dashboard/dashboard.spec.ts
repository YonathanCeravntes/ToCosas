import { DashboardService } from './dashboard.service';
import { computeNetWorth } from '../accounts/networth.util';

/**
 * FIN-014 · Test de consistencia (ARQ-0011 §13): las secciones del home
 * coinciden con las fuentes ya auditadas (networth.util, sumas de FixedItem
 * y transacciones del ciclo). El agregador no inventa lógica financiera.
 */
describe('DashboardService.home (FIN-014, DEC-0011 §4.3)', () => {
  const accounts = [
    { id: 'a1', name: 'Ahorros', type: 'ahorros', currentBalance: 2_000_000, isLiquid: true, includeInNetWorth: true, isEmergencyFund: false },
    { id: 'a2', name: 'Emergencias', type: 'corriente', currentBalance: 1_500_000, isLiquid: true, includeInNetWorth: true, isEmergencyFund: true },
    { id: 'a3', name: 'Bolsillo', type: 'billetera', currentBalance: 300_000, isLiquid: true, includeInNetWorth: true, isEmergencyFund: false },
  ];
  const assets = [{ currentValue: 50_000_000, includeInNetWorth: true }];
  const debts = [{ currentBalance: 20_000_000 }];
  const fixedItems = [
    { kind: 'ingreso', amount: 4_000_000 },
    { kind: 'gasto', amount: 1_200_000 },
    { kind: 'gasto', amount: 300_000 },
  ];
  const cat = (name: string) => ({ name, icon: '📦', color: '#ccc' });
  const periodTxs = [
    { kind: 'ingreso', amount: 500_000, categoryId: 'c1', category: cat('Freelance') },
    { kind: 'gasto', amount: 200_000, categoryId: 'c2', category: cat('Comida') },
    { kind: 'gasto', amount: 100_000, categoryId: 'c2', category: cat('Comida') },
    { kind: 'pago_deuda', amount: 450_000, categoryId: null, category: null },
  ];

  const prisma = {
    userSettings: { findUnique: jest.fn().mockResolvedValue({ cycleStartDay: 1 }) },
    account: { findMany: jest.fn().mockResolvedValue(accounts) },
    asset: { findMany: jest.fn().mockResolvedValue(assets) },
    debt: { findMany: jest.fn().mockResolvedValue(debts) },
    fixedItem: { findMany: jest.fn().mockResolvedValue(fixedItems) },
    transaction: {
      findMany: jest
        .fn()
        .mockResolvedValueOnce(periodTxs)
        .mockResolvedValueOnce([
          { id: 't1', kind: 'gasto', amount: 200_000, occurredAt: new Date(), note: null, categoryId: 'c2', category: cat('Comida'), debt: null },
        ]),
    },
  } as never;

  it('compone patrimonio, ahorro, fijo+variable y flujo de forma consistente con las fuentes', async () => {
    const svc = new DashboardService(prisma);
    const home = await svc.home('u1');

    // Patrimonio idéntico al util auditado de FIN-002 (misma entrada, misma salida).
    const expectedNW = computeNetWorth(
      accounts.map((a) => ({ ...a })),
      assets,
      20_000_000,
    );
    expect(home.netWorth).toEqual(expectedNW);

    // Ahorro total = cuentas 'ahorros' + fondo de emergencia (sin doble conteo).
    expect(home.savings.total).toBe(3_500_000);
    expect(home.savings.emergencyFund).toBe(1_500_000);

    // Ingresos y gastos diferencian fijo (declarado) de variable (del ciclo).
    expect(home.income).toMatchObject({ fixed: 4_000_000, variable: 500_000, total: 4_500_000 });
    expect(home.expense).toMatchObject({ fixed: 1_500_000, variable: 300_000, total: 1_800_000 });
    expect(home.expense.byCategory[0]).toMatchObject({ name: 'Comida', amount: 300_000, percent: 100 });
    expect(home.income.byCategory[0]).toMatchObject({ name: 'Freelance', amount: 500_000 });

    // Flujo estimado = ingresos totales − gastos totales − pagos de deuda.
    expect(home.debtPayments).toBe(450_000);
    expect(home.estimatedCashflow).toBe(4_500_000 - 1_800_000 - 450_000);

    // Movimientos recientes completos (con categoría).
    expect(home.recentTransactions).toHaveLength(1);
    expect(home.recentTransactions[0].category?.name).toBe('Comida');

    // Con cycleStartDay=1 la etiqueta es el mes calendario (FIN-016 integrado).
    expect(home.period.cycleStartDay).toBe(1);
  });
});
