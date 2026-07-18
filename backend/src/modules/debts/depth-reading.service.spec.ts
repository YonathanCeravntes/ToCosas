import { DepthReadingService } from './depth-reading.service';
import { PRODUCT_TYPE_DESCRIPTORS } from './product-type.descriptor';

/**
 * FIN-037 (DEC-0037) · Las lecturas de profundidad: los 3 bordes honestos del
 * costo real del informal, el sobrecupo exacto, config-sin-código y el copy
 * §29.2 (informa sin culpar ni recomendar contratar).
 */
describe('DepthReadingService (FIN-037)', () => {
  const cards = (summary: Record<string, unknown>) =>
    ({ summary: jest.fn().mockResolvedValue(summary) }) as never;
  const svc = (cardSummary: Record<string, unknown> = {}) => new DepthReadingService(cards(cardSummary));

  const gota = (over: Record<string, unknown> = {}) => ({
    id: 'd1',
    debtType: 'gota_a_gota',
    currentBalance: 500_000,
    monthlyPayment: 150_000,
    interestRate: 20,
    rateBasis: 'EA' as const,
    ...over,
  });

  it('BORDE 1 · con tasa declarada: interés vs capital de la cuota (composición FIN-012)', async () => {
    const r = await svc().forDebt('u1', gota());
    expect(r).toHaveLength(1);
    expect(r[0].kind).toBe('costo_real_informal');
    // EA 20% → mensual ~1.531% → interés ~7.655 sobre 500.000; capital ~142.345.
    expect(r[0].body).toContain('7.655');
    expect(r[0].body).toContain('142.345');
    expect(r[0].severity).toBe('info');
  });

  it('BORDE 2 · cuota ≤ interés: la verdad brutal sin juicio, con el puente al abono', async () => {
    // Saldo 10M al 60% EA → interés mensual ~400k > cuota 150k.
    const r = await svc().forDebt('u1', gota({ currentBalance: 10_000_000, interestRate: 60 }));
    expect(r[0].severity).toBe('warning');
    expect(r[0].body).toContain('el saldo no baja');
    expect(r[0].body).toContain('Cada peso extra');
  });

  it('BORDE 3 · sin tasa declarada: invitación honesta — NO se inventa cifra', async () => {
    const r = await svc().forDebt('u1', gota({ interestRate: 0 }));
    expect(r[0].body).toContain('decláralo');
    expect(r[0].body).not.toMatch(/\$\s?\d/); // cero cifras inventadas
  });

  it('SOBRECUPO · se activa EXACTAMENTE cuando usedAmount > creditLimit', async () => {
    const card = { id: 'c1', debtType: 'fintech', currentBalance: 0, monthlyPayment: null, interestRate: 32, rateBasis: 'EA' as const };
    // Igual al cupo → NO se activa.
    const atLimit = await svc({ creditLimit: 1_000_000, usedAmount: 1_000_000 }).forDebt('u1', card);
    expect(atLimit).toHaveLength(0);
    // Por encima → se activa con el excedente exacto.
    const over = await svc({ creditLimit: 1_000_000, usedAmount: 1_200_000 }).forDebt('u1', card);
    expect(over).toHaveLength(1);
    expect(over[0].kind).toBe('sobrecupo');
    expect(over[0].body).toContain('200.000');
    // Sin cupo declarado → silencio (no hay qué exceder).
    const noLimit = await svc({ creditLimit: null, usedAmount: 500_000 }).forDebt('u1', card);
    expect(noLimit).toHaveLength(0);
  });

  it('CONFIG-SIN-CÓDIGO · agregar una lectura a una modalidad = una fila del descriptor', async () => {
    const original = PRODUCT_TYPE_DESCRIPTORS.credito_personal.depthReadings;
    try {
      PRODUCT_TYPE_DESCRIPTORS.credito_personal.depthReadings = ['costo_real_informal'];
      const personal = gota({ debtType: 'credito_personal' });
      const r = await svc().forDebt('u1', personal);
      expect(r).toHaveLength(1); // el flujo la sirve sin tocar código
    } finally {
      PRODUCT_TYPE_DESCRIPTORS.credito_personal.depthReadings = original;
    }
  });

  it('modalidad sin lecturas declaradas = silencio (hipoteca, personal…)', async () => {
    const r = await svc().forDebt('u1', gota({ debtType: 'hipotecario' }));
    expect(r).toHaveLength(0);
  });

  it('§29.2 / Independencia · el copy informa: jamás culpa ni recomienda contratar', async () => {
    const all = [
      ...(await svc().forDebt('u1', gota())),
      ...(await svc().forDebt('u1', gota({ currentBalance: 10_000_000, interestRate: 60 }))),
      ...(await svc().forDebt('u1', gota({ interestRate: 0 }))),
      ...(await svc({ creditLimit: 1_000_000, usedAmount: 1_200_000 }).forDebt('u1', {
        id: 'c1', debtType: 'fintech', currentBalance: 0, monthlyPayment: null, interestRate: 32, rateBasis: 'EA',
      })),
    ];
    const text = all.map((r) => `${r.title} ${r.body}`).join(' ').toLowerCase();
    // Sin culpa (§29.2) y sin recomendación comercial (Independencia).
    for (const forbidden of ['irresponsable', 'culpa', 'deberías', 'mal hecho', 'error tuyo', 'contrata', 'te recomendamos', 'mejor banco']) {
      expect(text).not.toContain(forbidden);
    }
  });
});
