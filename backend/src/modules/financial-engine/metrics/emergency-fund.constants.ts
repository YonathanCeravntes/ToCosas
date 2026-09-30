/**
 * FIN-021 · Hitos oficiales del fondo de emergencia (GOBERNANZA §32, DEC-0021).
 *
 * LA fórmula del concepto es `EmergencyFundMonths` del Motor (core-metrics:
 * fondo marcado / gasto esencial), persistida como MetricReading. Este módulo
 * es la ÚNICA fuente de sus hitos y nombres: la escala Alt C decidida por el
 * CPSAO — "colchón inicial" (3 meses) y "fondo completo" (6 meses) — que ya
 * existía en los logros `fondo_3m`/`fondo_6m` y en los cortes de Salud.
 *
 * Regla DEC-0021 §5.2: cero literales 3/6 sueltos en copys — Recomendaciones,
 * Inicio y el glosario del Copiloto importan de aquí.
 */
export const EMERGENCY_FUND_MILESTONES = {
  colchonInicial: { months: 3, label: 'colchón inicial' },
  fondoCompleto: { months: 6, label: 'fondo completo' },
} as const;

export interface EmergencyFundMilestone {
  months: number;
  label: string;
}

/**
 * El PRÓXIMO hito del usuario según su cobertura actual (DEC-0021 §4.3:
 * "la recomendación apunta siempre al próximo hito, nombrándolo").
 * `null` cuando el fondo ya está completo — no hay nada que recomendar.
 */
export function nextMilestone(months: number): EmergencyFundMilestone | null {
  const { colchonInicial, fondoCompleto } = EMERGENCY_FUND_MILESTONES;
  if (months < colchonInicial.months) return colchonInicial;
  if (months < fondoCompleto.months) return fondoCompleto;
  return null;
}
