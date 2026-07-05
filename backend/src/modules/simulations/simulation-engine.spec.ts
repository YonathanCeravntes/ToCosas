import { FinancialState, project, snapshotOf } from './simulation-engine';

/** Estado base: ingreso 5M, gasto 2M, deuda 10M@24%EA cuota ~528k/36m, fondo 6M. */
const base: FinancialState = {
  income: 5_000_000,
  expense: 2_000_000,
  debtPayments: 0,
  fixedIncome: 5_000_000,
  fixedExpense: 1_500_000,
  debts: [
    {
      id: 'd1',
      ref: 'deuda #1 (libre_inversion)',
      type: 'libre_inversion',
      balance: 10_000_000,
      ratePct: 24,
      rateBasis: 'EA',
      monthlyPayment: 528_000,
      remainingMonths: 36,
    },
  ],
  liquidBalance: 6_000_000,
  emergencyBalance: 6_000_000,
  assetsOnly: 0,
  netWorthTrend: null,
};

describe('SimulationEngine (FIN-007) — nunca muta el estado real', () => {
  it('project no modifica el estado de entrada', () => {
    const before = JSON.stringify(base);
    project(base, { type: 'nueva_deuda', amount: 20_000_000, termMonths: 60, ratePct: 18, rateBasis: 'EA' });
    expect(JSON.stringify(base)).toBe(before);
  });
});

describe('escenarios — anclas numéricas', () => {
  it('nueva_deuda: la cuota entra al DTI y castiga el Score', () => {
    const r = project(base, { type: 'nueva_deuda', amount: 20_000_000, termMonths: 60, ratePct: 18, rateBasis: 'EA' });
    const cuota = Number(r.specifics.monthlyPayment);
    expect(cuota).toBeGreaterThan(480_000); // ~497k con 18% EA a 60m
    expect(cuota).toBeLessThan(520_000);
    // ΔDTI = cuota / ingreso_ref (5M)
    expect(r.delta.dti).toBeCloseTo(cuota / 5_000_000, 3);
    expect(r.delta.score).toBeLessThan(0); // más deuda → menos Score
    // Compra crea activo (default): patrimonio no cambia (activo = deuda nueva)
    expect(r.delta.netWorth).toBe(0);
  });

  it('abono_extra: ahorra intereses, no toca el DTI y baja el flujo', () => {
    const r = project(base, { type: 'abono_extra', debtId: 'd1', extraMonthly: 300_000 });
    expect(Number(r.specifics.interestSaved)).toBeGreaterThan(0);
    expect(Number(r.specifics.monthsSaved)).toBeGreaterThan(0);
    expect(r.delta.dti).toBe(0); // cuota mínima intacta
    expect(r.delta.cashflow).toBe(-300_000);
  });

  it('reducir_gastos: sube flujo y Score', () => {
    const r = project(base, { type: 'reducir_gastos', monthlyAmount: 500_000 });
    expect(r.delta.cashflow).toBe(500_000);
    expect(r.after.savingsRate).toBeGreaterThan(r.before.savingsRate);
    expect(r.delta.score).toBeGreaterThanOrEqual(0);
  });

  it('cambio_ingreso: la regla max() aplica al estado hipotético', () => {
    const r = project(base, { type: 'cambio_ingreso', newMonthlyIncome: 8_000_000 });
    expect(r.after.dti).toBeCloseTo(528_000 / 8_000_000, 3);
    expect(r.delta.score).toBeGreaterThan(0);
  });

  it('estrategia_deudas: compara sin alterar métricas', () => {
    const two: FinancialState = {
      ...base,
      debts: [
        ...base.debts,
        { id: 'd2', ref: 'deuda #2 (tarjeta_credito)', type: 'tarjeta_credito', balance: 3_000_000, ratePct: 32, rateBasis: 'EA', monthlyPayment: 180_000, remainingMonths: 24 },
      ],
    };
    const r = project(two, { type: 'estrategia_deudas', extraBudget: 200_000 });
    expect(r.specifics.recommended).toBe('avalanche'); // 32% > 24%
    expect(Number(r.specifics.avalancheInterest)).toBeLessThanOrEqual(Number(r.specifics.snowballInterest));
    expect(r.delta.score).toBe(0); // mismos pagos → mismas métricas
  });

  it('vender_activo aplicado a deuda: baja pasivos y sube liquidez con el remanente', () => {
    const withAsset: FinancialState = { ...base, assetsOnly: 30_000_000 };
    const r = project(withAsset, { type: 'vender_activo', assetValue: 30_000_000, salePrice: 28_000_000, applyToDebtId: 'd1' });
    expect(Number(r.specifics.appliedToDebt)).toBe(10_000_000); // salda la deuda
    // netWorth: −30M activo +28M efectivo → −2M… pero +10M menos pasivo = −2M+...
    // activos: −30M; líquido: +18M; pasivos: −10M → ΔNW = −30+18+10 = −2M (pérdida de la venta)
    expect(r.delta.netWorth).toBe(-2_000_000);
  });

  it('refinanciar a menor tasa/mismo plazo: cuota baja y Score no empeora', () => {
    const r = project(base, { type: 'refinanciar', debtId: 'd1', newRatePct: 14, newRateBasis: 'EA', newTermMonths: 36 });
    expect(Number(r.specifics.newPayment)).toBeLessThan(Number(r.specifics.currentPayment));
    expect(Number(r.specifics.interestDelta)).toBeLessThan(0);
    expect(r.delta.score).toBeGreaterThanOrEqual(0);
  });
});

describe('snapshotOf', () => {
  it('coincide con la aritmética del Motor (dti = cuota/ingreso_ref)', () => {
    const s = snapshotOf(base);
    expect(s.dti).toBeCloseTo(528_000 / 5_000_000, 4);
    expect(s.cashflow).toBe(3_000_000); // 5M − 2M − 0
    expect(s.netWorth).toBe(-4_000_000); // 6M líquido − 10M deuda
  });
});
