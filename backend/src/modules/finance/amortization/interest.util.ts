import { RateBasis } from './amortization.types';

/**
 * Conversión de tasas de interés a una **tasa efectiva mensual** (fracción).
 *
 * Convenciones (mercado colombiano):
 *  - EA   (Efectiva Anual):        i_m = (1 + EA)^(1/12) - 1
 *  - MV   (Efectiva Mensual):      i_m = tasa                (ya es mensual)
 *  - NMV  (Nominal Anual Mes Ven.):i_m = tasa_anual / 12     (capitalización mensual)
 *  - NAMV: alias de NMV
 *
 * @param ratePercent valor de la tasa en PORCENTAJE (p. ej. 12.5 para 12.5%)
 * @param basis base sobre la que viene la tasa
 * @returns tasa efectiva mensual como fracción (p. ej. 0.01 = 1%)
 */
export function toMonthlyEffectiveRate(ratePercent: number, basis: RateBasis): number {
  if (ratePercent < 0) {
    throw new Error('La tasa de interés no puede ser negativa');
  }
  const r = ratePercent / 100;
  switch (basis) {
    case 'EA':
      return Math.pow(1 + r, 1 / 12) - 1;
    case 'MV':
      return r;
    case 'NMV':
    case 'NAMV':
      return r / 12;
    default: {
      const _exhaustive: never = basis;
      throw new Error(`Base de tasa no soportada: ${_exhaustive as string}`);
    }
  }
}

/**
 * Convierte una tasa efectiva mensual (fracción) a Efectiva Anual (fracción).
 * Útil para comparar deudas con distinta base (estrategia avalanche).
 */
export function monthlyToEffectiveAnnual(monthlyRate: number): number {
  return Math.pow(1 + monthlyRate, 12) - 1;
}

/**
 * Normaliza cualquier tasa a Efectiva Anual (fracción), para poder ordenar
 * deudas por costo real independientemente de su base.
 */
export function toEffectiveAnnualRate(ratePercent: number, basis: RateBasis): number {
  return monthlyToEffectiveAnnual(toMonthlyEffectiveRate(ratePercent, basis));
}
