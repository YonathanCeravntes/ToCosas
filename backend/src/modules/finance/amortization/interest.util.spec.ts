import {
  monthlyToEffectiveAnnual,
  toEffectiveAnnualRate,
  toMonthlyEffectiveRate,
} from './interest.util';

describe('interest.util', () => {
  describe('toMonthlyEffectiveRate', () => {
    it('convierte EA a mensual efectiva: 12.6825% EA ≈ 1% mensual', () => {
      const m = toMonthlyEffectiveRate(12.6825, 'EA');
      expect(m).toBeCloseTo(0.01, 5);
    });

    it('MV se toma tal cual (2% mensual = 0.02)', () => {
      expect(toMonthlyEffectiveRate(2, 'MV')).toBeCloseTo(0.02, 10);
    });

    it('NMV divide entre 12 (24% NMV = 2% mensual)', () => {
      expect(toMonthlyEffectiveRate(24, 'NMV')).toBeCloseTo(0.02, 10);
      expect(toMonthlyEffectiveRate(24, 'NAMV')).toBeCloseTo(0.02, 10);
    });

    it('tasa 0 devuelve 0 en cualquier base', () => {
      expect(toMonthlyEffectiveRate(0, 'EA')).toBe(0);
      expect(toMonthlyEffectiveRate(0, 'NMV')).toBe(0);
    });

    it('lanza error con tasa negativa', () => {
      expect(() => toMonthlyEffectiveRate(-1, 'EA')).toThrow();
    });
  });

  describe('ida y vuelta EA ↔ mensual', () => {
    it('monthlyToEffectiveAnnual es la inversa de toMonthlyEffectiveRate(EA)', () => {
      const m = toMonthlyEffectiveRate(12.6825, 'EA');
      expect(monthlyToEffectiveAnnual(m)).toBeCloseTo(0.126825, 5);
    });

    it('toEffectiveAnnualRate normaliza NMV a EA para comparar deudas', () => {
      // 24% NMV = 2% mensual → EA = 1.02^12 - 1 ≈ 26.82%
      expect(toEffectiveAnnualRate(24, 'NMV')).toBeCloseTo(0.268242, 5);
    });
  });
});
