import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

/**
 * FIN-061 Fase 2 (Fundador, "Apruebo todo", 2026-10-04): esencial y gustos, análisis de
 * consumo, salud de la tarjeta y plata del año, de punta a punta por la API.
 */
describe('FIN-061 · Fase 2 · Gustos, tarjetas y plata del año', () => {
  let app: INestApplication;
  let base: string;
  let token = '';
  let cardId = '';
  const req = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data: any = null;
    try { data = await res.json(); } catch { /* sin cuerpo */ }
    return { status: res.status, data };
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1');
    const r = await fetch(`${base}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `e2e-fin061f2-${Date.now()}@millo.test`, password: 'Passw0rd!e2e', fullName: 'Fase Dos', acceptsDataPolicy: true }),
    });
    token = (await r.json()).tokens.accessToken;

    const income = await req('POST', '/v1/income/sources', { kind: 'salario_fijo', name: 'Salario', amount: 5_000_000, dayOfMonth: 30, receivesPrima: true });
    expect(income.status).toBe(201);
    expect(income.data.receivesPrima).toBe(true);
    const card = await req('POST', '/v1/debts', {
      name: 'Tarjeta e2e', debtType: 'tarjeta_credito', originalAmount: 0, currentBalance: 0,
      startDate: '2026-06-15', interestRate: 28.59, rateBasis: 'EA', creditLimit: 5_600_000,
    });
    expect(card.status).toBe(201);
    cardId = card.data.debt.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('2.2 · categorías nuevas y clasificación sugerida, editable y protegida', async () => {
    const list = await req('GET', '/v1/spending/classes');
    expect(list.status).toBe(200);
    const by = (n: string) => list.data.find((c: any) => c.name === n);
    expect(by('Domicilios').spendClass).toBe('gusto');
    expect(by('Café y antojos').spendClass).toBe('gusto');
    expect(by('Mercado').spendClass).toBe('esencial');
    expect(by('Comida').spendClass).toBe('mixto');

    const u = await req('PATCH', `/v1/spending/classes/${by('Comida').categoryId}`, { spendClass: 'esencial' });
    expect(u.status).toBe(200);
    expect(u.data).toMatchObject({ spendClass: 'esencial', suggested: 'mixto', protected: false });
    const keep = await req('PATCH', `/v1/spending/classes/${by('Salidas y entretenimiento').categoryId}`, { protected: true, monthlyCap: 200_000 });
    expect(keep.data).toMatchObject({ spendClass: 'gusto', protected: true, monthlyCap: 200_000 });
    const back = await req('PATCH', `/v1/spending/classes/${by('Comida').categoryId}`, { spendClass: null });
    expect(back.data.spendClass).toBe('mixto');
    const bad = await req('PATCH', `/v1/spending/classes/${by('Comida').categoryId}`, { spendClass: 'lujo' });
    expect(bad.status).toBe(400);
  });

  it('2.3 · análisis de consumo: responde con banda, categorías y máximo 2 sugerencias', async () => {
    const classes = (await req('GET', '/v1/spending/classes')).data;
    const dom = classes.find((c: any) => c.name === 'Domicilios').categoryId;
    const now = new Date();
    for (let i = 1; i <= 3; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 10)).toISOString();
      await req('POST', '/v1/transactions', { kind: 'gasto', amount: 60_000, occurredAt: d, categoryId: dom });
    }
    await req('POST', '/v1/transactions', { kind: 'gasto', amount: 70_000, occurredAt: now.toISOString(), categoryId: dom });
    const a = await req('GET', '/v1/spending/consumption');
    expect(a.status).toBe(200);
    expect(a.data.incomeBase).toBeGreaterThan(0);
    expect(['tranquilo', 'atencion', 'alto']).toContain(a.data.gustos.band);
    const d = a.data.categories.find((c: any) => c.name === 'Domicilios');
    expect(d.typicalAmount).toBe(60_000);
    expect(d.amount).toBe(70_000);
    expect(a.data.suggestions.length).toBeLessThanOrEqual(2);
    expect(JSON.stringify(a.data)).not.toMatch(/exceso/i);
  });

  it('2.4 · extracto, compra con categoría y avance, y salud de la tarjeta', async () => {
    const classes = (await req('GET', '/v1/spending/classes')).data;
    const mercado = classes.find((c: any) => c.name === 'Mercado').categoryId;
    const p = await req('POST', `/v1/debts/cards/${cardId}/purchases`, { amount: 180_000, installments: 12, withInterest: true, categoryId: mercado });
    expect(p.status).toBe(201);
    expect(p.data.purchase.categoryId).toBe(mercado);
    const adv = await req('POST', `/v1/debts/cards/${cardId}/purchases`, { amount: 500_000, installments: 1, isCashAdvance: true });
    expect(adv.data.purchase.isCashAdvance).toBe(true);
    expect(adv.data.purchase.withInterest).toBe(true);

    const closing = new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10);
    const due = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const s = await req('POST', `/v1/debts/cards/${cardId}/statements`, {
      closingDate: closing, dueDate: due, statementBalance: 4_180_000, minimumPayment: 331_918, totalPayment: 4_180_000, creditLimit: 5_600_000, handlingFee: 18_900,
    });
    expect(s.status).toBe(201);
    // Corregir el mismo corte no duplica.
    await req('POST', `/v1/debts/cards/${cardId}/statements`, { closingDate: closing, dueDate: due, statementBalance: 4_200_000, minimumPayment: 331_918 });
    const list = await req('GET', `/v1/debts/cards/${cardId}/statements`);
    expect(list.data).toHaveLength(1);
    expect(list.data[0].statementBalance).toBe(4_200_000);

    const h = await req('GET', `/v1/debts/cards/${cardId}/health`);
    expect(h.status).toBe(200);
    expect(h.data.payment.minimum).toBe(331_918);
    expect(h.data.payment.suggested).toBeGreaterThanOrEqual(331_918);
    expect(h.data.payment.dueDate).toBe(due);
    const kinds = h.data.alerts.map((a: any) => a.kind);
    expect(kinds).toContain('compra_pequena_cuotas');
    expect(kinds).toContain('avance');
    const bad = await req('POST', `/v1/debts/cards/${cardId}/statements`, { closingDate: closing, dueDate: '2020-01-01', statementBalance: 1 });
    expect(bad.status).toBe(400);
  });

  it('2.5 · gastos grandes del año, plata extra y colchón por escalones', async () => {
    const soat = await req('POST', '/v1/plan/annual-expenses', { name: 'SOAT', amount: 620_000, month: 3 });
    expect(soat.status).toBe(201);
    const annual = await req('GET', '/v1/plan/annual-expenses');
    expect(annual.data.items[0].monthly).toBeGreaterThan(0);
    expect(annual.data.monthlyTotal).toBe(annual.data.items[0].monthly);
    expect((await req('POST', '/v1/plan/annual-expenses', { name: 'X', amount: 1, month: 13 })).status).toBe(400);

    const plan = await req('GET', '/v1/debts/cashflow-plan');
    expect(plan.status).toBe(200);
    expect(plan.data.margin.annualSetAside).toBe(annual.data.monthlyTotal);

    const w = await req('GET', '/v1/plan/windfalls');
    expect(w.data).toHaveLength(3);
    const junio = w.data.find((x: any) => x.kind === 'prima_junio');
    expect(junio.estimated).toBe(2_500_000);
    expect(junio).toMatchObject({ debtPct: 60, cushionPct: 20, freePct: 20, custom: false });
    expect(junio.toDebt + junio.toCushion + junio.free).toBe(2_500_000);
    expect(w.data.find((x: any) => x.kind === 'intereses_cesantias').estimated).toBeNull();

    const set = await req('PUT', '/v1/plan/windfalls/prima_diciembre', { debtPct: 50, cushionPct: 30, freePct: 20 });
    expect(set.status).toBe(200);
    expect(set.data).toMatchObject({ debtPct: 50, custom: true });
    expect((await req('PUT', '/v1/plan/windfalls/prima_diciembre', { debtPct: 50, cushionPct: 30, freePct: 30 })).status).toBe(400);

    await req('POST', '/v1/accounts', { name: 'Colchón', type: 'ahorros', currentBalance: 300_000, isEmergencyFund: true });
    const c = await req('GET', '/v1/plan/cushion');
    expect(c.status).toBe(200);
    expect(c.data.incomeKind).toBe('asalariado_con_prima');
    expect(c.data.tiers.map((t: any) => t.months)).toEqual([1, 3]);
    expect(c.data.saved).toBe(300_000);
    const solo = await req('GET', '/v1/plan/cushion?onlyIncome=true');
    expect(solo.data.tiers.map((t: any) => t.months)).toEqual([1, 3, 6]);
  });
});
