/**
 * Detección pura de recurrencias (FIN-006 §4.4). Sin DB — testeable.
 *
 * Un patrón es recurrente si aparece en ≥3 meses con montos dentro de ±15% de
 * la mediana y (para gastos con día) el día del mes dentro de ±3 días.
 */

export const RECURRENCE_MIN_MONTHS = 3;
export const AMOUNT_TOLERANCE = 0.15;
export const DAY_TOLERANCE = 3;

export interface MonthlyObservation {
  monthKey: string; // YYYY-MM
  amount: number;
  /** Día del mes representativo (mediana de los días de las tx del mes). */
  dayOfMonth: number;
}

export interface RecurrencePattern {
  months: number;
  medianAmount: number;
  medianDay: number;
  confidence: number; // 0..1
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Evalúa si las observaciones mensuales forman una recurrencia. */
export function detectRecurrence(obs: MonthlyObservation[]): RecurrencePattern | null {
  if (obs.length < RECURRENCE_MIN_MONTHS) return null;

  const medAmount = median(obs.map((o) => o.amount));
  if (medAmount <= 0) return null;
  const amountOk = obs.filter(
    (o) => Math.abs(o.amount - medAmount) / medAmount <= AMOUNT_TOLERANCE,
  );
  if (amountOk.length < RECURRENCE_MIN_MONTHS) return null;

  const medDay = Math.round(median(amountOk.map((o) => o.dayOfMonth)));
  const dayOk = amountOk.filter((o) => {
    // Distancia circular en el mes (día 1 y día 30 están cerca).
    const diff = Math.abs(o.dayOfMonth - medDay);
    return Math.min(diff, 30 - diff) <= DAY_TOLERANCE;
  });
  if (dayOk.length < RECURRENCE_MIN_MONTHS) return null;

  // Confianza: proporción de meses consistentes, acotada [0.5, 0.99].
  const confidence = Math.min(0.99, Math.max(0.5, dayOk.length / obs.length));
  return {
    months: dayOk.length,
    medianAmount: Math.round(medAmount * 100) / 100,
    medianDay: medDay,
    confidence: Math.round(confidence * 1000) / 1000,
  };
}
