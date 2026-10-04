import { median, spendingBaseline } from './spending-baseline.util';

describe('FIN-061 · línea base de gasto variable', () => {
  it('mediana: un mes raro no mueve la base', () => {
    const b = spendingBaseline([
      { month: '2026-07', total: 900_000, essential: 600_000 },
      { month: '2026-08', total: 3_500_000, essential: 650_000 }, // viaje
      { month: '2026-09', total: 1_000_000, essential: 700_000 },
    ]);
    expect(b).toEqual({ months: 3, typicalVariable: 1_000_000, typicalEssential: 650_000, lowVariable: 900_000, highVariable: 3_500_000 });
  });
  it('ignora meses sin registros (persona nueva)', () => {
    const b = spendingBaseline([
      { month: '2026-07', total: 0, essential: 0 },
      { month: '2026-08', total: 0, essential: 0 },
      { month: '2026-09', total: 800_000, essential: 500_000 },
    ]);
    expect(b).toEqual({ months: 1, typicalVariable: 800_000, typicalEssential: 500_000, lowVariable: 800_000, highVariable: 800_000 });
  });
  it('sin datos: null (se usa lo de hoy)', () => {
    expect(spendingBaseline([{ month: '2026-09', total: 0, essential: 0 }])).toBeNull();
  });
  it('mediana con dos valores = promedio de ambos', () => {
    expect(median([2, 4])).toBe(3);
  });
});
