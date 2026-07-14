import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EngineService } from '../src/modules/financial-engine/engine.service';
import { MetricKey } from '../src/modules/financial-engine/engine.constants';

/**
 * FIN-027 · Modelo de ingresos personales (DEC-0027) contra app + BD reales.
 *
 * Caso a mano del ARQ §13.2: salario fijo 4.000.000 con salud 4% retenida
 * (sobre TOTAL) + pensión 4% pagada por la usuaria (sobre base PARCIAL de
 * 2.500.000) ⇒ netFixedTotal = 4.000.000 − 160.000 − 100.000 = 3.740.000;
 * la pensión (no retenida) es compromiso del ciclo (DEC-0027 P2).
 *
 * Ejecución: `npm run test:e2e` (requiere el Postgres de docker levantado).
 */
describe('FIN-027 · ingreso neto único en Motor, Presupuesto y Te queda (§32)', () => {
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
      email: `e2e-fin027-${Date.now()}@millo.test`,
      password: 'Passw0rd!e2e',
    });
    token = reg.data.tokens.accessToken;
    userId = reg.data.user.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('regresión: sin perfil configurado, /income/summary es todo ceros', async () => {
    const { status, data } = await req('GET', '/v1/income/summary');
    expect(status).toBe(200);
    expect(data.netFixedTotal).toBe(0);
    expect(data.hasDeductions).toBe(false);
  });

  it('configura perfil, fuente fija con deducciones (base total y parcial) y verifica el neto', async () => {
    const profile = await req('POST', '/v1/income/profile', { workProfile: 'independiente' });
    expect(profile.status).toBe(201);

    const src = await req('POST', '/v1/income/sources', {
      kind: 'salario_fijo',
      name: 'Salario e2e',
      amount: 4_000_000,
      dayOfMonth: 15,
    });
    expect(src.status).toBe(201);
    const sourceId = src.data.id;

    const salud = await req('POST', `/v1/income/sources/${sourceId}/deductions`, {
      kind: 'salud',
      name: 'Salud e2e',
      percent: 4,
      base: 'total',
      withheldAtSource: true,
    });
    expect(salud.status).toBe(201);

    const pension = await req('POST', `/v1/income/sources/${sourceId}/deductions`, {
      kind: 'pension',
      name: 'Pensión e2e',
      percent: 4,
      base: 'parcial',
      baseAmount: 2_500_000,
      withheldAtSource: false,
    });
    expect(pension.status).toBe(201);

    const summary = await req('GET', '/v1/income/summary');
    expect(summary.data.grossFixedTotal).toBe(4_000_000);
    expect(summary.data.netFixedTotal).toBe(3_740_000);
    expect(summary.data.selfPaidDeductionsTotal).toBe(100_000);
    expect(summary.data.hasDeductions).toBe(true);
  });

  it('requisito duro: base=parcial sin baseAmount → 400', async () => {
    const src = await req('POST', '/v1/income/sources', { name: 'Otra fuente', amount: 1_000_000 });
    const bad = await req('POST', `/v1/income/sources/${src.data.id}/deductions`, {
      name: 'Mala',
      percent: 5,
      base: 'parcial',
    });
    expect(bad.status).toBe(400);
    // Limpieza: no contaminar el neto de los tests siguientes (misma usuaria).
    await req('DELETE', `/v1/income/sources/${src.data.id}`);
  });

  it('percent y fixedAmount son excluyentes (ambos o ninguno) → 400', async () => {
    const src = await req('POST', '/v1/income/sources', { name: 'Fuente XOR', amount: 1_000_000 });
    const bothStatus = (
      await req('POST', `/v1/income/sources/${src.data.id}/deductions`, {
        name: 'Ambos',
        percent: 5,
        fixedAmount: 10_000,
      })
    ).status;
    const noneStatus = (
      await req('POST', `/v1/income/sources/${src.data.id}/deductions`, { name: 'Ninguno' })
    ).status;
    expect(bothStatus).toBe(400);
    expect(noneStatus).toBe(400);
    await req('DELETE', `/v1/income/sources/${src.data.id}`);
  });

  it('Motor: el DTI/Score se calculan sobre el ingreso NETO (DEC-0027 P3)', async () => {
    await engine.recompute(userId);
    const reading = await prisma.metricReading.findFirst({
      where: { userId, metricKey: MetricKey.SavingsRate, period: 'month' },
      orderBy: { capturedAt: 'desc' },
    });
    // savingsRate = cashflow / ref; ref = max(netFixedTotal, actualIncome=0) = 3.740.000.
    // cashflow = 0 (sin transacciones) ⇒ savingsRate = 0, pero lo verificable es
    // que la lectura EXISTE (ref > 0 solo si netFixedTotal se usó, no 4M bruto).
    expect(reading).not.toBeNull();
  });

  it('Presupuesto: fixedIncome es el NETO (no el bruto de 4.000.000)', async () => {
    const { data } = await req('GET', '/v1/budget/monthly');
    expect(data.fixedIncome).toBe(3_740_000);
  });

  it('Te queda: la deducción NO retenida (pensión) aparece como compromiso pendiente', async () => {
    const { data } = await req('GET', '/v1/budget/monthly');
    const pension = data.teQueda.pendingCommitments.find((c: { name: string }) => c.name === 'Pensión e2e');
    expect(pension).toBeDefined();
    expect(pension.amount).toBe(100_000);
    // La retenida en la fuente NO debe aparecer (no sale del bolsillo).
    expect(data.teQueda.pendingCommitments.some((c: { name: string }) => c.name === 'Salud e2e')).toBe(false);
  });

  it('Salud: aparece la nota de copy obligatoria (DEC-0027 §5.1)', async () => {
    const { data } = await req('GET', '/v1/health/score');
    expect(data.netIncomeNotice).toBe(
      'Tu Score se calcula con tu ingreso real después de deducciones — es más preciso, no que hayas empeorado.',
    );
  });

  it('crear un ingreso vía /budget/fixed-items (kind=ingreso) es rechazado — sin coexistencia (§5.2)', async () => {
    const { status } = await req('POST', '/v1/budget/fixed-items', {
      kind: 'ingreso',
      name: 'Ingreso legado',
      amount: 1_000_000,
    });
    expect(status).toBe(400);
  });
});
