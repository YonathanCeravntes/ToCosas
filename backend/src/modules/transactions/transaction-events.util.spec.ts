import { DEBT_LOCKED_FIELDS, diffTransaction } from './transaction-events.util';

/** FIN-028 (DEC-0028 P5) · El evento de cambio lleva solo lo que cambió, sin texto libre. */
describe('diffTransaction (FIN-028)', () => {
  const base = {
    kind: 'gasto',
    amount: 180_000,
    occurredAt: new Date('2026-07-05T00:00:00.000Z'),
    categoryId: 'c1',
    entityId: null,
    debtId: null,
    tags: ['mercado'],
    note: 'texto libre que NO debe viajar',
  };

  it('detecta solo los campos realmente modificados', () => {
    const d = diffTransaction(base, { amount: 165_000 });
    expect(d.changedFields).toEqual(['amount']);
    expect(d.before).toEqual({ amount: 180_000 });
    expect(d.after).toEqual({ amount: 165_000 });
  });

  it('un valor igual (aunque venga en el dto) NO cuenta como cambio', () => {
    const d = diffTransaction(base, { amount: 180_000, categoryId: 'c2' });
    expect(d.changedFields).toEqual(['categoryId']);
  });

  it('normaliza fecha y tags (orden estable); note nunca aparece en el diff', () => {
    const d = diffTransaction(base, {
      occurredAt: new Date('2026-07-06T00:00:00.000Z'),
      tags: ['mercado', 'quincena'],
      note: 'otra nota',
    });
    expect(d.changedFields.sort()).toEqual(['occurredAt', 'tags']);
    expect(d.after.occurredAt).toBe('2026-07-06T00:00:00.000Z');
    expect(JSON.stringify(d)).not.toContain('nota');
    expect(JSON.stringify(d)).not.toContain('texto libre');
  });

  it('sin cambios reales → changedFields vacío (la mutación no debe tocar la BD)', () => {
    expect(diffTransaction(base, { categoryId: 'c1' }).changedFields).toEqual([]);
  });

  it('el guardarraíl de deuda cubre monto, fecha, tipo y deuda (no la categoría)', () => {
    expect([...DEBT_LOCKED_FIELDS].sort()).toEqual(['amount', 'debtId', 'kind', 'occurredAt']);
    expect((DEBT_LOCKED_FIELDS as readonly string[]).includes('categoryId')).toBe(false);
  });
});
