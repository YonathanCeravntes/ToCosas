import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

/**
 * FIN-012 · Test E2E de CONCURRENCIA — cambio obligatorio #4 de DEC-0012 §10.4.
 *
 * Prueba contra la aplicación REAL y la base de datos REAL (requiere el Postgres
 * de docker-compose levantado) que las escrituras concurrentes sobre
 * `Debt.currentBalance` son atómicas:
 *   - pago manual (`POST /v1/transactions`, UPDATE ... RETURNING condicional)
 *   - abono a capital (`POST /v1/debts/:id/prepay`, SELECT ... FOR UPDATE)
 * y que el saldo final es matemáticamente EXACTO — nunca "última escritura gana".
 *
 * Ejecución: `npm run test:e2e` (levanta la app en un puerto efímero; no
 * necesita el backend dev corriendo, solo la BD).
 */
describe('FIN-012 · concurrencia sobre Debt.currentBalance (DEC-0012 §10.4)', () => {
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
      /* respuestas sin cuerpo */
    }
    return { status: res.status, data };
  };

  const newDebt = async (name: string, amount: number) => {
    const r = await req('POST', '/v1/debts', {
      name,
      debtType: 'libre_inversion',
      originalAmount: amount,
      currentBalance: amount,
      startDate: '2026-07-01',
      termMonths: 12,
      interestRate: 15,
      rateBasis: 'EA',
    });
    expect(r.status).toBe(201);
    return r.data.debt;
  };

  const balanceOf = async (debtId: string): Promise<number> => {
    const r = await req('GET', `/v1/debts/${debtId}`);
    expect(r.status).toBe(200);
    return Number(r.data.currentBalance);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    // Mismo bootstrap que main.ts (prefijo + validación) para probar rutas reales.
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    await app.listen(0); // puerto efímero: no choca con el backend dev
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1');

    const reg = await req('POST', '/v1/auth/register', {
      email: `e2e-fin012-conc-${Date.now()}@millo.test`,
      password: 'Passw0rd!e2e',
      fullName: 'E2E Concurrencia FIN-012',
    });
    expect(reg.status).toBe(201);
    token = reg.data.tokens.accessToken;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('obligatorio #4: pago manual 300k + abono 300k EN PARALELO → saldo final EXACTO 400.000 (nunca last-write-wins 700.000)', async () => {
    const debt = await newDebt('E2E concurrencia mixta', 1_000_000);

    const [manual, prepay] = await Promise.all([
      req('POST', '/v1/transactions', {
        kind: 'pago_deuda',
        amount: 300_000,
        occurredAt: new Date().toISOString(),
        debtId: debt.id,
      }),
      req('POST', `/v1/debts/${debt.id}/prepay`, { amount: 300_000, effect: 'reducir_plazo' }),
    ]);

    expect(manual.status).toBe(201);
    expect(prepay.status).toBe(201);
    // La prueba central: ambas escrituras aplicadas, ninguna pisada por la otra.
    expect(await balanceOf(debt.id)).toBe(400_000);
  });

  it('dos abonos a capital EN PARALELO sobre la misma deuda → ambos aplican y el saldo es exacto', async () => {
    const debt = await newDebt('E2E concurrencia doble prepay', 1_000_000);

    const [a, b] = await Promise.all([
      req('POST', `/v1/debts/${debt.id}/prepay`, { amount: 300_000, effect: 'reducir_plazo' }),
      req('POST', `/v1/debts/${debt.id}/prepay`, { amount: 200_000, effect: 'reducir_plazo' }),
    ]);

    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(await balanceOf(debt.id)).toBe(500_000);
    // El FOR UPDATE serializa: el recibo del segundo en aplicar parte del saldo
    // ya reducido por el primero — los dos newBalance devueltos son distintos.
    const balances = [a.data.newBalance, b.data.newBalance].sort((x, y) => y - x);
    expect(balances[0]).toBeGreaterThan(balances[1]);
    expect(balances[1]).toBe(500_000);
  });

  it('payoff + pago manual EN PARALELO → estado final consistente: saldo 0, pagada, nunca negativo', async () => {
    const debt = await newDebt('E2E concurrencia payoff', 800_000);

    const [payoff, manual] = await Promise.all([
      req('POST', `/v1/debts/${debt.id}/payoff`, {}),
      req('POST', '/v1/transactions', {
        kind: 'pago_deuda',
        amount: 300_000,
        occurredAt: new Date().toISOString(),
        debtId: debt.id,
      }),
    ]);

    // Según el orden de serialización, el payoff liquida 800k o el remanente 500k;
    // lo INVARIANTE es: ambas operaciones aceptadas, saldo exacto 0 (jamás negativo)
    // y la deuda marcada como pagada.
    expect(payoff.status).toBe(201);
    expect(manual.status).toBe(201);
    expect([800_000, 500_000]).toContain(payoff.data.paidAmount);

    const r = await req('GET', `/v1/debts/${debt.id}`);
    expect(Number(r.data.currentBalance)).toBe(0);
    expect(r.data.status).toBe('pagada');
  });
});
