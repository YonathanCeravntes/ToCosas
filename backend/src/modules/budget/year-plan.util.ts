/**
 * FIN-061 Fase 2.5 · Plata del año (funciones puras). Estudio "Gustos, tarjetas y plata
 * del mes", aprobado por el Fundador el 2026-10-04.
 *
 *  - Gastos grandes del año (SOAT, predial, matrículas, regalos de diciembre): se reparten
 *    entre los meses que faltan para que no lleguen de sorpresa.
 *  - Ingreso irregular (honorarios, plataformas): la base es el mes flojo de los últimos 6
 *    (percentil 25), no el promedio.
 *  - Primas y plata única NUNCA entran al margen del mes: se planean 30 días antes con un
 *    reparto (por defecto 60 % deuda cara, 20 % colchón, 20 % libre).
 *  - Colchón por escalones, en meses de lo esencial: 1 mes primero; 3 si es asalariado con
 *    prima; 6 si es independiente, con ingreso variable o el único ingreso de la casa.
 *    Las cesantías no cuentan.
 */

export const WINDFALL_KINDS = ['prima_junio', 'prima_diciembre', 'intereses_cesantias'] as const;
export type WindfallKind = (typeof WINDFALL_KINDS)[number];

export const DEFAULT_WINDFALL_SPLIT = { debtPct: 60, cushionPct: 20, freePct: 20 } as const;
/** Intereses de cesantías: 12 % anual sobre el saldo, se pagan en enero. */
export const CESANTIAS_INTEREST = 0.12;
export const WINDFALL_PLAN_DAYS = 30;

/** Meses que faltan hasta el mes del gasto (este mes cuenta; si ya es el mes, 1). */
export function monthsUntil(month: number, now: Date): number {
  const cur = now.getUTCMonth() + 1;
  const diff = (month - cur + 12) % 12;
  return diff === 0 ? 1 : diff;
}

/** Cuánto apartar este mes para un gasto grande del año. */
export function monthlySetAside(amount: number, month: number, now: Date): number {
  return Math.round(amount / monthsUntil(month, now));
}

/** Percentil 25 (interpolado) — "el mes flojo". */
export function percentile25(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * 0.25;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/**
 * Parte variable estable del ingreso: el mes flojo de los últimos 6 (con ≥ 3 meses de
 * datos), nunca más que lo estimado hoy. Sin historial suficiente, lo estimado.
 */
export function stableVariableIncome(estimated: number, lastMonths: number[]): { amount: number; source: 'mes_flojo' | 'estimado' } {
  const used = lastMonths.slice(-6);
  if (used.length < 3) return { amount: Math.round(estimated), source: 'estimado' };
  return { amount: Math.round(Math.min(estimated, percentile25(used))), source: 'mes_flojo' };
}

/** Próxima fecha de una plata extra (prima de junio el 30, de diciembre el 20; intereses de cesantías el 31 de enero). */
export function nextWindfallDate(kind: WindfallKind, now: Date): Date {
  const y = now.getUTCFullYear();
  const [m, d] = kind === 'prima_junio' ? [5, 30] : kind === 'prima_diciembre' ? [11, 20] : [0, 31];
  const date = new Date(Date.UTC(y, m, d));
  const today = new Date(Date.UTC(y, now.getUTCMonth(), now.getUTCDate()));
  return date < today ? new Date(Date.UTC(y + 1, m, d)) : date;
}

export interface WindfallSplit {
  debtPct: number;
  cushionPct: number;
  freePct: number;
}

export interface WindfallView extends WindfallSplit {
  kind: WindfallKind;
  date: string;
  daysLeft: number;
  /** true si faltan 30 días o menos: es momento de planearla. */
  planNow: boolean;
  /** Estimado (null si la persona no tiene de dónde recibirla). */
  estimated: number | null;
  toDebt: number | null;
  toCushion: number | null;
  free: number | null;
  custom: boolean;
}

export function windfallView(
  kind: WindfallKind,
  estimated: number | null,
  split: WindfallSplit | null,
  now: Date,
): WindfallView {
  const s = split ?? DEFAULT_WINDFALL_SPLIT;
  const date = nextWindfallDate(kind, now);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysLeft = Math.round((date.getTime() - today) / 86_400_000);
  const part = (pct: number) => (estimated != null ? Math.round((estimated * pct) / 100) : null);
  const toDebt = part(s.debtPct);
  const toCushion = part(s.cushionPct);
  return {
    kind,
    date: date.toISOString().slice(0, 10),
    daysLeft,
    planNow: daysLeft <= WINDFALL_PLAN_DAYS,
    estimated: estimated != null ? Math.round(estimated) : null,
    debtPct: s.debtPct,
    cushionPct: s.cushionPct,
    freePct: s.freePct,
    toDebt,
    toCushion,
    // Lo libre se lleva el redondeo: las tres partes siempre suman lo estimado.
    free: estimated != null ? Math.round(estimated) - (toDebt ?? 0) - (toCushion ?? 0) : null,
    custom: split != null,
  };
}

export type IncomeKind = 'asalariado_con_prima' | 'asalariado' | 'variable' | 'independiente';

/** Escalón final del colchón según cómo le llega la plata. */
export function cushionFinalMonths(kind: IncomeKind, onlyIncomeOfHousehold: boolean): number {
  if (kind === 'independiente' || kind === 'variable' || onlyIncomeOfHousehold) return 6;
  return 3;
}

export interface CushionTiers {
  essentialMonthly: number;
  saved: number;
  monthsCovered: number;
  incomeKind: IncomeKind;
  tiers: Array<{ step: number; months: number; target: number; reached: boolean; why: string }>;
  /** Escalón en el que va la persona (el primero sin alcanzar; null si ya llegó al último). */
  current: number | null;
  /** Progreso del escalón actual (0–1). */
  progress: number;
}

export function cushionTiers(input: {
  essentialMonthly: number;
  saved: number;
  incomeKind: IncomeKind;
  onlyIncomeOfHousehold: boolean;
}): CushionTiers {
  const finalMonths = cushionFinalMonths(input.incomeKind, input.onlyIncomeOfHousehold);
  const e = Math.max(0, input.essentialMonthly);
  const steps: Array<{ months: number; why: string }> = [
    { months: 1, why: 'Cubre la mayoría de imprevistos' },
    { months: 3, why: 'Asalariado con prima' },
  ];
  if (finalMonths === 6) steps.push({ months: 6, why: input.onlyIncomeOfHousehold ? 'Único ingreso de la casa' : 'Ingreso independiente o variable' });
  const tiers = steps.map((t, i) => ({
    step: i + 1,
    months: t.months,
    target: Math.round(e * t.months),
    reached: e > 0 && input.saved >= e * t.months,
    why: t.why,
  }));
  const idx = tiers.findIndex((t) => !t.reached);
  const prevTarget = idx > 0 ? tiers[idx - 1].target : 0;
  const progress =
    idx === -1 ? 1 : tiers[idx].target > prevTarget ? Math.max(0, Math.min(1, (input.saved - prevTarget) / (tiers[idx].target - prevTarget))) : 0;
  return {
    essentialMonthly: Math.round(e),
    saved: Math.round(input.saved),
    monthsCovered: e > 0 ? Math.round((input.saved / e) * 10) / 10 : 0,
    incomeKind: input.incomeKind,
    tiers,
    current: idx === -1 ? null : idx + 1,
    progress: Math.round(progress * 1000) / 1000,
  };
}

/** Cómo le llega la plata, a partir de las fuentes de ingreso y el perfil de trabajo. */
export function incomeKindOf(
  sources: Array<{ kind: string; isVariable: boolean; receivesPrima: boolean; amount: number }>,
  workProfile: string | null,
): IncomeKind {
  const total = sources.reduce((a, s) => a + s.amount, 0);
  const variable = sources.filter((s) => s.isVariable || s.kind === 'honorarios' || s.kind === 'comisiones').reduce((a, s) => a + s.amount, 0);
  if (workProfile === 'independiente' || workProfile === 'empresario') return 'independiente';
  if (total > 0 && variable / total >= 0.5) return 'variable';
  if (sources.some((s) => s.receivesPrima)) return 'asalariado_con_prima';
  return 'asalariado';
}
