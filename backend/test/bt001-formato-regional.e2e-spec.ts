import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

/**
 * BT-001 (Beta Técnica) · Un campo numérico con formato regional NO debe producir
 * un 500. El usuario escribió una tasa "15,35" (coma decimal es-CO) y el backend
 * respondía Internal Server Error porque el valor llegaba como 1535 y desbordaba
 * `interest_rate Decimal(7,4)`. El backend ahora normaliza antes de validar
 * (`@NormalizeNumber`) y acota el rango (`@Max`) → 201 con el valor correcto, o
 * 400 claro si el valor es genuinamente fuera de rango. Nunca 500.
 */
describe('BT-001 · formato regional en campos numéricos (sin 500)', () => {
  let app: INestApplication;
  let base: string;
  let token: string;

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

  const debtBody = (interestRate: unknown) => ({
    name: 'Deuda BT-001',
    debtType: 'libre_inversion',
    originalAmount: 5_000_000,
    currentBalance: 5_000_000,
    startDate: '2026-01-15',
    termMonths: 36,
    interestRate,
    rateBasis: 'EA',
  });

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
    const reg = await req('POST', '/v1/auth/register', {
      email: `e2e-bt001-${Date.now()}@millo.test`,
      password: 'Passw0rd!e2e',
    });
    token = reg.data.tokens.accessToken;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('coma decimal "15,35" → 201 y se guarda 15.35 (antes: 500)', async () => {
    const r = await req('POST', '/v1/debts', debtBody('15,35'));
    expect(r.status).toBe(201);
    expect(Number(r.data.debt.interestRate)).toBeCloseTo(15.35, 4);
  });

  it('punto decimal "15.35" → 201 y se guarda 15.35', async () => {
    const r = await req('POST', '/v1/debts', debtBody('15.35'));
    expect(r.status).toBe(201);
    expect(Number(r.data.debt.interestRate)).toBeCloseTo(15.35, 4);
  });

  it('entero como número (compatibilidad) → 201', async () => {
    const r = await req('POST', '/v1/debts', debtBody(20));
    expect(r.status).toBe(201);
    expect(Number(r.data.debt.interestRate)).toBeCloseTo(20, 4);
  });

  it('valor fuera de rango (desbordaría Decimal(7,4)) → 400 claro, NO 500', async () => {
    const r = await req('POST', '/v1/debts', debtBody('1535'));
    expect(r.status).toBe(400);
  });
});
