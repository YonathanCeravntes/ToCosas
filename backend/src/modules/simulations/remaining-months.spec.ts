import { estimateRemainingMonths } from './simulations.service';

describe('FIN-061: meses restantes sin tabla de pagos', () => {
  it('cuota fija con interés: fórmula de anualidad', () => {
    // $2.000.000 al 2,5 % mensual con cuota de $330.000 → 7 meses.
    expect(estimateRemainingMonths(2_000_000, 330_000, 0.025)).toBe(7);
  });
  it('sin interés: saldo ÷ cuota', () => {
    expect(estimateRemainingMonths(1_000_000, 300_000, 0)).toBe(4);
  });
  it('sin cuota o cuota que no cubre el interés: usa el plazo pactado', () => {
    expect(estimateRemainingMonths(1_000_000, 0, 0.02, 18)).toBe(18);
    expect(estimateRemainingMonths(10_000_000, 100_000, 0.03, 36)).toBe(36);
  });
  it('nunca devuelve 1 mes por falta de tabla (el error de antes)', () => {
    expect(estimateRemainingMonths(12_840_500, 385_289, 0.016)).toBeGreaterThan(30);
  });
});
