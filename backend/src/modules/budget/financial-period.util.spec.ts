import { clampCycleDay, financialPeriod } from './financial-period.util';

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe('financialPeriod (FIN-016, DEC-0011 §4.6)', () => {
  it('con cycleStartDay=1 es exactamente el mes calendario (retrocompatibilidad)', () => {
    const p = financialPeriod(utc(2026, 7, 18), 1);
    expect(p.start.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(p.label).toBe('jul 2026');
  });

  it('día 15, fecha posterior al corte: el ciclo empezó este mes', () => {
    const p = financialPeriod(utc(2026, 6, 20), 15);
    expect(p.start.toISOString()).toBe('2026-06-15T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-07-15T00:00:00.000Z');
    expect(p.label).toBe('15 jun – 14 jul');
  });

  it('día 15, fecha anterior al corte: el ciclo empezó el mes pasado', () => {
    const p = financialPeriod(utc(2026, 7, 3), 15);
    expect(p.start.toISOString()).toBe('2026-06-15T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-07-15T00:00:00.000Z');
  });

  it('el día exacto del corte pertenece al ciclo que EMPIEZA ese día', () => {
    const p = financialPeriod(utc(2026, 7, 15), 15);
    expect(p.start.toISOString()).toBe('2026-07-15T00:00:00.000Z');
  });

  it('borde de año: 5 de enero con corte 15 → ciclo 15 dic – 14 ene', () => {
    const p = financialPeriod(utc(2026, 1, 5), 15);
    expect(p.start.toISOString()).toBe('2025-12-15T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-01-15T00:00:00.000Z');
    expect(p.label).toBe('15 dic – 14 ene');
  });

  it('corte 28 en febrero (mes corto) funciona sin desbordar', () => {
    const p = financialPeriod(utc(2026, 2, 27), 28);
    expect(p.start.toISOString()).toBe('2026-01-28T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-02-28T00:00:00.000Z');
    const p2 = financialPeriod(utc(2026, 2, 28), 28);
    expect(p2.start.toISOString()).toBe('2026-02-28T00:00:00.000Z');
    expect(p2.end.toISOString()).toBe('2026-03-28T00:00:00.000Z');
  });

  it('los ciclos consecutivos son contiguos y sin huecos (end exclusivo = start siguiente)', () => {
    const a = financialPeriod(utc(2026, 3, 10), 20); // 20 feb – 19 mar
    const b = financialPeriod(a.end, 20); // empieza exactamente en a.end
    expect(b.start.getTime()).toBe(a.end.getTime());
  });

  it('clampCycleDay: valores fuera de rango o no enteros caen a un valor seguro', () => {
    expect(clampCycleDay(0)).toBe(1);
    expect(clampCycleDay(-5)).toBe(1);
    expect(clampCycleDay(31)).toBe(28);
    expect(clampCycleDay(2.5)).toBe(1);
    expect(clampCycleDay(15)).toBe(15);
  });
});
