/**
 * Vistas minimizadas (FIN-005 §4.3-A — DEC-0005 §10.1).
 *
 * Estas son las ÚNICAS estructuras que pueden cruzar hacia el LLM. Llevan una
 * marca (`__minimized`) que el ejecutor de tools valida en runtime: no existe
 * camino de código por el que un objeto de dominio crudo llegue al proveedor.
 *
 * Regla de oro (GOBERNANZA: "Vistas minimizadas obligatorias para toda tool de
 * LLM"): cualquier tool futura debe definir aquí su vista y quedar cubierta por
 * el test de regresión de minimización.
 */

export const MINIMIZED_BRAND = 'millo.minimized.v1' as const;

interface Branded {
  __minimized: typeof MINIMIZED_BRAND;
}

/** Contexto inicial del turno (grupos de §4.3). */
export interface MinimizedContext extends Branded {
  period: string; // YYYY-MM
  score: {
    value: number | null;
    band: string | null;
    pillars: Array<{ key: string; value: number | null; status: string }>;
  };
  metrics: Array<{ key: string; value: number }>;
  debts: MinimizedDebt[];
  budget: {
    fixedIncomeTotal: number;
    fixedExpenseTotal: number;
    topFixedExpenses: Array<{ ref: string; amount: number }>; // "gasto fijo #N"
    available: number;
  };
  netWorth: {
    totalAssets: number;
    totalLiquid: number;
    emergencyFund: number;
    totalLiabilities: number;
    net: number;
  };
  categorySpend: Array<{ category: string; amount: number }>; // curadas o "categoría personalizada #N"
  /** Resumen de memoria (FIN-006 §4.7): top insights + hechos, acotado. */
  memory: {
    insights: Array<{ type: string; severity: string }>;
    facts: string[]; // contents templados
  };
}

/** Deuda minimizada: identificador NO libre + datos numéricos (§4.3). */
export interface MinimizedDebt {
  ref: string; // "deuda #N (tipo)" — N estable por orden de creación
  type: string; // enum DebtType
  balance: number;
  ratePct: number;
  rateBasis: string;
  monthlyPayment: number;
  projectedPayoffDate: string | null;
}

export interface MinimizedSnapshotView extends Branded {
  kind: 'financial_snapshot';
  period: string;
  metrics: Array<{ key: string; value: number }>;
  netWorth: MinimizedContext['netWorth'];
  budget: MinimizedContext['budget'];
}

export interface MinimizedDebtsView extends Branded {
  kind: 'debts';
  debts: MinimizedDebt[];
}

export interface MinimizedScoreView extends Branded {
  kind: 'score_breakdown';
  score: MinimizedContext['score'];
  deltaByPillar: Array<{ pillar: string; delta: number }>;
}

/**
 * Memoria e insights (FIN-006 §4.7). Los `content` de los hechos son SIEMPRE
 * plantillas del Motor (nunca texto libre). De los insights solo cruzan tipo,
 * severidad, antigüedad y los valores NUMÉRICOS del payload — nunca título,
 * cuerpo ni strings del payload (podrían contener nombres de categorías de
 * usuario).
 */
export interface MinimizedMemoryView extends Branded {
  kind: 'memory_and_insights';
  facts: Array<{ kind: string; content: string; tags: string[] }>;
  insights: Array<{
    type: string;
    severity: string;
    ageDays: number;
    numbers: Record<string, number>;
  }>;
}

/**
 * Resultado de simulación (FIN-007 §4.4). Solo números y enums cruzan; los
 * `specifics` se filtran a valores numéricos + strings de un catálogo cerrado
 * (fechas ISO y nombres de estrategia), nunca texto libre.
 */
export interface MinimizedSimulationView extends Branded {
  kind: 'simulation_result';
  simulationType: string;
  before: Record<string, number | string | null>;
  after: Record<string, number | string | null>;
  delta: Record<string, number>;
  specifics: Record<string, number | string | null>;
}

export type MinimizedToolView =
  | MinimizedSnapshotView
  | MinimizedDebtsView
  | MinimizedScoreView
  | MinimizedMemoryView
  | MinimizedSimulationView;

/** Validación en runtime (DEC-0005 §10.1): rechaza todo lo no marcado. */
export function assertMinimized<T extends Branded>(value: T): T {
  if (!value || (value as Branded).__minimized !== MINIMIZED_BRAND) {
    throw new Error(
      'Bloqueado: se intentó enviar al LLM una estructura que no es una vista minimizada.',
    );
  }
  return value;
}

export function brand<T extends object>(value: T): T & Branded {
  return { ...value, __minimized: MINIMIZED_BRAND };
}
