import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EngineService } from '../src/modules/financial-engine/engine.service';
import { MetricKey } from '../src/modules/financial-engine/engine.constants';

/**
 * FIN-023 · Desembolso real como "lo comprometido" (§32, DEC-0023).
 *
 * Caso a mano del ARQ §13.2 contra app+BD reales: cuota + seguro aparte 45k +
 * cuota de manejo aparte 30k ⇒ los 75k aparecen en el gasto esencial PERSISTIDO
 * del Motor (la fuente que leen Recomendaciones — orden Motor→Recs, DEC §5.3),
 * en Presupuesto y en el summary de Deudas. Además: rechazo de endoso en
 * cuota_manejo (DEC §5.1) y regresión sin cargos.
 *
 * Ejecución: `npm run test:e2e` (requiere el Postgres de docker levantado).
 */
describe('FIN-023 · desembolso real único en Motor, Presupuesto y Deudas (§32)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let base: string;
  let token: string;
  let userId: string;
  let debtId: string;
  let cuota: number;

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

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1');
    prisma = app.get(PrismaService);

    const reg = await req('POST', '/v1/auth/register', {
      email: `e2e-fin023-outlay-${Date.now()}@millo.test`,
      password: 'Passw0rd!e2e',
    });
    token = reg.data.tokens.accessToken;
    userId = reg.data.user.id;

    const fixed = await req('POST', '/v1/budget/fixed-items', {
      kind: 'gasto',
      name: 'Fijos e2e',
      amount: 1_000_000,
      dayOfMonth: 5,
    });
    expect(fixed.status).toBe(201);

    const d = await req('POST', '/v1/debts', {
      name: 'Tarjeta e2e',
      debtType: 'tarjeta_credito',
      originalAmount: 5_000_000,
      currentBalance: 5_000_000,
      startDate: '2026-06-15',
      termMonths: 24,
      interestRate: 28,
      rateBasis: 'EA',
    });
    expect(d.status).toBe(201);
    debtId = d.data.debt.id;
    cuota = Number(d.data.debt.monthlyPayment);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('DEC §5.1: cuota de manejo endosada → 400; válida (aparte) → 201', async () => {
    const bad = await req('POST', `/v1/debts/${debtId}/insurances`, {
      kind: 'cuota_manejo',
      name: 'Cuota de manejo',
      monthlyPremium: 30_000,
      financed: false,
      endorsed: true,
    });
    expect(bad.status).toBe(400);

    const seguro = await req('POST', `/v1/debts/${debtId}/insurances`, {
      kind: 'vida_deudor',
      name: 'Seguro de vida (aparte)',
      monthlyPremium: 45_000,
      financed: false,
    });
    expect(seguro.status).toBe(201);
    const cargo = await req('POST', `/v1/debts/${debtId}/insurances`, {
      kind: 'cuota_manejo',
      name: 'Cuota de manejo',
      monthlyPremium: 30_000,
      financed: false,
    });
    expect(cargo.status).toBe(201);
  });

  it('Motor: el gasto esencial PERSISTIDO incluye los 75k (la fuente de Recomendaciones)', async () => {
    await app.get(EngineService).recompute(userId);
    const reading = await prisma.metricReading.findFirst({
      where: { userId, metricKey: MetricKey.EssentialExpense, period: 'month' },
      orderBy: { capturedAt: 'desc' },
    });
    expect(Number(reading!.value)).toBeCloseTo(1_000_000 + cuota + 75_000, 2);
  });

  it('Presupuesto: lo comprometido con deudas es el desembolso real', async () => {
    const { data } = await req('GET', '/v1/budget/monthly');
    expect(data.debtPayments).toBeCloseTo(cuota + 75_000, 2);
    expect(data.debtChargesSeparate).toBe(75_000);
    expect(data.debts[0].amount).toBeCloseTo(cuota + 75_000, 2);
  });

  it('Deudas: el summary expone ambas verdades (contrato y desembolso)', async () => {
    const { data } = await req('GET', '/v1/debts/summary');
    expect(data.monthlyPaymentsTotal).toBeCloseTo(cuota, 2); // contrato (FIN-022)
    expect(data.totalMonthlyOutlay).toBeCloseTo(cuota + 75_000, 2); // real (FIN-023)
  });

  it('regresión: usuario sin cargos aparte — desembolso === cuota en todas partes', async () => {
    const reg2 = await req('POST', '/v1/auth/register', {
      email: `e2e-fin023-regresion-${Date.now()}@millo.test`,
      password: 'Passw0rd!e2e',
    });
    const token2 = reg2.data.tokens.accessToken;
    const req2 = (method: string, path: string, body?: unknown) =>
      fetch(`${base}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token2}` },
        body: body ? JSON.stringify(body) : undefined,
      }).then(async (r) => ({ status: r.status, data: await r.json() }));

    const d = await req2('POST', '/v1/debts', {
      name: 'Sin cargos e2e',
      debtType: 'libre_inversion',
      originalAmount: 3_000_000,
      currentBalance: 3_000_000,
      startDate: '2026-06-15',
      termMonths: 12,
      interestRate: 18,
      rateBasis: 'EA',
    });
    const cuota2 = Number(d.data.debt.monthlyPayment);
    const summary = await req2('GET', '/v1/debts/summary');
    expect(summary.data.totalMonthlyOutlay).toBeCloseTo(cuota2, 2);
    expect(summary.data.totalMonthlyOutlay).toBeCloseTo(summary.data.monthlyPaymentsTotal, 2);
    const budget = await req2('GET', '/v1/budget/monthly');
    expect(budget.data.debtChargesSeparate).toBe(0);
    expect(budget.data.debtPayments).toBeCloseTo(cuota2, 2);
  });
});
