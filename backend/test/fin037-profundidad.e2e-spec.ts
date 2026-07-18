import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

/**
 * FIN-037 (DEC-0037) · Las lecturas de profundidad contra app + BD reales:
 * el costo real del informal (la semilla del CPSAO) en sus 3 bordes, y el
 * sobrecupo que se activa exactamente al exceder el cupo. Display-only: cero
 * mutación, cero migración, NO toca Registrar.
 *
 * Ejecución: `npm run test:e2e` (requiere el Postgres de docker levantado).
 */
describe('FIN-037 · lecturas de profundidad (§29.2, §32)', () => {
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

  const createDebt = (body: Record<string, unknown>) =>
    req('POST', '/v1/debts', { startDate: '2026-06-15', rateBasis: 'EA', ...body });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1');

    const reg = await req('POST', '/v1/auth/register', {
      email: `e2e-fin037-${Date.now()}@millo.test`,
      password: 'Passw0rd!e2e',
    });
    token = reg.data.tokens.accessToken;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('SEMILLA · gota a gota con tasa: la lectura muestra interés vs capital de la cuota', async () => {
    const c = await createDebt({
      name: 'Don Efra', debtType: 'gota_a_gota',
      originalAmount: 500_000, currentBalance: 500_000, monthlyPayment: 150_000, interestRate: 20,
    });
    const { data } = await req('GET', `/v1/debts/${c.data.debt.id}`);
    expect(data.depthReadings).toHaveLength(1);
    const r = data.depthReadings[0];
    expect(r.kind).toBe('costo_real_informal');
    expect(r.body).toContain('7.655'); // interés del mes (EA 20% sobre 500k)
    expect(r.body).toContain('142.345'); // lo que sí baja la deuda
  });

  it('BORDE brutal · cuota ≤ interés: "el saldo no baja", sin juicio', async () => {
    const c = await createDebt({
      name: 'Gota brutal', debtType: 'gota_a_gota',
      originalAmount: 10_000_000, currentBalance: 10_000_000, monthlyPayment: 150_000, interestRate: 60,
    });
    const { data } = await req('GET', `/v1/debts/${c.data.debt.id}`);
    const r = data.depthReadings[0];
    expect(r.severity).toBe('warning');
    expect(r.body).toContain('el saldo no baja');
    expect(r.body.toLowerCase()).not.toContain('irresponsable'); // §29.2
  });

  it('BORDE sin tasa · invitación honesta, sin cifra inventada', async () => {
    const c = await createDebt({
      name: 'Préstamo de mi mamá', debtType: 'prestamo_familiar',
      originalAmount: 300_000, currentBalance: 300_000, monthlyPayment: 50_000,
    });
    const { data } = await req('GET', `/v1/debts/${c.data.debt.id}`);
    const r = data.depthReadings[0];
    expect(r.body).toContain('decláralo');
    expect(r.body).not.toMatch(/\$\s?\d/);
  });

  it('SOBRECUPO · se activa exactamente al exceder el cupo (derivados FIN-031)', async () => {
    const card = await createDebt({
      name: 'Tarjeta chica', debtType: 'fintech', originalAmount: 0, currentBalance: 0,
      termMonths: 24, interestRate: 32, creditLimit: 500_000,
    });
    const cardId = card.data.debt.id;
    // Dentro del cupo → sin lectura.
    await req('POST', `/v1/debts/cards/${cardId}/purchases`, { amount: 400_000, installments: 2 });
    let detail = await req('GET', `/v1/debts/${cardId}`);
    expect(detail.data.depthReadings).toHaveLength(0);
    // Otra compra lo excede → la lectura aparece con el excedente exacto.
    await req('POST', `/v1/debts/cards/${cardId}/purchases`, { amount: 300_000, installments: 3 });
    detail = await req('GET', `/v1/debts/${cardId}`);
    expect(detail.data.depthReadings).toHaveLength(1);
    expect(detail.data.depthReadings[0].kind).toBe('sobrecupo');
    expect(detail.data.depthReadings[0].body).toContain('200.000'); // 700k − 500k
  });

  it('modalidad sin lecturas (crédito personal) = sin ruido; display-only (cero mutación)', async () => {
    const c = await createDebt({
      name: 'Personal', debtType: 'credito_personal',
      originalAmount: 1_200_000, currentBalance: 1_200_000, termMonths: 12, interestRate: 20,
    });
    const { data } = await req('GET', `/v1/debts/${c.data.debt.id}`);
    expect(data.depthReadings).toHaveLength(0);
    // La lectura no mutó nada: el saldo del informal de la semilla sigue intacto.
    const debts = await req('GET', '/v1/debts');
    const gota = debts.data.find((d: { name: string }) => d.name === 'Don Efra');
    expect(Number(gota.currentBalance)).toBe(500_000);
  });
});
