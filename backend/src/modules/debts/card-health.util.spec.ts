import { cardHealth, CardHealthInput, levelFor, payoff, PurchaseIn, StatementIn } from './card-health.util';

const MR = Math.pow(1.2859, 1 / 12) - 1; // 28,59 % EA
const d = (s: string) => new Date(`${s}T00:00:00Z`);

const stmt = (over: Partial<StatementIn>): StatementIn => ({
  closingDate: d('2026-09-28'),
  dueDate: d('2026-10-15'),
  statementBalance: 4_180_000,
  minimumPayment: 331_918,
  totalPayment: 4_180_000,
  creditLimit: 5_600_000,
  handlingFee: null,
  ...over,
});

const buy = (over: Partial<PurchaseIn>): PurchaseIn => ({
  id: 'p',
  amount: 180_000,
  occurredAt: d('2026-09-20'),
  installmentsCount: 1,
  withInterest: false,
  isCashAdvance: false,
  categoryName: 'Mercado',
  perInstallment: 180_000,
  pendingBalance: 180_000,
  lastDueDate: d('2026-10-20'),
  ...over,
});

const input = (over: Partial<CardHealthInput>): CardHealthInput => ({
  now: d('2026-10-04'),
  incomeBase: 5_000_000,
  monthlyRate: MR,
  creditLimit: 5_600_000,
  usedAmount: 4_180_000,
  cuota: 331_918,
  planExtra: 352_000,
  allCardsCuota: 331_918,
  otherCards: [],
  nextDueDate: d('2026-10-15'),
  statements: [stmt({})],
  payments: [],
  purchases: [],
  ...over,
});

const kinds = (h: ReturnType<typeof cardHealth>) => h.alerts.map((a) => a.kind);

describe('FIN-061 2.4 · salud de tu tarjeta', () => {
  it('niveles del cupo: 30 / 50 / 70 / 90', () => {
    expect(levelFor(0.25)).toBe('meta');
    expect(levelFor(0.45)).toBe('bien');
    expect(levelFor(0.6)).toBe('atencion');
    expect(levelFor(0.74)).toBe('alto');
    expect(levelFor(0.95)).toBe('critico');
  });

  it('regla 3: pago sugerido = cuota + plan, entre el mínimo y el total', () => {
    const h = cardHealth(input({}));
    expect(h.payment.suggested).toBe(683_918);
    expect(h.payment.minimum).toBe(331_918);
    expect(h.payment.total).toBe(4_180_000);
    // Nunca por debajo del mínimo ni por encima del total.
    expect(cardHealth(input({ cuota: 100_000, planExtra: 0 })).payment.suggested).toBe(331_918);
    expect(cardHealth(input({ planExtra: 9_000_000 })).payment.suggested).toBe(4_180_000);
  });

  it('regla 1: dos cortes seguidos sobre 70 % → abono para llegar a 50 %', () => {
    const h = cardHealth(input({
      statements: [stmt({}), stmt({ closingDate: d('2026-08-28'), statementBalance: 4_100_000 })],
    }));
    const a = h.alerts.find((x) => x.kind === 'cupo_alto')!;
    expect(a.amount).toBe(4_180_000 - 2_800_000);
    expect(h.utilization.level).toBe('alto');
    expect(h.utilization.toGoal).toBe(4_180_000 - 1_680_000);
  });

  it('regla 1: un solo corte alto no avisa', () => {
    expect(kinds(cardHealth(input({})))).not.toContain('cupo_alto');
  });

  it('regla 2: ≥ 90 % → pausar compras unos días', () => {
    expect(kinds(cardHealth(input({ usedAmount: 5_100_000 })))).toContain('cupo_critico');
  });

  it('regla 4: solo el mínimo dos meses seguidos → simulación con $100.000 más', () => {
    const p = payoff(3_000_000, MR, 119_000);
    expect(p!.months).toBeGreaterThanOrEqual(35);
    const more = payoff(3_000_000, MR, 219_000)!;
    expect(more.months).toBeLessThanOrEqual(17);
    const h = cardHealth(input({
      statements: [
        stmt({ closingDate: d('2026-09-28'), statementBalance: 3_000_000, minimumPayment: 119_000 }),
        stmt({ closingDate: d('2026-08-28'), statementBalance: 3_050_000, minimumPayment: 120_000 }),
        stmt({ closingDate: d('2026-07-28'), statementBalance: 3_100_000, minimumPayment: 121_000 }),
      ],
      payments: [
        { date: d('2026-09-14'), amount: 120_000 },
        { date: d('2026-08-14'), amount: 121_000 },
      ],
    }));
    const a = h.alerts.find((x) => x.kind === 'solo_minimo')!;
    expect(a.body).toMatch(/terminas en \d+ meses en vez de \d+/);
    expect(a.amount!).toBeGreaterThan(500_000);
  });

  it('regla 5: compra pequeña a 12 cuotas con interés', () => {
    const h = cardHealth(input({ purchases: [buy({ installmentsCount: 12, withInterest: true })] }));
    const a = h.alerts.find((x) => x.kind === 'compra_pequena_cuotas')!;
    expect(a.amount!).toBeGreaterThan(20_000);
    expect(a.amount!).toBeLessThan(30_000);
  });

  it('regla 6: 36 cuotas ≈ 40 % más', () => {
    const h = cardHealth(input({ purchases: [buy({ amount: 1_200_000, installmentsCount: 36, withInterest: true, categoryName: 'Hogar' })] }));
    const a = h.alerts.find((x) => x.kind === 'cuotas_largas')!;
    expect(a.amount! / 1_200_000).toBeGreaterThan(0.38);
    expect(a.amount! / 1_200_000).toBeLessThan(0.48);
  });

  it('regla 7: cuotas de tarjetas > 20 % del ingreso → calendario', () => {
    const h = cardHealth(input({
      allCardsCuota: 1_200_000,
      purchases: [buy({ perInstallment: 50_000, lastDueDate: d('2027-01-20') }), buy({ id: 'q', perInstallment: 30_000, lastDueDate: d('2027-01-05') })],
    }));
    expect(h.releaseCalendar).toEqual([{ month: '2027-02', frees: 80_000 }]);
  });

  it('regla 8: avance en efectivo', () => {
    const h = cardHealth(input({ purchases: [buy({ isCashAdvance: true, amount: 500_000, installmentsCount: 6, withInterest: true })] }));
    expect(h.alerts.find((x) => x.kind === 'avance')!.body).toMatch(/la deuda solo se movió/);
  });

  it('regla 9: cuota de manejo con poco uso', () => {
    const h = cardHealth(input({ statements: [stmt({ handlingFee: 18_900 })] }));
    expect(h.alerts.find((x) => x.kind === 'cuota_manejo')!.amount).toBe(226_800);
  });

  it('regla 10: uso total si la cerraras', () => {
    const h = cardHealth(input({ usedAmount: 0, otherCards: [{ creditLimit: 2_000_000, used: 1_000_000 }] }));
    expect(h.ifClosed!.totalUtilizationIfClosed).toBe(0.5);
    expect(h.ifClosed!.totalUtilizationNow!).toBeCloseTo(1_000_000 / 7_600_000);
  });

  it('regla 11: recordatorio a 5 días sin pago registrado; con pago, silencio', () => {
    const now = d('2026-10-10');
    expect(kinds(cardHealth(input({ now })))).toContain('pago_cerca');
    expect(kinds(cardHealth(input({ now, payments: [{ date: d('2026-10-05'), amount: 700_000 }] })))).not.toContain('pago_cerca');
    expect(kinds(cardHealth(input({ now: d('2026-10-04') })))).not.toContain('pago_cerca');
  });

  it('regla 12: ciclo 25 % sobre el promedio → resumen por categoría', () => {
    const h = cardHealth(input({
      statements: [stmt({}), stmt({ closingDate: d('2026-08-28') }), stmt({ closingDate: d('2026-07-28') })],
      purchases: [
        buy({ id: 'a', amount: 600_000, occurredAt: d('2026-10-01'), categoryName: 'Salidas y entretenimiento' }),
        buy({ id: 'b', amount: 200_000, occurredAt: d('2026-10-02'), categoryName: 'Mercado' }),
        buy({ id: 'c', amount: 400_000, occurredAt: d('2026-09-10') }),
        buy({ id: 'd', amount: 400_000, occurredAt: d('2026-08-10') }),
      ],
    }));
    expect(h.cycle!.spent).toBe(800_000);
    expect(h.cycle!.average).toBe(400_000);
    expect(h.cycle!.byCategory[0].name).toBe('Salidas y entretenimiento');
    expect(kinds(h)).toContain('ciclo_alto');
  });

  it('sin marcas ni la palabra exceso en ningún texto', () => {
    const h = cardHealth(input({
      usedAmount: 5_300_000,
      allCardsCuota: 1_500_000,
      statements: [stmt({ handlingFee: 20_000 })],
      purchases: [buy({ installmentsCount: 36, withInterest: true, amount: 1_000_000 }), buy({ id: 'z', isCashAdvance: true })],
    }));
    for (const a of h.alerts) expect(`${a.title} ${a.body}`).not.toMatch(/exceso/i);
  });
});
