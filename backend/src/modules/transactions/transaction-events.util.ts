/**
 * FIN-028 (DEC-0028 P5) · Evento rico de cambio de movimiento — forma lista para
 * auditoría (DEC-028-004) e IA futura (DEC-028-008) SIN rediseñar la BD: el
 * historial se reconstruye del log de eventos. Solo campos ESTRUCTURADOS; `note`
 * y `rawMessage` NUNCA viajan (minimización pre-IA, regla FIN-005).
 */
const AUDITED_FIELDS = ['kind', 'amount', 'occurredAt', 'categoryId', 'entityId', 'debtId', 'tags'] as const;

type Auditable = Record<string, unknown>;

const norm = (k: string, v: unknown): unknown => {
  if (v === undefined || v === null) return null;
  if (k === 'amount') return Number(v);
  if (k === 'occurredAt') return v instanceof Date ? v.toISOString() : String(v);
  if (k === 'tags') return Array.isArray(v) ? [...v].sort() : v;
  return v;
};

const eq = (a: unknown, b: unknown): boolean =>
  Array.isArray(a) && Array.isArray(b)
    ? a.length === b.length && a.every((x, i) => x === b[i])
    : a === b;

/**
 * Diferencia estructural entre el movimiento anterior y el propuesto.
 * `before`/`after` solo incluyen los campos que REALMENTE cambiaron.
 */
export function diffTransaction(prev: Auditable, next: Auditable): {
  changedFields: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
} {
  const changedFields: string[] = [];
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  for (const f of AUDITED_FIELDS) {
    if (!(f in next)) continue; // no se intentó tocar
    const a = norm(f, prev[f]);
    const b = norm(f, next[f]);
    if (!eq(a, b)) {
      changedFields.push(f);
      before[f] = a;
      after[f] = b;
    }
  }
  return { changedFields, before, after };
}

/** Campos de un pago de deuda que NO se editan en sitio (guardarraíl P6):
 *  cambiarlos dejaría el saldo de la deuda mentiroso → anular y recrear. */
export const DEBT_LOCKED_FIELDS = ['amount', 'occurredAt', 'kind', 'debtId'] as const;
