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
    // FIN-021: la cobertura del fondo llega como lectura persistida del Motor
    // (la MISMA que consume Salud) — el dashboard no la calcula.
    metricReading: {
      findFirst: jest.fn().mockResolvedValue({ metricKey: 'emergency_fund_months', value: 4.2 }),
    },
  } as never;

  // FIN-020: SpendableService se stubbea COHERENTE con el escenario bajo Alt A —
  // ingresos reales 500k (el fijo de 4M aún no se recibe), salidas reales 750k,
  // fijos de gasto comprometidos 1.5M ⇒ teQueda = −1.75M. El cálculo en sí se
  // prueba en spendable.service.spec.ts; aquí se prueba el CONSUMO (§32).
  const teQuedaStub = {
    amount: -1_750_000,
    perDay: null,
    daysLeft: 20,
    until: '2026-07-31T00:00:00.000Z',
    protectedTotal: 1_500_000,
    pendingCommitments: [],
    receivedIncome: 500_000,
  };
  const spendable = { compute: jest.fn().mockResolvedValue(teQuedaStub) } as never;
  // FIN-027: el ingreso fijo del home ahora viene de la fuente única del
  // ingreso neto (4M, coherente con el FixedItem-ingreso legado del mock).
  const netIncome = {
    compute: jest.fn().mockResolvedValue({
      netFixedTotal: 4_000_000,
      grossFixedTotal: 4_000_000,
      grossVariableEstimate: 0,
      deductions: [],
      netMonthlyEstimate: 4_000_000,
      selfPaidDeductionsTotal: 0,
      hasDeductions: false,
    }),
  } as never;

  it('compone patrimonio, ahorro, fijo+variable y flujo de forma consistente con las fuentes', async () => {
    const svc = new DashboardService(prisma, spendable, netIncome);
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

    // FIN-020 (§32): el "Te queda" del home ES el del SpendableService, sin
    // recalcular — y la interpretación de flujo se deriva de ÉL, no del
    // estimatedCashflow estructural. Bajo Alt A este escenario es ROJO
    // (−1.75M) aunque la proyección estructural diera verde: no mentimos
    // hacia arriba. Texto §4.1-ter: el rojo no culpa (hay compromisos aún
    // no vencidos dentro del monto).
    expect(home.teQueda).toBe(teQuedaStub);
    expect(home.interpretation.cashflow).toEqual({
      level: 'rojo',
      text: 'Lo que viene comprometido supera lo que te queda — mira qué puedes mover',
    });
    // FIN-021: la línea de ahorro narra la lectura OFICIAL del Motor (4,2 meses)
    // con los hitos únicos — entre colchón (3) y fondo completo (6) → amarillo.
    expect(home.interpretation.savings).toEqual({
      level: 'amarillo',
      text: 'Ya tienes tu colchón inicial (~4.2 meses de lo esencial) — vas hacia el fondo completo de 6',
    });
    // deuda (ruta a): pagado 450k / ingreso 4.5M = 10% < corte verde 20% (FIN-004).
    expect(home.interpretation.debt).toEqual({
      level: 'verde',
      text: 'De cada $100 que te entraron, $10 se fueron en cuotas — vas bien',
    });
  });

  it('interpretación: se OMITE si falta el dato (nunca un texto que genere una pregunta)', async () => {
    const empty = {
      userSettings: { findUnique: jest.fn().mockResolvedValue(null) },
      account: { findMany: jest.fn().mockResolvedValue([]) },
      asset: { findMany: jest.fn().mockResolvedValue([]) },
      debt: { findMany: jest.fn().mockResolvedValue([]) },
      fixedItem: { findMany: jest.fn().mockResolvedValue([]) },
      transaction: { findMany: jest.fn().mockResolvedValue([]) },
      metricReading: { findFirst: jest.fn().mockResolvedValue(null) },
    } as never;
    const emptySpendable = {
      compute: jest.fn().mockResolvedValue({
        amount: 0,
        perDay: null,
        daysLeft: 20,
        until: '2026-07-31T00:00:00.000Z',
        protectedTotal: 0,
        pendingCommitments: [],
        receivedIncome: 0,
      }),
    } as never;
    const emptyIncome = {
      compute: jest.fn().mockResolvedValue({
        netFixedTotal: 0,
        grossFixedTotal: 0,
        grossVariableEstimate: 0,
        deductions: [],
        netMonthlyEstimate: 0,
        selfPaidDeductionsTotal: 0,
        hasDeductions: false,
      }),
    } as never;
    const home = await new DashboardService(empty, emptySpendable, emptyIncome).home('u2');
    expect(home.interpretation.cashflow).toBeNull(); // sin ingreso recibido → sin línea
    expect(home.interpretation.savings).toBeNull(); // sin lectura del Motor → sin línea
    expect(home.interpretation.debt).toBeNull(); // sin pagos en el ciclo → sin línea
  });
});
