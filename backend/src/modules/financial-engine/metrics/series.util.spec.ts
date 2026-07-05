import { daysBetween, linearSlope, monthStart, monthStartMinus, zScore } from './series.util';

describe('linearSlope', () => {
  it('pendiente positiva en serie creciente', () => {
    expect(linearSlope([100, 200, 300])).toBe(100);
  });
  it('pendiente negativa en serie decreciente', () => {
    expect(linearSlope([300, 150, 0])).toBe(-150);
  });
  it('serie plana → 0', () => {
    expect(linearSlope([5, 5, 5])).toBe(0);
  });
  it('menos de 2 puntos → 0', () => {
    expect(linearSlope([42])).toBe(0);
    expect(linearSlope([])).toBe(0);
  });
});

describe('zScore', () => {
  it('detecta un gasto muy por encima del historial', () => {
    // historial estable ~100, actual 400 → z alto
    const z = zScore([100, 110, 90], 400);
    expect(z).not.toBeNull();
    expect(z!).toBeGreaterThan(2);
  });
  it('valor dentro de banda → |z| bajo', () => {
    const z = zScore([100, 110, 90], 105);
    expect(Math.abs(z!)).toBeLessThan(1);
  });
  it('historial sin varianza → null (no evaluable)', () => {
    expect(zScore([100, 100, 100], 200)).toBeNull();
  });
  it('historial insuficiente → null', () => {
    expect(zScore([100], 200)).toBeNull();
  });
});

describe('fechas', () => {
  it('daysBetween cuenta días a nivel UTC', () => {
    expect(daysBetween(new Date('2026-05-01T23:00:00Z'), new Date('2026-07-01T01:00:00Z'))).toBe(61);
  });
  it('monthStart ancla al día 1 UTC', () => {
    expect(monthStart(new Date('2026-07-15T18:30:00Z')).toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });
  it('monthStartMinus cruza el año', () => {
    expect(monthStartMinus(new Date('2026-01-20T00:00:00Z'), 2).toISOString()).toBe('2025-11-01T00:00:00.000Z');
  });
});
