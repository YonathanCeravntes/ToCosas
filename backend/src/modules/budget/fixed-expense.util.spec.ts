import { matchFixed, normalizeName, occurrenceInCycle } from './fixed-expense.util';

describe('FIN-047 · gastos fijos automáticos (utilidades)', () => {
  const period = { start: new Date(Date.UTC(2026, 8, 1)), end: new Date(Date.UTC(2026, 9, 1)) };

  it('normaliza nombres sin tildes ni signos', () => {
    expect(normalizeName('Arriendo Apto.')).toBe('arriendo apto');
    expect(normalizeName('Energía (EPM)')).toBe('energia epm');
  });

  it('la fecha del fijo cae en el ciclo (tope día 28, sin día = inicio)', () => {
    expect(occurrenceInCycle(5, period).toISOString().slice(0, 10)).toBe('2026-09-05');
    expect(occurrenceInCycle(31, period).toISOString().slice(0, 10)).toBe('2026-09-28');
    expect(occurrenceInCycle(null, period).toISOString().slice(0, 10)).toBe('2026-09-01');
    const cycle15 = { start: new Date(Date.UTC(2026, 8, 15)), end: new Date(Date.UTC(2026, 9, 15)) };
    expect(occurrenceInCycle(5, cycle15).toISOString().slice(0, 10)).toBe('2026-10-05');
  });

  it('cruza "pagué el arriendo" con el fijo Arriendo si el monto es parecido', () => {
    const items = [
      { id: 'a', name: 'Arriendo', amount: 1_200_000 },
      { id: 'n', name: 'Netflix', amount: 45_000 },
    ];
    expect(matchFixed(items, 'Pagué el arriendo de octubre', 1_200_000)?.id).toBe('a');
    expect(matchFixed(items, 'netflix', 44_900)?.id).toBe('n');
    // Monto muy distinto: no es el fijo (p. ej. un arreglo del apartamento).
    expect(matchFixed(items, 'arriendo', 150_000)).toBeNull();
    // Sin el nombre del fijo: no se cruza.
    expect(matchFixed(items, 'mercado', 1_200_000)).toBeNull();
  });

  it('FIN-048: cruza por las palabras del tipo ("pagué la luz" → Servicios públicos)', () => {
    const items = [
      { id: 's', name: 'Servicios públicos', amount: 180_000, aliases: ['luz', 'agua', 'gas', 'energia'] },
      { id: 'i', name: 'Internet y TV', amount: 95_000, aliases: ['internet', 'wifi'] },
    ];
    expect(matchFixed(items, 'Pagué la luz', 170_000)?.id).toBe('s');
    expect(matchFixed(items, 'wifi del mes', 95_000)?.id).toBe('i');
    expect(matchFixed(items, 'gasolina', 170_000)).toBeNull();
  });
});
