/**
 * FIN-047 · Gastos fijos automáticos (decisión del Fundador, 2026-09-29):
 *  1. Un gasto fijo se REGISTRA SOLO el día que toca (movimiento "automático").
 *  2. Si alguien igual lo registra a mano, se CRUZA con el fijo: no se cuenta doble.
 * Funciones puras; los servicios ponen la BD.
 */

const DAY_MS = 86_400_000;

/** Minúsculas, sin tildes ni signos: "Arriendo Apto." → "arriendo apto". */
export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fecha del fijo dentro del ciclo [start, end): el día declarado (tope 28, igual que
 * "Te queda"), en el mes de inicio o el siguiente. Sin día declarado: el inicio del ciclo.
 */
export function occurrenceInCycle(dayOfMonth: number | null, period: { start: Date; end: Date }): Date {
  if (!dayOfMonth) return period.start;
  const d = Math.min(dayOfMonth, 28);
  let date = new Date(Date.UTC(period.start.getUTCFullYear(), period.start.getUTCMonth(), d));
  if (date < period.start) date = new Date(Date.UTC(period.start.getUTCFullYear(), period.start.getUTCMonth() + 1, d));
  if (date >= period.end) date = new Date(period.end.getTime() - DAY_MS);
  return date;
}

export interface FixedLike {
  id: string;
  name: string;
  amount: number;
}

/**
 * ¿Este gasto registrado a mano ES un fijo? El nombre del fijo (≥ 3 letras) aparece en
 * la nota o en la categoría, y el monto está entre la mitad y 1,5 veces el del fijo.
 * Si varios coinciden, gana el de monto más cercano.
 */
export function matchFixed<T extends FixedLike>(items: T[], text: string, amount: number): T | null {
  const hay = ` ${normalizeName(text)} `;
  const candidates = items.filter((f) => {
    const n = normalizeName(f.name);
    if (n.length < 3) return false;
    if (!hay.includes(` ${n} `) && !hay.includes(` ${n}`)) return false;
    return amount >= f.amount * 0.5 && amount <= f.amount * 1.5;
  });
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => Math.abs(a.amount - amount) - Math.abs(b.amount - amount))[0];
}
