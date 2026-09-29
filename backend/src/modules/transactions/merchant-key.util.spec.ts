import { displayMerchant, merchantKey } from './merchant-key.util';

describe('merchantKey (FIN-046 Fase 4)', () => {
  it('quita montos, tildes y palabras de relleno', () => {
    expect(merchantKey('Pagué Netflix $45.000')).toBe('netflix');
    expect(merchantKey('almuerzo en el Corral 32 mil')).toBe('almuerzo corral');
    expect(merchantKey('Gimnasio Bodytech mensual')).toBe('gimnasio bodytech');
  });

  it('sin comercio reconocible devuelve vacío', () => {
    expect(merchantKey('45000')).toBe('');
    expect(merchantKey(null)).toBe('');
    expect(merchantKey('pagué 20 mil')).toBe('');
  });

  it('se limita a 3 palabras para que la misma compra dé la misma clave', () => {
    expect(merchantKey('Uber al aeropuerto desde la casa')).toBe('uber aeropuerto desde');
  });

  it('muestra el comercio con mayúscula inicial', () => {
    expect(displayMerchant('spotify premium')).toBe('Spotify Premium');
  });
});
