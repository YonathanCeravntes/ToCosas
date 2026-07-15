import { ruleParse } from './rule.parser';

const today = new Date(Date.UTC(2026, 6, 3)); // 2026-07-03

describe('ruleParse — ejemplos del diseño (doc 04 §5)', () => {
  it('"Pagué $250.000 a Bancolombia cuota crédito casa" → pago_deuda', () => {
    const r = ruleParse('Pagué $250.000 a Bancolombia cuota crédito casa', { today });
    expect(r.intent).toBe('registrar_transaccion');
    expect(r.kind).toBe('pago_deuda');
    expect(r.amount).toBe(250000);
    expect(r.entityGuess).toBe('Bancolombia');
    expect(r.categoryGuess).toBe('deuda');
    expect(r.missing).toHaveLength(0);
    expect(r.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('"Gasté $45.000 en almuerzo" → gasto/comida', () => {
    const r = ruleParse('Gasté $45.000 en almuerzo', { today });
    expect(r.kind).toBe('gasto');
    expect(r.amount).toBe(45000);
    expect(r.categoryGuess).toBe('comida');
  });

  it('"Me llegó ingreso de $1.200.000 por freelance" → ingreso/freelance', () => {
    const r = ruleParse('Me llegó ingreso de $1.200.000 por freelance', { today });
    expect(r.kind).toBe('ingreso');
    expect(r.amount).toBe(1200000);
    expect(r.categoryGuess).toBe('freelance');
  });

  it('"abone 100k a la tarjeta" → pago_deuda, falta entidad', () => {
    const r = ruleParse('abone 100k a la tarjeta', { today });
    expect(r.kind).toBe('pago_deuda');
    expect(r.amount).toBe(100000);
    expect(r.missing).toContain('entity');
    expect(r.confidence).toBeLessThan(1);
  });

  it('"cuanto debo" → consulta_resumen', () => {
    const r = ruleParse('cuanto debo', { today });
    expect(r.intent).toBe('consulta_resumen');
  });

  it('"asdfgh" → desconocido', () => {
    const r = ruleParse('asdfgh', { today });
    expect(r.intent).toBe('desconocido');
    expect(r.confidence).toBeLessThan(0.5);
  });
});

describe('ruleParse — intents utilitarios', () => {
  it('detecta saludo', () => {
    expect(ruleParse('Hola', { today }).intent).toBe('saludo');
  });
  it('detecta ayuda', () => {
    expect(ruleParse('ayuda', { today }).intent).toBe('ayuda');
  });
  it('detecta cancelar', () => {
    expect(ruleParse('cancelar', { today }).intent).toBe('cancelar');
  });
  it('detecta deshacer', () => {
    expect(ruleParse('deshacer', { today }).intent).toBe('deshacer');
  });
  it('detecta consulta mis deudas', () => {
    expect(ruleParse('muéstrame mis deudas', { today }).intent).toBe('consulta_resumen');
  });
  it('detecta anular como deshacer (FIN-029)', () => {
    expect(ruleParse('anular', { today }).intent).toBe('deshacer');
  });
  // FIN-029 (§5.3): "simular" es escenario hipotético, NO un registro real.
  it('detecta simulación de abono con monto', () => {
    const r = ruleParse('¿qué pasa si abono $200.000 a mi deuda?', { today });
    expect(r.intent).toBe('consulta_simulacion');
    expect(r.amount).toBe(200000);
  });
  it('"pagué 200 mil a la tarjeta" NO se confunde con simulación (es registro real)', () => {
    expect(ruleParse('pagué 200 mil a la tarjeta', { today }).intent).toBe('registrar_transaccion');
  });
});

describe('ruleParse — fechas', () => {
  it('usa hoy por defecto', () => {
    expect(ruleParse('Gasté $10.000 en café', { today }).dateISO).toBe('2026-07-03');
  });
  it('interpreta "ayer"', () => {
    expect(ruleParse('ayer gasté $10.000 en café', { today }).dateISO).toBe('2026-07-02');
  });
  it('interpreta "el 1 de julio"', () => {
    expect(ruleParse('pagué $50.000 el 1 de julio', { today }).dateISO).toBe('2026-07-01');
  });
});

describe('ruleParse — entidades del usuario', () => {
  it('reconoce una entidad personalizada del usuario', () => {
    const r = ruleParse('abone 100k a Coopcentral', {
      today,
      userEntities: ['Coopcentral'],
    });
    expect(r.entityGuess).toBe('Coopcentral');
    expect(r.missing).not.toContain('entity');
  });
});
