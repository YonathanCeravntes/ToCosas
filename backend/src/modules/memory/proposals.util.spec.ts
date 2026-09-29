import { detectIncomeProposal, detectMonthlyMerchants, TxLite } from './proposals.util';

const tx = (note: string, amount: number, iso: string, categoryId: string | null = 'cat'): TxLite => ({
  note, amount, occurredAt: new Date(iso), categoryId,
});
const NOW = new Date('2026-09-20T12:00:00Z');

describe('detectMonthlyMerchants (FIN-046 Fase 4)', () => {
  it('Netflix dos meses seguidos, mismo monto y día → propuesta', () => {
    const out = detectMonthlyMerchants([tx('Netflix', 45_000, '2026-08-12'), tx('pagué netflix 45.000', 45_900, '2026-09-13')], NOW);
    expect(out).toEqual([expect.objectContaining({ key: 'netflix', name: 'Netflix', amount: 45_450, dayOfMonth: 13, months: 2 })]);
  });

  it('varias veces en un mes (almuerzos) no es un fijo', () => {
    const out = detectMonthlyMerchants([
      tx('almuerzo corral', 30_000, '2026-08-05'), tx('almuerzo corral', 32_000, '2026-08-19'), tx('almuerzo corral', 31_000, '2026-09-05'),
    ], NOW);
    expect(out).toEqual([]);
  });

  it('meses no seguidos, montos muy distintos o que ya no se paga → nada', () => {
    expect(detectMonthlyMerchants([tx('Spotify', 20_000, '2026-06-10'), tx('Spotify', 20_000, '2026-09-10')], NOW)).toEqual([]);
    expect(detectMonthlyMerchants([tx('Gimnasio', 90_000, '2026-08-02'), tx('Gimnasio', 150_000, '2026-09-02')], NOW)).toEqual([]);
    expect(detectMonthlyMerchants([tx('Revista', 15_000, '2026-05-01'), tx('Revista', 15_000, '2026-06-01')], NOW)).toEqual([]);
  });

  it('día muy distinto no cruza', () => {
    expect(detectMonthlyMerchants([tx('Seguro', 80_000, '2026-08-02'), tx('Seguro', 80_000, '2026-09-18')], NOW)).toEqual([]);
  });
});

describe('detectIncomeProposal (FIN-046 Fase 4)', () => {
  it('sin ingresos declarados y lo recibido es estable → ingreso fijo', () => {
    expect(detectIncomeProposal([{ amount: 3_000_000, day: 1 }, { amount: 3_050_000, day: 2 }, { amount: 3_000_000, day: 1 }], 0))
      .toEqual({ action: 'crear_ingreso_fijo', name: 'Ingreso mensual', amount: 3_000_000, dayOfMonth: 1 });
  });

  it('con ingresos declarados y 3 meses con 10%+ de más → variable con lo mínimo que sobró', () => {
    expect(detectIncomeProposal([{ amount: 5_600_000, day: 1 }, { amount: 5_900_000, day: 1 }, { amount: 5_750_000, day: 1 }], 5_000_000))
      .toEqual({ action: 'crear_ingreso_variable', name: 'Ingresos extra', amount: 600_000 });
  });

  it('un mes sin extra, o extra muy pequeño → nada', () => {
    expect(detectIncomeProposal([{ amount: 5_600_000, day: 1 }, { amount: 5_000_000, day: 1 }, { amount: 5_750_000, day: 1 }], 5_000_000)).toBeNull();
    expect(detectIncomeProposal([{ amount: 5_600_000, day: 1 }], 5_000_000)).toBeNull();
  });
});
