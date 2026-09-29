import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

/**
 * FIN-043 (BT-018/BT-019) · Un pago a una tarjeta se aplica a sus cuotas pendientes en
 * orden; anularlo las devuelve; la lista y el resumen muestran saldo y cuota reales.
 *
 * Ejecución: `npm run test:e2e` (Postgres real).
 */
describe('FIN-043 · Pagos de tarjeta aplicados a cuotas', () => {
  let app: INestApplication;
  let base: string;
  let token = '';
  let cardId = '';
  const email = `e2e-fin043-${Date.now()}@millo.test`;

  const req = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
    base = await app.getUrl();
    base = base.replace('[::1]', '127.0.0.1');

    const reg = await req('POST', '/v1/auth/register', { email, password: 'Passw0rd!e2e', acceptsDataPolicy: true });
    token = reg.data.tokens.accessToken;
    const card = await req('POST', '/v1/debts', {
      name: 'Tarjeta e2e',
      debtType: 'tarjeta_credito',
      originalAmount: 0,
      currentBalance: 0,
      startDate: '2026-09-01',
      interestRate: 28,
      rateBasis: 'EA',
      creditLimit: 3_000_000,
      paymentDay: 15,
    });
    expect(card.status).toBe(201);
    cardId = card.data.debt.id;
    // Saldo del extracto: 1.200.000 en 4 cuotas de 300.000 (como lo crea FIN-042).
    const p = await req('POST', `/v1/debts/cards/${cardId}/purchases`, { amount: 1_200_000, installments: 4, withInterest: false, note: 'Saldo del extracto' });
    expect(p.status).toBe(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('BT-016/BT-019: la lista y el resumen muestran saldo usado y cuota del mes de la tarjeta', async () => {
    const list = await req('GET', '/v1/debts');
    const row = list.data.find((d: { id: string }) => d.id === cardId);
    expect(Number(row.currentBalance)).toBe(1_200_000);
    expect(Number(row.monthlyPayment)).toBe(300_000);
    const summary = await req('GET', '/v1/debts/summary');
    expect(summary.data.totalDebt).toBe(1_200_000);
    expect(summary.data.monthlyPaymentsTotal).toBe(300_000);
  });

  it('BT-021: el patrimonio resta el saldo real de la tarjeta (no el 0 guardado)', async () => {
    const nw = await req('GET', '/v1/net-worth');
    expect(nw.data.totalLiabilities).toBe(1_200_000);
    expect(nw.data.netWorth).toBe(-1_200_000);
  });

  it('un pago parcial (450.000) salda la 1ª cuota y deja la 2ª en 150.000; el saldo baja', async () => {
    const pay = await req('POST', '/v1/transactions', { kind: 'pago_deuda', amount: 450_000, occurredAt: '2026-09-28T12:00:00Z', debtId: cardId });
    expect(pay.status).toBe(201);
    const s = await req('GET', `/v1/debts/cards/${cardId}`);
    expect(s.data.usedAmount).toBe(750_000);
    expect(s.data.purchases[0].paidInstallments).toBe(2); // la cuota 1 y la parte separada de la 2
    const debt = await req('GET', `/v1/debts/${cardId}`);
    expect(debt.data.status ?? debt.data.debt?.status ?? 'activa').not.toBe('pagada');
  });

  it('anular ese pago restaura las cuotas y el saldo exactamente', async () => {
    const txs = await req('GET', '/v1/transactions?kind=pago_deuda');
    const pay = txs.data.find((t: { debtId: string }) => t.debtId === cardId);
    const del = await req('DELETE', `/v1/transactions/${pay.id}`);
    expect(del.status).toBe(200);
    const s = await req('GET', `/v1/debts/cards/${cardId}`);
    expect(s.data.usedAmount).toBe(1_200_000);
    expect(s.data.purchases[0].paidInstallments).toBe(0);
  });

  it('pagar más de lo que se debe salda todo sin inventar saldo negativo', async () => {
    const pay = await req('POST', '/v1/transactions', { kind: 'pago_deuda', amount: 5_000_000, occurredAt: '2026-09-28T12:00:00Z', debtId: cardId });
    expect(pay.status).toBe(201);
    const s = await req('GET', `/v1/debts/cards/${cardId}`);
    expect(s.data.usedAmount).toBe(0);
    expect(s.data.availableCredit).toBe(3_000_000);
  });

  it('cambiar el número de cuotas reparte el saldo pendiente (caso: saldo de extracto en 1 cuota)', async () => {
    const p = await req('POST', `/v1/debts/cards/${cardId}/purchases`, { amount: 1_600_000, installments: 1, note: 'Saldo del extracto' });
    const purchaseId = p.data.purchase.id;
    const r = await req('POST', `/v1/debts/cards/purchases/${purchaseId}/resplit`, { installments: 16 });
    expect(r.status).toBe(201);
    const row = r.data.purchases.find((x: { id: string }) => x.id === purchaseId);
    expect(row.installmentsCount).toBe(16);
    expect(row.pendingBalance).toBe(1_600_000);
    const list = await req('GET', '/v1/debts');
    const card = list.data.find((d: { id: string }) => d.id === cardId);
    expect(Number(card.monthlyPayment)).toBe(100_000);
    const bad = await req('POST', `/v1/debts/cards/purchases/${purchaseId}/resplit`, { installments: 0 });
    expect(bad.status).toBe(400);
  });

  it('el abono a capital no aplica a tarjetas: mensaje honesto', async () => {
    const r = await req('POST', `/v1/debts/${cardId}/prepay`, { amount: 100_000, effect: 'reducir_plazo' });
    expect(r.status).toBe(400);
    expect(String(r.data.message)).toContain('tarjeta');
  });
});
