import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EngineService } from '../src/modules/financial-engine/engine.service';
import { MetricKey } from '../src/modules/financial-engine/engine.constants';

/**
 * FIN-028 · Ciclo de vida de movimientos (DEC-0028) contra app + BD reales:
 *  - editar emite evento → el Motor recalcula (recompute manual = lo que hace el
 *    listener del outbox);
 *  - anular = deletedAt (sin estado nuevo) y desaparece de dashboards/Motor;
 *  - anular un pago de deuda REVIERTE el saldo de la deuda;
 *  - guardarraíl: no se edita monto/fecha de un pago de deuda en sitio.
 *
 * Ejecución: `npm run test:e2e` (requiere el Postgres de docker levantado).
 */
describe('FIN-028 · edición/anulación de movimientos con recálculo', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let engine: EngineService;
  let base: string;
  let token: string;
  let userId: string;

  const req = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      /* sin cuerpo */
    }
    return { status: res.status, data };
  };

  const essential = async () => {
    await engine.recompute(userId);
    const r = await prisma.metricReading.findFirst({
      where: { userId, metricKey: MetricKey.Cashflow, period: 'month' },
      orderBy: { capturedAt: 'desc' },
    });
    return Number(r!.value);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1');
    prisma = app.get(PrismaService);
    engine = app.get(EngineService);

    const reg = await req('POST', '/v1/auth/register', {
      email: `e2e-fin028-${Date.now()}@millo.test`,
      password: 'Passw0rd!e2e',
    });
    token = reg.data.tokens.accessToken;
    userId = reg.data.user.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('editar el monto de un gasto recalcula las métricas persistidas del Motor', async () => {
    const now = new Date().toISOString();
    await req('POST', '/v1/transactions', { kind: 'ingreso', amount: 3_000_000, occurredAt: now });
    const gasto = await req('POST', '/v1/transactions', { kind: 'gasto', amount: 500_000, occurredAt: now });
    expect(gasto.status).toBe(201);
    expect(await essential()).toBeCloseTo(2_500_000, 2);

    const edit = await req('PATCH', `/v1/transactions/${gasto.data.id}`, { amount: 800_000 });
    expect(edit.status).toBe(200);
    expect(await essential()).toBeCloseTo(2_200_000, 2); // 3M − 800k
  });

  it('anular un gasto lo excluye del Motor y lo conserva en BD con deletedAt', async () => {
    const now = new Date().toISOString();
    const g = await req('POST', '/v1/transactions', { kind: 'gasto', amount: 200_000, occurredAt: now });
    const before = await essential();
    const del = await req('DELETE', `/v1/transactions/${g.data.id}`);
    expect(del.status).toBe(200);
    expect(await essential()).toBeCloseTo(before + 200_000, 2); // el gasto desapareció

    const row = await prisma.transaction.findUnique({ where: { id: g.data.id } });
    expect(row).not.toBeNull(); // sigue en BD
    expect(row!.deletedAt).not.toBeNull(); // anulado por deletedAt (sin estado nuevo)
    expect(row!.status).toBe('confirmada'); // NO se inventó un estado 'anulada'
  });

  it('anular un pago de deuda REVIERTE el saldo de la deuda', async () => {
    const debt = await req('POST', '/v1/debts', {
      name: 'E2E deuda anulación',
      debtType: 'libre_inversion',
      originalAmount: 2_000_000,
      currentBalance: 2_000_000,
      startDate: '2026-06-15',
      termMonths: 12,
      interestRate: 18,
      rateBasis: 'EA',
    });
    const debtId = debt.data.debt.id;
    const pago = await req('POST', '/v1/transactions', {
      kind: 'pago_deuda',
      amount: 300_000,
      occurredAt: new Date().toISOString(),
      debtId,
    });
    expect(pago.status).toBe(201);
    let d = await prisma.debt.findUnique({ where: { id: debtId } });
    expect(Number(d!.currentBalance)).toBeCloseTo(1_700_000, 2);

    const del = await req('DELETE', `/v1/transactions/${pago.data.id}`);
    expect(del.status).toBe(200);
    d = await prisma.debt.findUnique({ where: { id: debtId } });
    expect(Number(d!.currentBalance)).toBeCloseTo(2_000_000, 2); // saldo restaurado
  });

  it('guardarraíl: editar el monto de un pago de deuda en sitio → 400', async () => {
    const debt = await req('POST', '/v1/debts', {
      name: 'E2E deuda guardarraíl',
      debtType: 'libre_inversion',
      originalAmount: 1_000_000,
      currentBalance: 1_000_000,
      startDate: '2026-06-15',
      termMonths: 12,
      interestRate: 18,
      rateBasis: 'EA',
    });
    const pago = await req('POST', '/v1/transactions', {
      kind: 'pago_deuda',
      amount: 100_000,
      occurredAt: new Date().toISOString(),
      debtId: debt.data.debt.id,
    });
    const badAmount = await req('PATCH', `/v1/transactions/${pago.data.id}`, { amount: 150_000 });
    expect(badAmount.status).toBe(400);
    // Pero un campo neutro (nota) SÍ se puede editar.
    const okNote = await req('PATCH', `/v1/transactions/${pago.data.id}`, { note: 'cuota de julio' });
    expect(okNote.status).toBe(200);
  });
});
