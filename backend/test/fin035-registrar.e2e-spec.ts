import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

/**
 * FIN-035 (DEC-0035) · Registrar es otra puerta al MISMO motor. Estos tests
 * ejercitan los endpoints que el flujo guiado invoca —los mismos que usa el bot y
 * cualquier módulo (obs. 8)— y verifican el patrón de confirmación decidido:
 * commit + acuse + DESHACER, donde deshacer revierte reusando `transactions.remove`
 * (el camino de `undoLast`) / `voidPurchase` (tarjeta, FIN-031) y el Motor recomputa
 * — NUNCA vía `sourceTransactionId` (reservado/null). "Flujo disponible" = teQueda
 * (SpendableService), no un número nuevo (§32).
 *
 * Ejecución: `npm run test:e2e` (requiere el Postgres de docker levantado).
 */
describe('FIN-035 · Registrar como puerta única (§42 cascada, §32)', () => {
  let app: INestApplication;
  let base: string;
  let token: string;

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

  const teQueda = async () => (await req('GET', '/v1/budget/monthly')).data.teQueda.amount as number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1');

    const reg = await req('POST', '/v1/auth/register', {
      email: `e2e-fin035-${Date.now()}@millo.test`,
      password: 'Passw0rd!e2e',
    });
    token = reg.data.tokens.accessToken;
    // Un ingreso para que "Te queda" sea significativo.
    await req('POST', '/v1/income/sources', { name: 'Salario', amount: 3_000_000 });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('§42 · un gasto mueve "Te queda" (SpendableService) y DESHACER lo revierte por el Motor', async () => {
    const before = await teQueda();
    const tx = await req('POST', '/v1/transactions', { kind: 'gasto', amount: 200_000, occurredAt: new Date().toISOString() });
    expect(tx.status).toBe(201);
    const mid = await teQueda();
    expect(mid).toBe(before - 200_000); // "flujo disponible" = teQueda, no un número nuevo (§32)
    // Deshacer = el MISMO camino que undoLast del bot (transactions.remove).
    const del = await req('DELETE', `/v1/transactions/${tx.data.id}`);
    expect(del.status).toBe(200);
    expect(await teQueda()).toBe(before); // todo volvió (recompute real, no sourceTransactionId)
  });

  it('§42 · un pago de deuda baja el saldo (obligación) y DESHACER lo restaura', async () => {
    const d = await req('POST', '/v1/debts', {
      name: 'Crédito', debtType: 'credito_personal', originalAmount: 2_000_000,
      currentBalance: 2_000_000, startDate: '2026-06-15', termMonths: 24, interestRate: 20, rateBasis: 'EA',
    });
    const debtId = d.data.debt.id;
    const pay = await req('POST', '/v1/transactions', { kind: 'pago_deuda', amount: 500_000, occurredAt: new Date().toISOString(), debtId });
    expect(pay.status).toBe(201);
    expect(Number((await req('GET', `/v1/debts/${debtId}`)).data.currentBalance)).toBe(1_500_000);
    await req('DELETE', `/v1/transactions/${pay.data.id}`);
    expect(Number((await req('GET', `/v1/debts/${debtId}`)).data.currentBalance)).toBe(2_000_000);
  });

  it('§42 · gasto con crédito = compra a cuotas (FIN-031): compromiso aparece y voidPurchase lo revierte', async () => {
    const card = await req('POST', '/v1/debts', {
      name: 'Tarjeta', debtType: 'tarjeta_credito', originalAmount: 0, currentBalance: 0,
      startDate: '2026-06-15', termMonths: 24, interestRate: 28, rateBasis: 'EA', creditLimit: 3_000_000,
    });
    const cardId = card.data.debt.id;
    const purchase = await req('POST', `/v1/debts/cards/${cardId}/purchases`, { amount: 600_000, installments: 3 });
    expect(purchase.status).toBe(201);
    // El compromiso de la próxima cuota entra en el presupuesto (autoridad única §32).
    let budget = (await req('GET', '/v1/budget/monthly')).data;
    expect(budget.debts.find((x: { debtId: string }) => x.debtId === cardId)?.amount).toBe(200_000);
    // Deshacer una compra sin cuotas pagadas = voidPurchase (política FIN-031), no transactions.remove.
    const summary = await req('GET', `/v1/debts/cards/${cardId}`);
    await req('DELETE', `/v1/debts/cards/purchases/${summary.data.purchases[0].id}`);
    budget = (await req('GET', '/v1/budget/monthly')).data;
    expect(budget.debts.find((x: { debtId: string }) => x.debtId === cardId)?.amount ?? 0).toBe(0);
  });

  it('coherencia (obs. 8): dos gastos idénticos por el mismo `create` mueven "Te queda" igual', async () => {
    const before = await teQueda();
    const a = await req('POST', '/v1/transactions', { kind: 'gasto', amount: 100_000, occurredAt: new Date().toISOString() });
    const afterA = await teQueda();
    const b = await req('POST', '/v1/transactions', { kind: 'gasto', amount: 100_000, occurredAt: new Date().toISOString() });
    const afterB = await teQueda();
    // Mismo motor, mismo efecto: cada gasto resta lo mismo, venga de donde venga.
    expect(before - afterA).toBe(100_000);
    expect(afterA - afterB).toBe(100_000);
    await req('DELETE', `/v1/transactions/${a.data.id}`);
    await req('DELETE', `/v1/transactions/${b.data.id}`);
    expect(await teQueda()).toBe(before);
  });
});
