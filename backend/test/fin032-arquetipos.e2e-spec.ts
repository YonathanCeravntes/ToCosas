import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

/**
 * FIN-032 · La condición de cierre de DEC-0030 §6 / DEC-0032 §3.5: la MISMA espina
 * representa los 4 arquetipos estructuralmente divergentes —libranza, hipoteca,
 * gota a gota, compra a cuotas— con sus números núcleo correctos y SIN una rama
 * ad-hoc. El propio test no puede special-casear: los 4 corren por el mismo
 * `POST /debts` → `GET /debts/:id` → `GET /budget/monthly`, y solo cambian sus
 * DATOS (según el descriptor). Si los 4 caben, los 11 caben.
 *
 * Ejecución: `npm run test:e2e` (requiere el Postgres de docker levantado).
 */
describe('FIN-032 · los 4 arquetipos por configuración (§32, sin ramas ad-hoc)', () => {
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
    try {
      data = await res.json();
    } catch {
      /* sin cuerpo */
    }
    return { status: res.status, data };
  };

  const createDebt = (body: Record<string, unknown>) =>
    req('POST', '/v1/debts', { startDate: '2026-06-15', rateBasis: 'EA', ...body });

  const commitmentOf = async (debtId: string) => {
    const { data } = await req('GET', '/v1/budget/monthly');
    return data.debts.find((d: { debtId: string }) => d.debtId === debtId)?.amount ?? null;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1');

    const reg = await req('POST', '/v1/auth/register', {
      email: `e2e-fin032-${Date.now()}@millo.test`,
      password: 'Passw0rd!e2e',
    });
    token = reg.data.tokens.accessToken;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('el catálogo expone los 12 tipos con su alta mínima (guardarraíl A/B)', async () => {
    const { status, data } = await req('GET', '/v1/debts/catalog');
    expect(status).toBe(200);
    expect(data).toHaveLength(12);
    const libranza = data.find((d: { debtType: string }) => d.debtType === 'libranza');
    expect(libranza.scheduleModel).toBe('amortizado');
    expect(libranza.paymentSource).toBe('nomina');
  });

  it('ARQUETIPO 1 · libranza (amortizado, descuento de nómina): cuota y fecha por el motor', async () => {
    const c = await createDebt({
      name: 'Libranza Fonade', debtType: 'libranza',
      originalAmount: 6_000_000, currentBalance: 6_000_000, termMonths: 12, interestRate: 0,
    });
    expect(c.status).toBe(201);
    const id = c.data.debt.id;
    const { data } = await req('GET', `/v1/debts/${id}`);
    expect(data.scheduleModel).toBe('amortizado');
    // Sin interés, 6.000.000 a 12 → 500.000/mes; fecha de libertad real.
    expect(Math.round(Number(data.monthlyPayment))).toBe(500_000);
    expect(data.projection.payoffDate).not.toBeNull();
    // §32: la cuota es "lo comprometido" por la autoridad única (aparece en presupuesto).
    expect(await commitmentOf(id)).toBe(500_000);
    // DEC-0032 §3.2 · guarda de doble-conteo: la cuota de libranza (paymentSource
    // 'nomina') es compromiso, NUNCA además una deducción del ingreso (FIN-027). Sin
    // fuente de ingreso declarada, las deducciones siguen en 0 — la libranza no inyecta
    // ninguna. (El descriptor es el único que conoce 'nomina'; NetIncomeService no lo lee.)
    const inc = await req('GET', '/v1/income/summary');
    expect(inc.data.hasDeductions).toBe(false);
    expect(inc.data.deductions).toHaveLength(0);
    expect(inc.data.netFixedTotal).toBe(0);
  });

  it('ARQUETIPO 2 · hipoteca (amortizado largo + tasa variable + seguro endosable)', async () => {
    const c = await createDebt({
      name: 'Hipoteca', debtType: 'hipotecario', rateKind: 'variable',
      originalAmount: 120_000_000, currentBalance: 120_000_000, termMonths: 180, interestRate: 12,
    });
    expect(c.status).toBe(201);
    const id = c.data.debt.id;
    const { data } = await req('GET', `/v1/debts/${id}`);
    expect(data.scheduleModel).toBe('amortizado');
    expect(data.capabilities.endorsableInsurance).toBe(true);
    expect(Number(data.monthlyPayment)).toBeGreaterThan(0);
    expect(data.projection.numberOfPayments).toBe(180);
    expect(await commitmentOf(id)).toBeGreaterThan(0);
  });

  it('ARQUETIPO 3 · gota a gota (saldo + cuota pactada): SIN fecha de libertad falsa (§29.2)', async () => {
    const c = await createDebt({
      name: 'Don Efra', debtType: 'gota_a_gota',
      originalAmount: 500_000, currentBalance: 500_000, monthlyPayment: 150_000,
    });
    expect(c.status).toBe(201);
    const id = c.data.debt.id;
    const { data } = await req('GET', `/v1/debts/${id}`);
    expect(data.scheduleModel).toBe('saldo_y_cuota_pactada');
    // La cuota pactada es el compromiso; NO se inventa un cronograma ni una fecha.
    expect(Number(data.monthlyPayment)).toBe(150_000);
    expect(data.projection.payoffDate).toBeNull();
    expect(data.projection.numberOfPayments).toBe(0);
    expect(await commitmentOf(id)).toBe(150_000);
  });

  it('ARQUETIPO 4 · compra a cuotas (diferido sin interés): cuota = monto / N', async () => {
    const c = await createDebt({
      name: 'Nevera Addi', debtType: 'compra_a_cuotas',
      originalAmount: 900_000, currentBalance: 900_000, termMonths: 3, interestRate: 0,
    });
    expect(c.status).toBe(201);
    const id = c.data.debt.id;
    const { data } = await req('GET', `/v1/debts/${id}`);
    expect(data.scheduleModel).toBe('amortizado');
    expect(Math.round(Number(data.monthlyPayment))).toBe(300_000); // 900k / 3
    expect(data.projection.payoffDate).not.toBeNull();
    expect(await commitmentOf(id)).toBe(300_000);
  });

  it('REGRESIÓN · un tipo existente (crédito personal) mantiene su cifra de contrato', async () => {
    const c = await createDebt({
      name: 'Crédito personal', debtType: 'credito_personal',
      originalAmount: 1_200_000, currentBalance: 1_200_000, termMonths: 12, interestRate: 0,
    });
    const id = c.data.debt.id;
    const { data } = await req('GET', `/v1/debts/${id}`);
    expect(data.scheduleModel).toBe('amortizado');
    expect(Math.round(Number(data.monthlyPayment))).toBe(100_000); // idéntico a antes de FIN-032
    expect(data.projection.payoffDate).not.toBeNull();
  });
});
