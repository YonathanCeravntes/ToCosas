import { normalizeNumberInput } from './parse-number.util';

describe('normalizeNumberInput (BT-001 · formato regional)', () => {
  it('coma decimal (es-CO): "15,35" → 15.35', () => {
    expect(normalizeNumberInput('15,35')).toBe(15.35);
  });

  it('punto decimal: "15.35" → 15.35', () => {
    expect(normalizeNumberInput('15.35')).toBe(15.35);
  });

  it('entero: "1535" → 1535', () => {
    expect(normalizeNumberInput('1535')).toBe(1535);
  });

  it('miles con punto + decimal con coma: "1.234,56" → 1234.56', () => {
    expect(normalizeNumberInput('1.234,56')).toBe(1234.56);
  });

  it('miles con coma + decimal con punto: "1,234.56" → 1234.56', () => {
    expect(normalizeNumberInput('1,234.56')).toBe(1234.56);
  });

  it('con símbolo de moneda y espacios: " $ 15,35 " → 15.35', () => {
    expect(normalizeNumberInput(' $ 15,35 ')).toBe(15.35);
  });

  it('un número ya numérico pasa sin cambios', () => {
    expect(normalizeNumberInput(15.35)).toBe(15.35);
  });

  it('cadena no numérica se devuelve tal cual (la validación decide → 400, no 500)', () => {
    expect(normalizeNumberInput('abc')).toBe('abc');
    expect(normalizeNumberInput('')).toBe('');
  });

  it('valores no-string (undefined/null) pasan sin cambios', () => {
    expect(normalizeNumberInput(undefined)).toBeUndefined();
    expect(normalizeNumberInput(null)).toBeNull();
  });
});
