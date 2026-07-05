import { MetricKey } from '../engine.constants';

/**
 * Cálculo puro de las 7 métricas core del mes (FIN-003 §4.3). No toca la DB.
 *
 * Regla de ingreso de referencia (DEC-0003 §10.1):
 *   ingreso_mensual_ref = max(ingresos_fijos_totales, ingresos_reales_del_mes)
 * Evita que un ingreso fijo pequeño opaque un ingreso variable real mayor, sin
 * perder el piso de estabilidad de los fijos en un mes flojo. Aplica a `dti` y
 * `savings_rate` por igual.
 */
export interface CoreMetricsInput {
  /** Transacciones del mes. */
  income: number;
  expense: number;
  debtPayments: number;
  /** Compromisos fijos activos. */
  fixedIncome: number;
  fixedExpense: number;
  /** Suma de cuotas mensuales de deudas activas. */
  debtMonthly: number;
  /** Saldos (cuentas incluidas en patrimonio). */
  liquidBalance: number;
  emergencyBalance: number;
  /** Patrimonio neto (activos + saldos − pasivos). */
  netWorth: number;
}

export interface MetricValue {
  metricKey: string;
  value: number;
}

const r4 = (n: number) => Math.round(n * 10_000) / 10_000;

export function incomeRef(fixedIncome: number, actualIncome: number): number {
  return Math.max(fixedIncome, actualIncome);
}

/**
 * Devuelve las métricas calculables del mes. `liquidity_runway` y
 * `emergency_fund_months` se omiten cuando el gasto esencial es 0 (una división
 * sin sentido produciría series engañosas; se documenta en el endpoint).
 */
export function computeCoreMetrics(input: CoreMetricsInput): MetricValue[] {
  const ref = incomeRef(input.fixedIncome, input.income);
  const cashflow = input.income - input.expense - input.debtPayments;
  const essential = input.fixedExpense + input.debtMonthly;

  const out: MetricValue[] = [
    { metricKey: MetricKey.Cashflow, value: r4(cashflow) },
    { metricKey: MetricKey.SavingsRate, value: ref > 0 ? r4(cashflow / ref) : 0 },
    { metricKey: MetricKey.Dti, value: ref > 0 ? r4(input.debtMonthly / ref) : 0 },
    { metricKey: MetricKey.EssentialExpense, value: r4(essential) },
    { metricKey: MetricKey.NetWorth, value: r4(input.netWorth) },
  ];

  if (essential > 0) {
    out.push(
      { metricKey: MetricKey.LiquidityRunway, value: r4(input.liquidBalance / essential) },
      { metricKey: MetricKey.EmergencyFundMonths, value: r4(input.emergencyBalance / essential) },
    );
  }
  return out;
}
