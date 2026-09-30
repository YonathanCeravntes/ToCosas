import { parseAmount, normalizeNumberString } from './amount.parser';

describe('normalizeNumberString', () => {
  it.each([
    ['1.200.000', 1200000],
    ['45.000', 45000],
    ['250.000', 250000],
    ['1.200.000,50', 1200000.5],
    ['1,2', 1.2],
    ['1.2', 1.2],
    ['250', 250],
    ['45000', 45000],
  ])('normaliza %s → %d', (input, expected) => {
    expect(normalizeNumberString(input)).toBeCloseTo(expected, 2);
  });
});

describe('parseAmount', () => {
  it.each([
    ['Pagué $250.000 a Bancolombia cuota crédito casa', 250000],
    ['Gasté $45.000 en almuerzo', 45000],
    ['Me llegó ingreso de $1.200.000 por freelance', 1200000],
    ['abone 100k a la tarjeta', 100000],
    ['gasté 45 mil en el super', 45000],
    ['me pagaron 1.2 millones', 1200000],
    ['recibí 1,5 millones', 1500000],
    ['son 2 millones exactos', 2000000],
    ['pagué 1.5m del arriendo', 1500000],
    ['gasto de 45000 en gasolina', 45000],
    ['transferí $3.500.000', 3500000],
  ])('parsea "%s" → %d', (text, expected) => {
    expect(parseAmount(text)).toBe(expected);
  });

  it('devuelve null cuando no hay monto', () => {
    expect(parseAmount('cuánto debo')).toBeNull();
    expect(parseAmount('hola')).toBeNull();
  });

  it('no confunde "mensuales" con el multiplicador m', () => {
    expect(parseAmount('pago 1.200.000 mensuales')).toBe(1200000);
  });
});
