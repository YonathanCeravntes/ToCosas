import { parseKindReply } from './conversation.service';

describe('parseKindReply (FIN-057 · "¿lo pagaste o te lo ganaste?")', () => {
  it('entiende la respuesta corta en sus formas comunes', () => {
    expect(parseKindReply('ingreso')).toBe('ingreso');
    expect(parseKindReply('Me lo gané')).toBe('ingreso');
    expect(parseKindReply('me pagaron')).toBe('ingreso');
    expect(parseKindReply('gasto')).toBe('gasto');
    expect(parseKindReply('lo pagué yo')).toBe('gasto');
    expect(parseKindReply('pago de deuda')).toBe('pago_deuda');
    expect(parseKindReply('cuota')).toBe('pago_deuda');
  });

  it('una frase larga o sin respuesta es otro mensaje (no se fuerza)', () => {
    expect(parseKindReply('hola')).toBeNull();
    expect(parseKindReply('me gané 40.000 en otra carrera hoy por la tarde en Medellín')).toBeNull();
    expect(parseKindReply('almuerzo 18.500')).toBeNull();
  });
});
