/**
 * FIN-016 · Periodo financiero / día de corte (DEC-0011 §4.6).
 *
 * Utilidad PURA. Invariante vinculante (decisión b del fundador, DEC-0011):
 * SOLO la consumen BudgetService y el Dashboard de Inicio. Score, Motor
 * Financiero, Gamificación, Recomendaciones y Memoria siguen en mes calendario
 * y NO deben importar este archivo (verificable por grep en la revisión).
 */

export interface FinancialPeriod {
  /** Inicio del ciclo (00:00:00.000 UTC del día de corte). */
  start: Date;
  /** Fin exclusivo del ciclo (inicio del siguiente). */
  end: Date;
  /** Etiqueta legible, p. ej. "15 jun – 14 jul". */
  label: string;
}

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Rango validado por la BD (CHECK 1–28); se re-valida aquí por robustez. */
export function clampCycleDay(day: number): number {
  if (!Number.isInteger(day) || day < 1) return 1;
  return Math.min(day, 28);
}

/**
 * Calcula el ciclo financiero activo que contiene `now`.
 * Con cycleStartDay=1 el resultado es exactamente el mes calendario UTC
 * (retrocompatibilidad total, criterio de aceptación de ARQ-0011 §13).
 */
export function financialPeriod(now: Date, cycleStartDay: number): FinancialPeriod {
  const day = clampCycleDay(cycleStartDay);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();

  // Si aún no llegó el día de corte de este mes, el ciclo empezó el mes pasado.
  const startMonthOffset = now.getUTCDate() >= day ? 0 : -1;
  const start = new Date(Date.UTC(y, m + startMonthOffset, day));
  const end = new Date(Date.UTC(y, m + startMonthOffset + 1, day));

  return { start, end, label: periodLabel(start, end) };
}

function periodLabel(start: Date, end: Date): string {
  // El fin exclusivo es el día de corte siguiente; el último día visible es end−1.
  const lastDay = new Date(end.getTime() - 24 * 3600 * 1000);
  const fmt = (d: Date) => `${d.getUTCDate()} ${MONTHS_ES[d.getUTCMonth()]}`;
  // Ciclo = mes calendario completo → etiqueta simple "jul 2026".
  if (start.getUTCDate() === 1 && lastDay.getUTCMonth() === start.getUTCMonth()) {
    return `${MONTHS_ES[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
  }
  return `${fmt(start)} – ${fmt(lastDay)}`;
}
