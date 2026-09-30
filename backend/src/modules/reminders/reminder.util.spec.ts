import { addOneMonth, daysUntil, offsetLabel, shouldFireToday } from './reminder.util';

describe('reminder.util', () => {
  const today = new Date(Date.UTC(2026, 6, 3)); // 2026-07-03

  describe('daysUntil', () => {
    it('cuenta días futuros', () => {
      expect(daysUntil(new Date(Date.UTC(2026, 6, 6)), today)).toBe(3);
    });
    it('hoy = 0', () => {
      expect(daysUntil(new Date(Date.UTC(2026, 6, 3)), today)).toBe(0);
    });
    it('pasado = negativo', () => {
      expect(daysUntil(new Date(Date.UTC(2026, 6, 1)), today)).toBe(-2);
    });
  });

  describe('shouldFireToday', () => {
    const offsets = [3, 1, 0];
    it('dispara 3 días antes', () => {
      expect(shouldFireToday(new Date(Date.UTC(2026, 6, 6)), offsets, today)).toBe(true);
    });
    it('dispara 1 día antes (mañana vence)', () => {
      expect(shouldFireToday(new Date(Date.UTC(2026, 6, 4)), offsets, today)).toBe(true);
    });
    it('dispara el mismo día', () => {
      expect(shouldFireToday(new Date(Date.UTC(2026, 6, 3)), offsets, today)).toBe(true);
    });
    it('NO dispara 2 días antes (no está en offsets)', () => {
      expect(shouldFireToday(new Date(Date.UTC(2026, 6, 5)), offsets, today)).toBe(false);
    });
    it('NO dispara si ya venció', () => {
      expect(shouldFireToday(new Date(Date.UTC(2026, 6, 1)), offsets, today)).toBe(false);
    });
  });

  describe('offsetLabel', () => {
    it.each([
      [0, 'hoy'],
      [1, 'mañana'],
      [3, 'en 3 días'],
    ])('%d → %s', (d, label) => {
      expect(offsetLabel(d)).toBe(label);
    });
  });

  describe('addOneMonth', () => {
    it('avanza un mes normal', () => {
      expect(addOneMonth(new Date(Date.UTC(2026, 6, 5))).toISOString().slice(0, 10)).toBe(
        '2026-08-05',
      );
    });
    it('cruza el fin de año', () => {
      expect(addOneMonth(new Date(Date.UTC(2026, 11, 15))).toISOString().slice(0, 10)).toBe(
        '2027-01-15',
      );
    });
    it('ajusta el 31 a un mes más corto', () => {
      // 31 ene → 28 feb (2026 no bisiesto)
      expect(addOneMonth(new Date(Date.UTC(2026, 0, 31))).toISOString().slice(0, 10)).toBe(
        '2026-02-28',
      );
    });
  });
});
