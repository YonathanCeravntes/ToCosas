/**
 * Lógica pura de disparo de recordatorios (testeable sin DB ni cron).
 */

/** Días entre dos fechas (a nivel de día UTC). Positivo si `due` es futuro. */
export function daysUntil(due: Date, today: Date): number {
  const d0 = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const d1 = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  return Math.round((d1 - d0) / 86400000);
}

/**
 * ¿Debe dispararse hoy este recordatorio? Se dispara cuando faltan exactamente
 * uno de los `offsetsDays` para la fecha de vencimiento (p. ej. 3, 1 o 0 días).
 */
export function shouldFireToday(
  dueDate: Date,
  offsetsDays: number[],
  today: Date,
): boolean {
  const remaining = daysUntil(dueDate, today);
  return offsetsDays.includes(remaining);
}

/** Texto humano del anticipo ("mañana", "hoy", "en 3 días"). */
export function offsetLabel(remainingDays: number): string {
  if (remainingDays === 0) return 'hoy';
  if (remainingDays === 1) return 'mañana';
  return `en ${remainingDays} días`;
}
