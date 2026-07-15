/**
 * Constantes del motor de recomendaciones (FIN-007 / DEC-0007).
 */

/**
 * DEC-0007 §10.1 — Lista CURADA de categorías globales discrecionales (sobre los
 * nombres sembrados en `default-categories.ts`). Las categorías personalizadas
 * del usuario quedan EXCLUIDAS del generador discrecional por defecto (no se
 * adivina discrecionalidad sobre texto libre), hasta evidencia de necesidad —
 * mismo principio del criterio de evidencia de ARQ-0006 §4.6.
 */
export const DISCRETIONARY_GLOBAL_CATEGORIES = ['Entretenimiento', 'Comida', 'Ropa'];

/** Máximo de recomendaciones activas (new/seen) por usuario. */
export const MAX_ACTIVE_RECOMMENDATIONS = 3;

/** Pesos de urgencia según nivel del indicador relacionado. */
export const URGENCY = { rojo: 1.0, amarillo: 0.6, verde: 0.3 } as const;

/** Normalización del impacto: ΔScore de +100 pts ≙ impacto 1.0 (cap). */
export const IMPACT_SCORE_CAP = 100;
