/**
 * FIN-056 (boceto 5) · Tasas: la gente conoce su tasa MENSUAL ("1,8 % mensual"); el
 * servidor y los extractos hablan en EFECTIVA ANUAL (EA). Conversión estándar, una sola vez.
 */
export type RateUnit = 'mensual' | 'anual';

export function monthlyToEA(monthlyPct: number): number {
  return (Math.pow(1 + monthlyPct / 100, 12) - 1) * 100;
}

export function eaToMonthly(eaPct: number): number {
  return (Math.pow(1 + eaPct / 100, 1 / 12) - 1) * 100;
}

/** "1,8 % mensual = 23,9 % anual (EA)" (o al revés). NaN → ''. */
export function rateHint(value: number, unit: RateUnit): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  const f = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
  return unit === 'mensual'
    ? `${f(value)} % mensual = ${f(monthlyToEA(value))} % anual (EA)`
    : `${f(value)} % anual (EA) = ${f(eaToMonthly(value))} % mensual`;
}

/** Lo que se manda al servidor: siempre EA. */
export function toEA(value: number, unit: RateUnit): number {
  return unit === 'mensual' ? Math.round(monthlyToEA(value) * 100) / 100 : value;
}
