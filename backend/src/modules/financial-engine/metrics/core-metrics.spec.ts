import { computeCoreMetrics, incomeRef } from './core-metrics';
import { MetricKey } from '../engine.constants';

const base = {
  income: 0,
  expense: 0,
  debtPayments: 0,
  fixedIncome: 0,
  fixedExpense: 0,
  debtMonthly: 0,
  liquidBalance: 0,
  emergencyBalance: 0,
  netWorth: 0,
};

const get = (out: ReturnType<typeof computeCoreMetrics>, key: string) =>
  out.find((m) => m.metricKey === key)?.value;

describe('incomeRef (DEC-0003 §10.1)', () => {
  it('usa el mayor entre ingresos fijos e ingresos reales', () => {
    expect(incomeRef(4_500_000, 1_000_000)).toBe(4_500_000); // piso de estabilidad
    expect(incomeRef(300_000, 5_000_000)).toBe(5_000_000); // fijo pequeño NO opaca al real
    expect(incomeRef(0, 2_000_000)).toBe(2_000_000);
    expect(incomeRef(2_000_000, 0)).toBe(2_000_000);
  });
});

describe('computeCoreMetrics', () => {
  it('cashflow = ingresos − gastos − pagos de deuda', () => {
    const out = computeCoreMetrics({
      ...base,
      income: 4_000_000,
      expense: 1_500_000,
      debtPayments: 500_000,
    });
    expect(get(out, MetricKey.Cashflow)).toBe(2_000_000);
  });

  it('dti y savings_rate usan max(fijo, real) — caso del hallazgo AUD-0003', () => {
    // Ingreso fijo pequeño (arriendo 300k) + real grande (freelance 5M):
    const out = computeCoreMetrics({
      ...base,
      income: 5_000_000,
      fixedIncome: 300_000,
      debtMonthly: 1_000_000,
    });
    // Con la regla vieja (solo fijo): dti = 1M/300k = 3.33 (absurdo).
    expect(get(out, MetricKey.Dti)).toBe(0.2); // 1M / 5M
    expect(get(out, MetricKey.SavingsRate)).toBe(1); // cashflow 5M / ref 5M
  });

  it('mes flojo: los ingresos fijos actúan como piso', () => {
    const out = computeCoreMetrics({
      ...base,
      income: 1_000_000, // mes real flojo
      fixedIncome: 4_000_000,
      debtMonthly: 1_000_000,
    });
    expect(get(out, MetricKey.Dti)).toBe(0.25); // 1M / 4M (ref = fijo)
  });

  it('sin ingreso de referencia, dti y savings_rate son 0 (no división por cero)', () => {
    const out = computeCoreMetrics({ ...base, debtMonthly: 500_000 });
    expect(get(out, MetricKey.Dti)).toBe(0);
    expect(get(out, MetricKey.SavingsRate)).toBe(0);
  });

  it('runway y fondo de emergencia = saldos ÷ gasto esencial', () => {
    const out = computeCoreMetrics({
      ...base,
      fixedExpense: 1_500_000,
      debtMonthly: 500_000, // esencial = 2M
      liquidBalance: 6_000_000,
      emergencyBalance: 4_000_000,
    });
    expect(get(out, MetricKey.EssentialExpense)).toBe(2_000_000);
    expect(get(out, MetricKey.LiquidityRunway)).toBe(3);
    expect(get(out, MetricKey.EmergencyFundMonths)).toBe(2);
  });

  it('omite runway/fondo cuando el gasto esencial es 0', () => {
    const out = computeCoreMetrics({ ...base, liquidBalance: 1_000_000 });
    expect(get(out, MetricKey.LiquidityRunway)).toBeUndefined();
    expect(get(out, MetricKey.EmergencyFundMonths)).toBeUndefined();
  });

  it('net_worth pasa tal cual (viene de computeNetWorth)', () => {
    const out = computeCoreMetrics({ ...base, netWorth: 171_500_000 });
    expect(get(out, MetricKey.NetWorth)).toBe(171_500_000);
  });
});
