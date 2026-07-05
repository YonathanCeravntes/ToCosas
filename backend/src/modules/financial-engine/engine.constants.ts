/**
 * Constantes del Motor Financiero (FIN-003 / DEC-0003).
 *
 * Cold-start (DEC-0003 §10.2 — dos umbrales que COEXISTEN):
 *  - `COLD_START_DAYS` (global): condición de entrada para activar tendencias y
 *    anomalías en general. Se mide desde la primera transacción del usuario.
 *  - `ANOMALY_CATEGORY_MIN_MONTHS` (por categoría): condición ADICIONAL para la
 *    anomalía de una categoría puntual — se necesitan ambas (≥60 días de
 *    historial global Y ≥3 meses de datos en esa categoría).
 */
export const COLD_START_DAYS = 60;
export const ANOMALY_CATEGORY_MIN_MONTHS = 3;

/** Zona horaria de los jobs nocturnos (DEC-0003 §10.3). */
export const ENGINE_TZ = 'America/Bogota';

/** Usuario "activo" para SnapshotJob (DEC-0003 §10.4): actividad en ≤90 días. */
export const ACTIVE_USER_WINDOW_DAYS = 90;

/** Debounce del listener: una recomputación por usuario por ventana. */
export const DEBOUNCE_MS = 15_000;

/** |z| mínimo para considerar anómalo el gasto mensual de una categoría. */
export const ANOMALY_Z_THRESHOLD = 2;

/** Retención de lecturas diarias (DEC-0002 §4.5). */
export const DAY_READING_RETENTION_DAYS = 180;

/** Contrato de claves de métricas (estable para FIN-004, DEC-0003 §4.2). */
export const MetricKey = {
  Cashflow: 'cashflow',
  SavingsRate: 'savings_rate',
  Dti: 'dti',
  LiquidityRunway: 'liquidity_runway',
  EmergencyFundMonths: 'emergency_fund_months',
  NetWorth: 'net_worth',
  EssentialExpense: 'essential_expense',
  TrendCashflow: 'trend.cashflow',
  TrendSavingsRate: 'trend.savings_rate',
  TrendNetWorth: 'trend.net_worth',
} as const;

export type MetricKey = (typeof MetricKey)[keyof typeof MetricKey];

/** Prefijo de las anomalías por categoría (`anomaly.<categoria>`). Ver DEC-0003 §10.5:
 * el ARQ de FIN-006 deberá migrar estas filas al modelo `Insight`. */
export const ANOMALY_PREFIX = 'anomaly.';
