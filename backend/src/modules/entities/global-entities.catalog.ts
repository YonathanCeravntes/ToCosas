/**
 * FIN-034 (DEC-0034) · Catálogo GLOBAL de entidades (config-sin-código).
 *
 * Lista declarada de las entidades financieras más comunes en Colombia, sembrada
 * como `isGlobal:true` para RECONOCIMIENTO, nunca recomendación (Independencia,
 * DEC-0033 §4.5): el orden de búsqueda no las rankea como "mejores" y `typicalRate`
 * es solo una PISTA de prellenado, editable y jamás autoridad §32.
 *
 * Agregar una entidad = **una fila aquí** (test de config-sin-código): la siembra
 * idempotente la publica y la búsqueda la encuentra, sin tocar la UI.
 */
export interface GlobalEntitySeed {
  name: string;
  type: 'banco' | 'cooperativa' | 'fintech' | 'prestamista_particular' | 'tarjeta' | 'otro';
  /** Pista de tasa típica (% EA) para prellenar el alta — editable, no autoridad. */
  typicalRate?: number;
  rateType?: string;
}

export const GLOBAL_ENTITIES: GlobalEntitySeed[] = [
  // Bancos (varios productos → el tipo se elige tras la entidad).
  { name: 'Bancolombia', type: 'banco', typicalRate: 28, rateType: 'EA' },
  { name: 'Davivienda', type: 'banco', typicalRate: 28, rateType: 'EA' },
  { name: 'BBVA Colombia', type: 'banco', typicalRate: 27, rateType: 'EA' },
  { name: 'Banco de Bogotá', type: 'banco', typicalRate: 28, rateType: 'EA' },
  { name: 'Banco de Occidente', type: 'banco', typicalRate: 28, rateType: 'EA' },
  { name: 'Scotiabank Colpatria', type: 'banco', typicalRate: 29, rateType: 'EA' },
  { name: 'Banco Popular', type: 'banco', typicalRate: 28, rateType: 'EA' },
  { name: 'Banco Caja Social', type: 'banco', typicalRate: 28, rateType: 'EA' },
  { name: 'Banco AV Villas', type: 'banco', typicalRate: 28, rateType: 'EA' },
  // Neobancos / fintech (rotativo, cupo).
  { name: 'Nu (Nubank)', type: 'fintech', typicalRate: 32, rateType: 'EA' },
  { name: 'RappiCard', type: 'fintech', typicalRate: 33, rateType: 'EA' },
  { name: 'Nequi', type: 'fintech', typicalRate: 30, rateType: 'EA' },
  { name: 'Daviplata', type: 'fintech', typicalRate: 30, rateType: 'EA' },
  { name: 'Lulo Bank', type: 'fintech', typicalRate: 30, rateType: 'EA' },
  { name: 'Ualá', type: 'fintech', typicalRate: 32, rateType: 'EA' },
  { name: 'Movii', type: 'fintech', typicalRate: 32, rateType: 'EA' },
  // Compra a cuotas / financiadoras de consumo.
  { name: 'Addi', type: 'otro', typicalRate: 25, rateType: 'EA' },
  { name: 'Sistecrédito', type: 'otro', typicalRate: 22, rateType: 'EA' },
  { name: 'Brilla (Gases)', type: 'otro', typicalRate: 18, rateType: 'EA' },
  // Cooperativas.
  { name: 'Coopcentral', type: 'cooperativa', typicalRate: 24, rateType: 'EA' },
  { name: 'Cooperativa (otra)', type: 'cooperativa', typicalRate: 24, rateType: 'EA' },
  // Informal — genérico, sin tasa "típica" (la pactada la pone el usuario).
  { name: 'Prestamista particular / gota a gota', type: 'prestamista_particular' },
];

/**
 * Mapa entidad→tipo de deuda: una PISTA de prellenado para el selector, editable,
 * NUNCA una imposición (Independencia — condición de cierre DEC-0034 §3.3). Un
 * banco/cooperativa ofrece varios productos → sin default único (el usuario elige).
 */
export const ENTITY_TYPE_TO_DEBT_TYPE: Record<string, string | null> = {
  tarjeta: 'tarjeta_credito',
  fintech: 'fintech',
  prestamista_particular: 'gota_a_gota',
  banco: null,
  cooperativa: null,
  otro: null,
};

/** El tipo de deuda sugerido para una entidad (o null si no hay uno claro). */
export function suggestedDebtType(entityType: string): string | null {
  return ENTITY_TYPE_TO_DEBT_TYPE[entityType] ?? null;
}
