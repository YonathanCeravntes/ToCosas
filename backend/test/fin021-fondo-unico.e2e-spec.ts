import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EngineService } from '../src/modules/financial-engine/engine.service';
import { MetricKey } from '../src/modules/financial-engine/engine.constants';

/**
 * FIN-021 · Única definición del fondo de emergencia (GOBERNANZA §32).
 *
 * Criterio de aceptación 2 (ARQ-0021 §13): para el mismo usuario, la cobertura
 * que narra Inicio == lectura persistida del Motor == la que muestra Salud.
 * Contra app + BD reales; el recálculo del Motor se dispara directamente
 * (equivalente a lo que hace el listener del outbox en ~25 s).
 *
 * Ejecución: `npm run test:e2e` (requiere el Postgres de docker levantado).
 */
describe('FIN-021 · cobertura del fondo idéntica en Inicio, Motor y Salud (§32)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
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
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1');
    prisma = app.get(PrismaService);

    const reg = await req('POST', '/v1/auth/register', {
      email: `e2e-fin021-fondo-${Date.now()}@millo.test`,
      password: 'Passw0rd!e2e',
    });
    token = reg.data.tokens.accessToken;
    userId = reg.data.user.id;

    // Gasto esencial: 1M de fijos (sin deudas) · fondo marcado: 4.5M ⇒ 4,5 meses
    // (entre colchón inicial 3 y fondo completo 6).
    const fixed = await req('POST', '/v1/budget/fixed-items', {
      kind: 'gasto',
      name: 'Fijos e2e',
      amount: 1_000_000,
      dayOfMonth: 5,
    });
    expect(fixed.status).toBe(201);
    const acc = await req('POST', '/v1/accounts', {
      name: 'Fondo e2e',
      type: 'ahorros',
      currentBalance: 4_500_000,
      isEmergencyFund: true,
    });
    expect(acc.status).toBe(201);

    // Recalculo del Motor (lo que el listener del outbox hace con ~25 s de debounce).
    await app.get(EngineService).recompute(userId);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('la lectura persistida del Motor es la esperada por el caso a mano (4,5 meses)', async () => {
    const reading = await prisma.metricReading.findFirst({
      where: { userId, metricKey: MetricKey.EmergencyFundMonths, period: 'month' },
      orderBy: { capturedAt: 'desc' },
    });
    expect(reading).not.toBeNull();
    expect(Number(reading!.value)).toBeCloseTo(4.5, 3);
  });

  it('Salud muestra EXACTAMENTE la lectura persistida (mismo valor, nivel amarillo 3–6)', async () => {
    const health = await req('GET', '/v1/health/score');
    expect(health.status).toBe(200);
    const indicator = health.data.indicators.find((i: { key: string }) => i.key === 'emergency_fund');
    expect(indicator.value).toBeCloseTo(4.5, 3);
    expect(indicator.level).toBe('amarillo');
  });

  it('Inicio narra la MISMA lectura con los hitos oficiales — sin fórmula propia', async () => {
    const home = await req('GET', '/v1/dashboard/home');
    expect(home.status).toBe(200);
    expect(home.data.interpretation.savings).toEqual({
      level: 'amarillo',
      text: 'Ya tienes tu colchón inicial (~4.5 meses de lo esencial) — vas hacia el fondo completo de 6',
    });
  });
});
