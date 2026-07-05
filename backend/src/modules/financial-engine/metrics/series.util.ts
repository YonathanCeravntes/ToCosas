/**
 * Utilidades puras de series (tendencias y anomalías) del Motor. Sin DB.
 */

/**
 * Pendiente de una regresión lineal simple sobre valores equiespaciados
 * (x = 0..n-1). Devuelve unidades de la métrica por mes.
 */
export function linearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, v) => a + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (values[i] - meanY);
    den += (i - meanX) ** 2;
  }
  return den === 0 ? 0 : Math.round((num / den) * 10_000) / 10_000;
}

/**
 * z-score del valor actual frente al historial (media/desviación muestral).
 * Devuelve null si el historial es insuficiente o sin varianza (no evaluable).
 */
export function zScore(history: number[], current: number): number | null {
  if (history.length < 2) return null;
  const mean = history.reduce((a, v) => a + v, 0) / history.length;
  const variance =
    history.reduce((a, v) => a + (v - mean) ** 2, 0) / (history.length - 1);
  const std = Math.sqrt(variance);
  if (std === 0) return null;
  return Math.round(((current - mean) / std) * 10_000) / 10_000;
}

/** Días transcurridos entre dos fechas (UTC, a nivel de día). */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.floor((b - a) / 86_400_000);
}

/** Primer día del mes (UTC) de una fecha. Ancla de las lecturas `month`. */
export function monthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Resta `n` meses al inicio de mes dado. */
export function monthStartMinus(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - n, 1));
}
