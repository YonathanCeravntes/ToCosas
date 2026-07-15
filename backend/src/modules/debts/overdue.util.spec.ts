import { overdueDays } from './overdue.util';

/** FIN-024 · Caso a mano del estado de mora (ARQ-0024 §13.2) — fechas puras UTC. */
describe('overdueDays (FIN-024, DEC-0024 P2)', () => {
  const HOY = new Date('2026-07-13T15:30:00.000Z'); // hora del día: irrelevante

  it('venció ayer → 1 día; hace 12 días → 12', () => {
    expect(overdueDays(new Date('2026-07-12T00:00:00.000Z'), HOY)).toBe(1);
    expect(overdueDays(new Date('2026-07-01T00:00:00.000Z'), HOY)).toBe(12);
  });

  it('vence HOY o en el futuro → null (no hay mora)', () => {
    expect(overdueDays(new Date('2026-07-13T00:00:00.000Z'), HOY)).toBeNull();
    expect(overdueDays(new Date('2026-07-28T00:00:00.000Z'), HOY)).toBeNull();
  });

  it('sin fecha (deuda saldada) → null', () => {
    expect(overdueDays(null, HOY)).toBeNull();
    expect(overdueDays(undefined, HOY)).toBeNull();
  });

  it('inmune a la zona horaria: se compara medianoche UTC contra medianoche UTC', () => {
    // Vencida el 12 a medianoche UTC; "hoy" 13 a la 01:00 UTC (20:00 del 12 en
    // Colombia): para la fecha PURA ya es 13 → 1 día. La hora local no corre días.
    expect(overdueDays(new Date('2026-07-12T00:00:00.000Z'), new Date('2026-07-13T01:00:00.000Z'))).toBe(1);
  });
});
