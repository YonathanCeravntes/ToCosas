/**
 * Utilidades de semana ISO 8601 (FIN-008). Puras — testeables.
 *
 * Regla de pertenencia semana→mes (DEC-0008 §10.1): una semana ISO pertenece
 * al mes calendario que contiene su JUEVES (misma regla estándar que determina
 * a qué año pertenece una semana). El reto "registro_constante" exige ≥1
 * movimiento en TODAS las semanas ISO del mes (serán 4 o 5 según el mes).
 */

/** Jueves de la semana ISO que contiene la fecha (UTC). */
export function isoThursday(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // ISO: lunes=1…domingo=7. Jueves = día 4 de la semana.
  const isoDay = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (4 - isoDay));
  return d;
}

/** Clave ISO 'YYYY-Www' de la semana que contiene la fecha. */
export function isoWeekKey(date: Date): string {
  const thursday = isoThursday(date);
  const year = thursday.getUTCFullYear();
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((thursday.getTime() - jan1.getTime()) / 86_400_000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Clave de la semana ISO inmediatamente anterior a la de la fecha dada. */
export function previousIsoWeekKey(date: Date): string {
  const d = new Date(date.getTime() - 7 * 86_400_000);
  return isoWeekKey(d);
}

/**
 * Semanas ISO que PERTENECEN a un mes calendario (regla del jueves).
 * `month` en formato 'YYYY-MM'. Devuelve las claves 'YYYY-Www' (4 o 5).
 */
export function isoWeeksOfMonth(month: string): string[] {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const nextMonth = new Date(Date.UTC(y, m, 1));
  const weeks = new Set<string>();
  for (let d = new Date(first); d < nextMonth; d.setUTCDate(d.getUTCDate() + 1)) {
    const thursday = isoThursday(d);
    if (thursday.getUTCMonth() === m - 1 && thursday.getUTCFullYear() === y) {
      weeks.add(isoWeekKey(d));
    }
  }
  return [...weeks].sort();
}
