import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

/**
 * FIN-020 · "Te queda" — fuente única (GOBERNANZA §32, ARQ-0020 §13).
 *
 * Criterio de aceptación central: el `teQueda` que devuelve /budget/monthly y
 * el que devuelve /dashboard/home deben ser IDÉNTICOS (misma instancia de
 * SpendableService), contra app + BD reales. Si alguien reintroduce una
 * fórmula paralela en cualquiera de los dos endpoints, este test rompe.
 *
 * Ejecución: `npm run test:e2e` (requiere el Postgres de docker levantado).
 */
describe('FIN-020 · teQueda idéntico en Presupuesto e Inicio (§32)', () => {
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
      email: `e2e-fin020-tq-${Date.now()}@millo.test`,
      password: 'Passw0rd!e2e',
    });
    token = reg.data.tokens.accessToken;

    // Escenario Alt A: ingreso fijo DECLARADO (no debe contar), fijos de gasto
    // pendientes, y movimientos reales del ciclo.
    const fixed = await req('POST', '/v1/budget/fixed-items', {
      kind: 'gasto',
      name: 'Arriendo e2e',
      amount: 1_200_000,
      dayOfMonth: 5,
    });
    expect(fixed.status).toBe(201);
    const income = await req('POST', '/v1/budget/fixed-items', {
      kind: 'ingreso',
      name: 'Salario e2e',
      amount: 4_000_000,
      dayOfMonth: 28,
    });
    expect(income.status).toBe(201);

    const tx1 = await req('POST', '/v1/transactions', {
      kind: 'ingreso',
      amount: 900_000,
      occurredAt: new Date().toISOString(),
    });
    expect(tx1.status).toBe(201);
    const tx2 = await req('POST', '/v1/transactions', {
      kind: 'gasto',
      amount: 250_000,
      occurredAt: new Date().toISOString(),
    });
    expect(tx2.status).toBe(201);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('ambos endpoints devuelven EXACTAMENTE el mismo teQueda', async () => {
    const [budget, home] = await Promise.all([
      req('GET', '/v1/budget/monthly'),
      req('GET', '/v1/dashboard/home'),
    ]);
    expect(budget.status).toBe(200);
    expect(home.status).toBe(200);
    expect(budget.data.teQueda).toBeDefined();
    // Igualdad ESTRUCTURAL COMPLETA — monto, por-día, días, compromisos, base.
    expect(home.data.teQueda).toEqual(budget.data.teQueda);
  });

  it('la cifra respeta Alt A: solo lo real menos lo pendiente (el salario declarado NO suma)', async () => {
    const { data } = await req('GET', '/v1/budget/monthly');
    const tq = data.teQueda;
    expect(tq.receivedIncome).toBe(900_000); // solo el ingreso REAL del ciclo
    expect(tq.protectedTotal).toBe(1_200_000); // el arriendo pendiente (§4.1-bis)
    expect(tq.amount).toBe(900_000 - 250_000 - 1_200_000); // = −550.000
    expect(tq.perDay).toBeNull(); // sin margen no se sugiere gasto diario
    expect(
      tq.pendingCommitments.some((c: { name: string }) => c.name === 'Salario e2e'),
    ).toBe(false);
  });

  it('la interpretación del Inicio se deriva del teQueda (§4.1-ter), no del flujo estructural', async () => {
    const { data } = await req('GET', '/v1/dashboard/home');
    // teQueda −550k ⇒ rojo con texto que NO culpa (los compromisos aún no vencen).
    expect(data.interpretation.cashflow).toEqual({
      level: 'rojo',
      text: 'Lo que viene comprometido supera lo que te queda — mira qué puedes mover',
    });
  });
});
