import { analyzeConsumption, bandLimits, CategoryMonth, ConsumptionInput, subscriptionFamily } from './consumption.util';
import { classify } from '../budget/spend-class.util';
import { installmentInterest } from './consumption.service';

const cat = (over: Partial<CategoryMonth>): CategoryMonth => ({
  categoryId: over.name ?? 'x',
  name: 'Salidas y entretenimiento',
  spendClass: 'gusto',
  protected: false,
  monthlyCap: null,
  amount: 0,
  count: 0,
  typicalAmount: null,
  typicalCount: null,
  financedAmount: 0,
  financedInterest: 0,
  ...over,
});

const base = (over: Partial<ConsumptionInput>): ConsumptionInput => ({
  incomeBase: 5_000_000,
  dti: 0.55,
  inArrears: false,
  hasDebt: true,
  categories: [],
  fixedGustos: 0,
  subscriptions: [],
  smallPurchases: { amount: 0, count: 0, typicalAmount: null },
  ...over,
});

describe('FIN-061 2.2 · esencial y gustos', () => {
  it('sugerencia por nombre; la persona manda; lo suyo es mixto', () => {
    expect(classify({ name: 'Mercado', isGlobal: true }).spendClass).toBe('esencial');
    expect(classify({ name: 'Domicilios', isGlobal: true }).spendClass).toBe('gusto');
    expect(classify({ name: 'Comida', isGlobal: true }).spendClass).toBe('mixto');
    expect(classify({ name: 'Mascotas', isGlobal: false }).spendClass).toBe('mixto');
    const mine = classify({ name: 'Comida', isGlobal: true }, { spendClass: 'esencial', protected: true });
    expect(mine).toEqual({ spendClass: 'esencial', suggested: 'mixto', protected: true });
  });
});

describe('FIN-061 2.3 · análisis de consumo', () => {
  it('regla 1: la banda se ajusta a la carga de deuda', () => {
    expect(bandLimits(0.1, false)).toEqual({ tranquilo: 0.25, atencion: 0.35 });
    expect(bandLimits(0.25, false)).toEqual({ tranquilo: 0.2, atencion: 0.3 });
    expect(bandLimits(0.55, false)).toEqual({ tranquilo: 0.15, atencion: 0.25 });
    expect(bandLimits(0.1, true)).toEqual({ tranquilo: 0.15, atencion: 0.25 });
  });

  it('cine 4 veces (el doble de lo usual) con gustos en atención → espaciar a tu ritmo, nunca a cero', () => {
    const r = analyzeConsumption(base({
      categories: [cat({ amount: 96_000, count: 4, typicalAmount: 48_000, typicalCount: 2 })],
      fixedGustos: 800_000, // suscripciones y otros gustos fijos → 17,9 % del ingreso
    }));
    expect(r.gustos.band).toBe('atencion');
    expect(r.suggestions).toHaveLength(1);
    const s = r.suggestions[0];
    expect(s.kind).toBe('espaciar');
    expect(s.frees).toBe(48_000);
    expect(s.canKeep).toBe(true);
    expect(s.body).not.toMatch(/exceso/i);
  });

  it('regla 2: silencio si los gustos están tranquilos', () => {
    const r = analyzeConsumption(base({
      dti: 0.1,
      categories: [cat({ amount: 96_000, count: 4, typicalAmount: 48_000, typicalCount: 2 })],
    }));
    expect(r.gustos.band).toBe('tranquilo');
    expect(r.suggestions).toHaveLength(0);
  });

  it('regla 2: salidas 2 veces al mes o menos es silencio aunque sea pico', () => {
    const r = analyzeConsumption(base({
      categories: [cat({ amount: 200_000, count: 2, typicalAmount: 60_000, typicalCount: 1 })],
      fixedGustos: 1_000_000,
    }));
    expect(r.suggestions).toHaveLength(0);
  });

  it('regla 2: diferencia menor a $30.000 es silencio', () => {
    const r = analyzeConsumption(base({
      categories: [cat({ name: 'Café y antojos', amount: 40_000, count: 8, typicalAmount: 20_000, typicalCount: 4 })],
      fixedGustos: 1_000_000,
    }));
    expect(r.suggestions).toHaveLength(0);
  });

  it('regla 5: lo protegido solo recibe una nota informativa', () => {
    const r = analyzeConsumption(base({
      categories: [cat({ amount: 96_000, count: 4, typicalAmount: 48_000, typicalCount: 2, protected: true })],
      fixedGustos: 800_000,
    }));
    expect(r.suggestions).toHaveLength(0);
    expect(r.notes.map((n) => n.kind)).toEqual(['protegido']);
  });

  it('señal roja: un gusto a cuotas con interés mientras se debe → la nota habla del interés', () => {
    const r = analyzeConsumption(base({
      dti: 0.1,
      categories: [cat({ name: 'Ropa', spendClass: 'gusto', amount: 300_000, count: 1, typicalAmount: 100_000, typicalCount: 1, financedAmount: 300_000, financedInterest: 45_000 })],
    }));
    expect(r.notes.find((n) => n.kind === 'tarjeta_interes')?.text).toContain('$45.000');
    // Pico y pagado a cuotas mientras debe → también entra la sugerencia de espaciar.
    expect(r.suggestions[0].kind).toBe('espaciar');
  });

  it('regla 6: dos plataformas de video, sin nombrar marcas', () => {
    const r = analyzeConsumption(base({
      subscriptions: [
        { name: 'Netflix', amount: 26_900, previousAmount: null },
        { name: 'Disney plus', amount: 38_900, previousAmount: null },
      ],
      categories: [cat({ categoryId: 'subs', name: 'Suscripciones' })],
    }));
    const s = r.suggestions.find((x) => x.kind === 'suscripcion_repetida')!;
    expect(s.title).toBe('Tienes 2 plataformas de video');
    expect(s.body).not.toMatch(/netflix|disney/i);
    expect(s.frees).toBe(26_900);
  });

  it('regla 6: subió más de 10 %', () => {
    const r = analyzeConsumption(base({ subscriptions: [{ name: 'Música', amount: 23_900, previousAmount: 16_900 }] }));
    expect(r.suggestions[0].kind).toBe('suscripcion_subio');
  });

  it('regla 7: hormiga — el total, sin culpar a nadie', () => {
    const r = analyzeConsumption(base({ smallPurchases: { amount: 450_000, count: 40, typicalAmount: 250_000 } }));
    expect(r.suggestions[0].kind).toBe('hormiga');
    expect(r.suggestions[0].frees).toBe(200_000);
    expect(r.suggestions[0].body).not.toMatch(/tinto/i);
  });

  it('máximo 2 sugerencias, una por categoría, las que más liberan', () => {
    const r = analyzeConsumption(base({
      fixedGustos: 800_000,
      categories: [
        cat({ categoryId: 'a', name: 'Salidas y entretenimiento', amount: 300_000, count: 6, typicalAmount: 100_000, typicalCount: 2 }),
        cat({ categoryId: 'b', name: 'Domicilios', amount: 200_000, count: 8, typicalAmount: 80_000, typicalCount: 3 }),
      ],
      smallPurchases: { amount: 450_000, count: 40, typicalAmount: 250_000 },
    }));
    expect(r.suggestions).toHaveLength(2);
    expect(r.suggestions.map((s) => s.categoryId)).toEqual([null, 'a']); // hormiga libera 200k; salidas 150k; domicilios queda fuera
  });

  it('lo positivo: categoría por debajo de su ritmo', () => {
    const r = analyzeConsumption(base({ categories: [cat({ name: 'Domicilios', amount: 50_000, count: 2, typicalAmount: 150_000, typicalCount: 6 })] }));
    expect(r.wins[0]).toContain('Domicilios');
  });

  it('familias de suscripción', () => {
    expect(subscriptionFamily('Netflix')).toBe('video');
    expect(subscriptionFamily('Spotify premium')).toBe('musica');
    expect(subscriptionFamily('Gimnasio')).toBeNull();
  });

  it('interés de una compra a cuotas', () => {
    // $300.000 a 36 cuotas al 2,1 % mensual (~28,3 % EA) ≈ 43 % más.
    const i = installmentInterest(300_000, 0.021, 36);
    expect(i / 300_000).toBeGreaterThan(0.38);
    expect(i / 300_000).toBeLessThan(0.45);
    expect(installmentInterest(300_000, 0.021, 1)).toBe(0);
  });
});
