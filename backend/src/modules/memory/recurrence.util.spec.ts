import { detectRecurrence } from './recurrence.util';

const m = (monthKey: string, amount: number, dayOfMonth: number) => ({ monthKey, amount, dayOfMonth });

describe('detectRecurrence (FIN-006 §4.4)', () => {
  it('detecta un gasto mensual estable (±15%, ±3 días, 3 meses)', () => {
    const p = detectRecurrence([
      m('2026-04', 800_000, 15),
      m('2026-05', 850_000, 14),
      m('2026-06', 780_000, 16),
    ]);
    expect(p).not.toBeNull();
    expect(p!.medianAmount).toBe(800_000);
    expect(p!.medianDay).toBe(15);
    expect(p!.months).toBe(3);
  });

  it('rechaza con menos de 3 meses', () => {
    expect(detectRecurrence([m('2026-05', 800_000, 15), m('2026-06', 800_000, 15)])).toBeNull();
  });

  it('rechaza montos fuera de banda (±15%)', () => {
    expect(
      detectRecurrence([
        m('2026-04', 800_000, 15),
        m('2026-05', 2_000_000, 15), // fuera de banda
        m('2026-06', 100_000, 15), // fuera de banda
      ]),
    ).toBeNull();
  });

  it('rechaza días dispersos (>±3)', () => {
    expect(
      detectRecurrence([
        m('2026-04', 800_000, 2),
        m('2026-05', 800_000, 15),
        m('2026-06', 800_000, 27),
      ]),
    ).toBeNull();
  });

  it('día circular: fin de mes y día 1 cuentan como cercanos', () => {
    const p = detectRecurrence([
      m('2026-04', 500_000, 29),
      m('2026-05', 500_000, 1),
      m('2026-06', 500_000, 30),
    ]);
    expect(p).not.toBeNull();
  });
});
