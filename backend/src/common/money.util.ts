/**
 * Utilidades monetarias.
 *
 * El dinero NUNCA debe compararse con igualdad estricta de floats. Estas
 * funciones redondean a 2 decimales (centavos) de forma determinista y ofrecen
 * comparación con tolerancia.
 */

/** Redondea a 2 decimales (centavos) evitando errores de coma flotante. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Tolerancia por defecto para comparar dinero (medio centavo). */
export const MONEY_EPSILON = 0.005;

/** ¿Son iguales dos montos dentro de la tolerancia? */
export function moneyEquals(a: number, b: number, epsilon = MONEY_EPSILON): boolean {
  return Math.abs(a - b) < epsilon;
}

/** Suma una lista de montos redondeando el resultado a centavos. */
export function sumMoney(values: number[]): number {
  return round2(values.reduce((acc, v) => acc + v, 0));
}
