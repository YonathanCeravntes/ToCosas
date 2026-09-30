import { normalizeHistory } from './anthropic.client';

describe('BT-026 · historial que acepta la API de la IA', () => {
  it('descarta respuestas del Copiloto al inicio (el recorte a 10 mensajes podía empezar así)', () => {
    const out = normalizeHistory([
      { role: 'assistant', content: 'respuesta vieja' },
      { role: 'user', content: '¿cuánto me queda?' },
      { role: 'assistant', content: 'Te quedan $300.000' },
      { role: 'user', content: '¿y si pago la tarjeta?' },
    ]);
    expect(out[0]).toEqual({ role: 'user', content: '¿cuánto me queda?' });
    expect(out.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
  });

  it('une mensajes seguidos del mismo rol y termina en el del usuario', () => {
    const out = normalizeHistory([
      { role: 'user', content: 'hola' },
      { role: 'user', content: 'guardar documento' },
      { role: 'assistant', content: 'modo básico' },
    ]);
    expect(out).toEqual([{ role: 'user', content: 'hola\n\nguardar documento' }]);
  });

  it('sin mensajes del usuario queda vacío', () => {
    expect(normalizeHistory([{ role: 'assistant', content: 'x' }])).toEqual([]);
  });
});
