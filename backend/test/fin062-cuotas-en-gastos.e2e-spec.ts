import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { FixedExpenseService } from '../src/modules/budget/fixed-expense.service';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * FIN-062 (Fundador, 2026-10-04): las cuotas pagadas cuentan en Gastos de Inicio, y una
 * libranza (descuento de nómina) se registra sola el día de pago, una vez por ciclo.
 */
describe('FIN-062 · Cuotas en Gastos y libranza automática', () => {
  let app: INestApplication;
  let base: string;
  let token = '';
  let userId = '';
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
    const r = await req('POST', '/v1/auth/register', { email: `e2e-fin062-${Date.now()}@millo.test`, password: 'Passw0rd!e2e', fullName: 'Libranza', acceptsDataPolicy: true });
    token = r.data.tokens.accessToken;
    userId = r.data.user.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('la libranza se registra sola el día de pago, una sola vez, y suma a Gastos', async () => {
    const d = await req('POST', '/v1/debts', {
      name: 'Libranza e2e', debtType: 'libranza', originalAmount: 20_000_000, currentBalance: 20_000_000,
      startDate: '2026-01-05', termMonths: 60, interestRate: 18, rateBasis: 'EA', paymentDay: 5,
    });
    expect(d.status).toBe(201);
    const debtId = d.data.debt.id;
    const summary = await req('GET', '/v1/debts/summary');
    const up = summary.data.upcoming.find((u: any) => u.debtId === debtId);
    expect(up.payroll).toBe(true);
    expect(up.amount).toBeGreaterThan(0);

    // El día 5 del próximo mes (la deuda ya existía antes de ese día).
    const now = new Date();
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 5, 15));
    const svc = app.get(FixedExpenseService);
    expect(await svc.materialize(userId, day)).toBe(1);
    expect(await svc.materialize(userId, day)).toBe(0); // idempotente
    const prisma = app.get(PrismaService);
    const tx = await prisma.transaction.findFirst({ where: { userId, debtId, kind: 'pago_deuda' } });
    expect(tx?.source).toBe('system');
    expect(Number(tx?.amount)).toBeCloseTo(up.amount, 0);
    // Si la persona la anula, no reaparece ese ciclo.
    await prisma.transaction.update({ where: { id: tx!.id }, data: { deletedAt: new Date() } });
    expect(await svc.materialize(userId, day)).toBe(0);
  });

  it('Gastos de Inicio incluye las cuotas pagadas del ciclo', async () => {
    const card = await req('POST', '/v1/debts', {
      name: 'Tarjeta e2e', debtType: 'tarjeta_credito', originalAmount: 0, currentBalance: 0,
      startDate: '2026-06-15', interestRate: 28, rateBasis: 'EA', creditLimit: 3_000_000,
    });
    await req('POST', `/v1/debts/cards/${card.data.debt.id}/purchases`, { amount: 600_000, installments: 3 });
    await req('POST', '/v1/transactions', { kind: 'gasto', amount: 50_000, occurredAt: new Date().toISOString() });
    const pay = await req('POST', '/v1/transactions', { kind: 'pago_deuda', amount: 200_000, occurredAt: new Date().toISOString(), debtId: card.data.debt.id });
    expect(pay.status).toBe(201);
    const home = await req('GET', '/v1/dashboard/home');
    expect(home.status).toBe(200);
    expect(home.data.expense.debtPaid).toBe(200_000);
    expect(home.data.expense.totalWithPaidDebt).toBe(home.data.expense.total + 200_000);
    const summary = await req('GET', '/v1/debts/summary');
    expect(summary.data.upcoming.find((u: any) => u.debtId === card.data.debt.id)?.isCard).toBe(true);
  });
});
