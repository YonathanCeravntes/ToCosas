import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

/**
 * FIN-022 · Orden de ataque en /debts/summary (ARQ-0022 §13, DEC-0022 §5).
 *
 * - §32 por construcción: el bloque del summary y el escenario del Simulador
 *   devuelven la MISMA estrategia y la MISMA cifra (mismo motor, helper único).
 * - Gate DEC §5.4: con 1 deuda no hay bloque.
 * - El orden de ataque es el del motor (mayor tasa primero bajo avalancha).
 *
 * Ejecución: `npm run test:e2e` (requiere el Postgres de docker levantado).
 */
describe('FIN-022 · orden de ataque único entre summary y Simulador (§32)', () => {
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

  const newDebt = async (name: string, amount: number, ratePct: number, termMonths: number) => {
    const r = await req('POST', '/v1/debts', {
      name,
      debtType: 'libre_inversion',
      originalAmount: amount,
      currentBalance: amount,
      startDate: '2026-01-15',
      termMonths,
      interestRate: ratePct,
      rateBasis: 'EA',
    });
    expect(r.status).toBe(201);
    return r.data.debt;
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
      email: `e2e-fin022-ataque-${Date.now()}@millo.test`,
      password: 'Passw0rd!e2e',
    });
    token = reg.data.tokens.accessToken;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('con UNA deuda el bloque no existe (gate DEC §5.4)', async () => {
    await newDebt('E2E cara', 2_000_000, 45, 12);
    const { status, data } = await req('GET', '/v1/debts/summary');
    expect(status).toBe(200);
    expect(data.strategy).toBeNull();
  });

  it('con varias deudas: orden del motor (mayor tasa primero) con nombres reales', async () => {
    // Plazos escalonados: el roll-over hace divergir las estrategias aun con
    // extra 0 (con 2 deudas iguales la diferencia sería ~0 — de ahí el copy
    // alternativo del DEC §5.2, cubierto por el caso de la pantalla).
    await newDebt('E2E chica barata', 3_000_000, 15, 48);
    await newDebt('E2E grande media', 8_000_000, 28, 60);
    const { data } = await req('GET', '/v1/debts/summary');
    expect(data.strategy).not.toBeNull();
    expect(data.strategy.recommended).toBe('avalanche');
    expect(data.strategy.attackOrder.map((d: { name: string }) => d.name)).toEqual([
      'E2E cara',
      'E2E grande media',
      'E2E chica barata',
    ]);
    expect(data.strategy.attackOrder[0].ratePct).toBe(45);
    expect(data.strategy.interestDifference).toBeGreaterThan(0);
    expect(data.strategy.months).toBeGreaterThan(0);
    // El total del hero: la misma fuente que consume Inicio (mismo endpoint).
    expect(data.totalDebt).toBe(13_000_000);
  });

  it('§32: el Simulador (estrategia_deudas, extraBudget 0) devuelve LO MISMO', async () => {
    const [summary, sim] = await Promise.all([
      req('GET', '/v1/debts/summary'),
      req('POST', '/v1/simulations', { type: 'estrategia_deudas', extraBudget: 0 }),
    ]);
    expect(sim.status).toBe(201);
    expect(sim.data.specifics.recommended).toBe(summary.data.strategy.recommended);
    expect(sim.data.specifics.interestDifference).toBeCloseTo(
      summary.data.strategy.interestDifference,
      2,
    );
  });
});
