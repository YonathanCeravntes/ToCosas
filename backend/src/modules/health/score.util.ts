/**
 * Score Millo v1 (FIN-004 / DEC-0004). Función PURA: métricas → score 0–1000.
 *
 * Pilares v1 (pesos renormalizados del modelo ARQ-0001; los pilares de
 * cumplimiento/estabilidad/hábitos llegan en fases futuras vía `SCORE_VERSION`):
 *   Liquidez 28% · Endeudamiento 28% · Ahorro 25% · Patrimonio 19%.
 *
 * Cambios obligatorios DEC-0004 §10:
 *  #1 norm(tendencia) = clamp(pendiente_3m(trend.net_worth) ÷ max(gasto_esencial, 1), −1, +1)
 *  #2 pilar Ahorro: con UNA sola sub-métrica disponible se usa solo esa (partial);
 *     `unavailable` únicamente si faltan ambas.
 */

export const SCORE_VERSION = 1;

export type PillarKey = 'liquidity' | 'debt' | 'savings' | 'wealth';
export type PillarStatus = 'ok' | 'partial' | 'unavailable';

export const PILLAR_WEIGHTS: Record<PillarKey, number> = {
  liquidity: 0.28,
  debt: 0.28,
  savings: 0.25,
  wealth: 0.19,
};

export interface ScoreInput {
  /** null/undefined = métrica no disponible este mes. */
  liquidityRunway?: number | null;
  dti?: number | null;
  savingsRate?: number | null;
  emergencyFundMonths?: number | null;
  netWorth?: number | null;
  /** Pendiente mensual de trend.net_worth (solo con cold-start superado). */
  netWorthTrend?: number | null;
  /** Gasto esencial mensual (escala de norm(), DEC-0004 §10.1). */
  essentialExpense?: number | null;
}

export interface PillarResult {
  key: PillarKey;
  status: PillarStatus;
  /** 0–100 (solo si status !== 'unavailable'). */
  value: number | null;
  /** Peso nominal y efectivo tras renormalizar por pilares ausentes. */
  weight: number;
  effectiveWeight: number;
  /** Aporte en puntos del score (0–1000). */
  points: number;
}

export interface ScoreResult {
  score: number; // 0–1000
  band: 'critico' | 'fragil' | 'estable' | 'saludable' | 'elite';
  version: number;
  pillars: PillarResult[];
  /** true si algún pilar quedó unavailable/partial (pesos renormalizados). */
  renormalized: boolean;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Interpolación lineal por tramos sobre anclas [x, y] ordenadas por x. */
function piecewise(anchors: Array<[number, number]>, x: number): number {
  if (x <= anchors[0][0]) return anchors[0][1];
  const last = anchors[anchors.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < anchors.length; i++) {
    const [x1, y1] = anchors[i - 1];
    const [x2, y2] = anchors[i];
    if (x <= x2) return y1 + ((x - x1) / (x2 - x1)) * (y2 - y1);
  }
  return last[1];
}

/** Liquidez: runway en meses → 0m=0 · 3m=60 · ≥6m=100. */
export function liquidityPillar(runway: number): number {
  return r1(piecewise([[0, 0], [3, 60], [6, 100]], runway));
}

/** Endeudamiento: DTI (fracción) → 0=100 · 0.20=80 · 0.35=50 · ≥0.60=0. */
export function debtPillar(dti: number): number {
  return r1(piecewise([[0, 100], [0.2, 80], [0.35, 50], [0.6, 0]], dti));
}

/** Sub-puntaje de tasa de ahorro: ≤0=0 · 10%=50 · ≥20%=100. */
export function savingsRateSub(rate: number): number {
  return r1(piecewise([[0, 0], [0.1, 50], [0.2, 100]], rate));
}

/** Sub-puntaje de fondo de emergencia: 0m=0 · 3m=60 · ≥6m=100. */
export function emergencyFundSub(months: number): number {
  return r1(piecewise([[0, 0], [3, 60], [6, 100]], months));
}

/** norm(tendencia) — DEC-0004 §10.1. */
export function normTrend(slope: number, essentialExpense: number): number {
  return clamp(slope / Math.max(essentialExpense, 1), -1, 1);
}

/**
 * Patrimonio: nw>0 → base 70 (+30 si tendencia disponible y ≥0);
 * nw≤0 → max(0, 40 + 40·norm(tendencia)); sin tendencia (cold-start) norm=0.
 */
export function wealthPillar(
  netWorth: number,
  trendSlope: number | null,
  essentialExpense: number,
): number {
  if (netWorth > 0) {
    const bonus = trendSlope !== null && trendSlope >= 0 ? 30 : 0;
    return r1(70 + bonus);
  }
  const norm = trendSlope !== null ? normTrend(trendSlope, essentialExpense) : 0;
  return r1(Math.max(0, 40 + 40 * norm));
}

export function scoreBand(score: number): ScoreResult['band'] {
  if (score < 400) return 'critico';
  if (score < 600) return 'fragil';
  if (score < 750) return 'estable';
  if (score < 900) return 'saludable';
  return 'elite';
}

export function computeScore(input: ScoreInput): ScoreResult {
  const essential = input.essentialExpense ?? 0;

  // --- Pilar Liquidez ---
  const liquidity: { status: PillarStatus; value: number | null } =
    input.liquidityRunway == null
      ? { status: 'unavailable', value: null }
      : { status: 'ok', value: liquidityPillar(input.liquidityRunway) };

  // --- Pilar Endeudamiento ---
  const debt: { status: PillarStatus; value: number | null } =
    input.dti == null
      ? { status: 'unavailable', value: null }
      : { status: 'ok', value: debtPillar(input.dti) };

  // --- Pilar Ahorro (DEC-0004 §10.2: renormalización parcial) ---
  const subs: number[] = [];
  if (input.savingsRate != null) subs.push(savingsRateSub(input.savingsRate));
  if (input.emergencyFundMonths != null) subs.push(emergencyFundSub(input.emergencyFundMonths));
  const savings: { status: PillarStatus; value: number | null } =
    subs.length === 0
      ? { status: 'unavailable', value: null }
      : {
          status: subs.length === 1 ? 'partial' : 'ok',
          value: r1(subs.reduce((a, v) => a + v, 0) / subs.length),
        };

  // --- Pilar Patrimonio ---
  const wealth: { status: PillarStatus; value: number | null } =
    input.netWorth == null
      ? { status: 'unavailable', value: null }
      : {
          status: input.netWorthTrend == null ? 'partial' : 'ok',
          value: wealthPillar(input.netWorth, input.netWorthTrend ?? null, essential),
        };

  const raw: Array<{ key: PillarKey; status: PillarStatus; value: number | null }> = [
    { key: 'liquidity', ...liquidity },
    { key: 'debt', ...debt },
    { key: 'savings', ...savings },
    { key: 'wealth', ...wealth },
  ];

  // Renormalización sobre pilares con valor (explícita en la respuesta).
  const availableWeight = raw
    .filter((p) => p.value !== null)
    .reduce((a, p) => a + PILLAR_WEIGHTS[p.key], 0);

  const pillars: PillarResult[] = raw.map((p) => {
    const weight = PILLAR_WEIGHTS[p.key];
    const effectiveWeight =
      p.value !== null && availableWeight > 0 ? weight / availableWeight : 0;
    const points = p.value !== null ? Math.round(effectiveWeight * p.value * 10) : 0;
    return { key: p.key, status: p.status, value: p.value, weight, effectiveWeight, points };
  });

  const score = clamp(
    Math.round(pillars.reduce((a, p) => a + (p.value !== null ? p.effectiveWeight * p.value : 0), 0) * 10),
    0,
    1000,
  );

  return {
    score,
    band: scoreBand(score),
    version: SCORE_VERSION,
    pillars,
    renormalized: pillars.some((p) => p.status !== 'ok'),
  };
}
