/**
 * FIN-061 Fase 2 · Línea base de gasto variable (función pura).
 *
 * "Gasto típico" = MEDIANA de los últimos meses completos con datos (máx. 3), no el
 * promedio: un mes con un gasto raro (un viaje, un electrodoméstico) no mueve la
 * base. Los meses sin ningún gasto registrado se ignoran (persona nueva o que dejó
 * de registrar) para no subestimar.
 *
 * Gasto esencial variable: mercado, transporte y salud (lo que no se puede dejar de
 * pagar aunque no sea fijo). Comida fuera de casa, salidas y ropa NO son esenciales.
 * Desde 2.2 la persona puede cambiarlo (SpendClassService); esta lista queda como la
 * sugerencia para las categorías variables.
 */
export const VARIABLE_ESSENTIAL_CATEGORIES = ['Mercado', 'Transporte', 'Salud'];

export interface MonthSpend {
  /** Clave del mes (AAAA-MM). */
  month: string;
  total: number;
  essential: number;
}

export interface SpendingBaseline {
  /** Meses usados (con algún gasto). */
  months: number;
  /** Gasto variable típico del mes (todo lo que no es fijo ni cuota). */
  typicalVariable: number;
  /** Parte esencial del gasto variable típico (mercado, transporte, salud). */
  typicalEssential: number;
  /** Rango: el mes más bajo y el más alto de los usados (muestra la incertidumbre). */
  lowVariable: number;
  highVariable: number;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function spendingBaseline(months: MonthSpend[]): SpendingBaseline | null {
  const used = months.filter((m) => m.total > 0).slice(-3);
  if (used.length === 0) return null;
  const r = (n: number) => Math.round(n);
  return {
    months: used.length,
    typicalVariable: r(median(used.map((m) => m.total))),
    typicalEssential: r(median(used.map((m) => m.essential))),
    lowVariable: r(Math.min(...used.map((m) => m.total))),
    highVariable: r(Math.max(...used.map((m) => m.total))),
  };
}
