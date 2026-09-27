import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * FIN-039 · Cuenta y datos + FIN-038 · historial.
 *  - registro con consentimiento → dataConsentAt registrado y visible en /auth/me
 *  - onboarding/done marca la bandera
 *  - recuperar contraseña: el código NO viaja por la API; se lee de la BD (hash) → se
 *    prueba con un código incorrecto (400) y con el flujo completo usando el hash
 *  - exportación devuelve las colecciones del usuario
 *  - borrar cuenta: login falla, refresh falla, y el MISMO correo puede registrarse de nuevo (M7)
 *  - GET /transactions acepta q/before/limit y trae categoría/deuda
 *
 * Ejecución: `npm run test:e2e` (Postgres real).
 */
describe('FIN-039 · Cuenta y datos (Ley 1581) + FIN-038 historial', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let base: string;
  let token = '';
  let refreshToken = '';
  const email = `e2e-fin039-${Date.now()}@millo.test`;
  const password = 'Passw0rd!e2e';

  const req = async (method: string, path: string, body?: unknown, auth = true) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(auth && token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data: any = null;
    try { data = await res.json(); } catch { /* sin cuerpo */ }
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
  });

  afterAll(async () => {
    await app?.close();
  });

  it('registra con consentimiento y /auth/me lo expone junto con onboardingDone', async () => {
    const reg = await req('POST', '/v1/auth/register', { email, password, fullName: 'E2E Treinta y Nueve', acceptsDataPolicy: true }, false);
    expect(reg.status).toBe(201);
    token = reg.data.tokens.accessToken;
    refreshToken = reg.data.tokens.refreshToken;

    const me = await req('GET', '/v1/auth/me');
    expect(me.status).toBe(200);
    expect(me.data.email).toBe(email);
    expect(me.data.onboardingDone).toBe(false);
    expect(typeof me.data.dataConsentAt).toBe('string');

    const done = await req('POST', '/v1/auth/onboarding/done');
    expect(done.status).toBe(201);
    const me2 = await req('GET', '/v1/auth/me');
    expect(me2.data.onboardingDone).toBe(true);
  });

  it('historial: GET /transactions acepta q/limit/before e incluye categoría y deuda', async () => {
    const cats = await req('GET', '/v1/categories?kind=gasto');
    const cat = cats.data[0];
    const t1 = await req('POST', '/v1/transactions', { kind: 'gasto', amount: 45_000, occurredAt: '2026-09-01T12:00:00.000Z', note: 'Mercado semanal', categoryId: cat?.id });
    const t2 = await req('POST', '/v1/transactions', { kind: 'gasto', amount: 12_000, occurredAt: '2026-09-05T12:00:00.000Z', note: 'Café' });
    expect(t1.status).toBe(201);
    expect(t2.status).toBe(201);

    const byNote = await req('GET', '/v1/transactions?q=mercado');
    expect(byNote.status).toBe(200);
    expect(byNote.data).toHaveLength(1);
    expect(byNote.data[0].note).toBe('Mercado semanal');
    if (cat) expect(byNote.data[0].category?.name).toBe(cat.name);

    const page1 = await req('GET', '/v1/transactions?limit=1');
    expect(page1.data).toHaveLength(1);
    expect(page1.data[0].note).toBe('Café'); // el más reciente primero
    const page2 = await req('GET', `/v1/transactions?limit=1&before=${encodeURIComponent(page1.data[0].occurredAt)}`);
    expect(page2.data).toHaveLength(1);
    expect(page2.data[0].note).toBe('Mercado semanal');
  });

  it('recuperar contraseña: 202 siempre, código incorrecto → 400, código correcto cambia la clave', async () => {
    const ask = await req('POST', '/v1/auth/password/forgot', { email }, false);
    expect(ask.status).toBe(202);
    expect(ask.data.ok).toBe(true);

    const bad = await req('POST', '/v1/auth/password/reset', { email, code: '000000', newPassword: 'OtraClave123' }, false);
    expect(bad.status).toBe(400);

    // El código no viaja por la API (solo su hash en BD). Para probar el camino feliz
    // fuerza un hash conocido: sha256(`${userId}:123456`).
    const user = await prisma.user.findFirstOrThrow({ where: { email } });
    const { createHash } = await import('node:crypto');
    const codeHash = createHash('sha256').update(`${user.id}:123456`).digest('hex');
    await prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { codeHash } });

    const good = await req('POST', '/v1/auth/password/reset', { email, code: '123456', newPassword: 'OtraClave123' }, false);
    expect(good.status).toBe(201);
    const login = await req('POST', '/v1/auth/login', { email, password: 'OtraClave123' }, false);
    expect(login.status).toBe(201);
    token = login.data.tokens.accessToken;
    refreshToken = login.data.tokens.refreshToken;

    // Un código ya usado no sirve dos veces.
    const again = await req('POST', '/v1/auth/password/reset', { email, code: '123456', newPassword: 'Tercera123' }, false);
    expect(again.status).toBe(400);

    // Correo inexistente: misma respuesta (no revela existencia).
    const ghost = await req('POST', '/v1/auth/password/forgot', { email: `nadie-${Date.now()}@millo.test` }, false);
    expect(ghost.status).toBe(202);
  });

  it('exporta los datos del usuario', async () => {
    const exp = await req('GET', '/v1/auth/me/export');
    expect(exp.status).toBe(200);
    expect(exp.data.format).toBe('millo-export-v1');
    expect(exp.data.user.email).toBe(email);
    expect(exp.data.transactions.length).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(exp.data.debts)).toBe(true);
  });

  it('borra la cuenta: sin acceso después y el correo queda libre para registrarse de nuevo (M7)', async () => {
    const wrong = await req('DELETE', '/v1/auth/me', { password: 'incorrecta' });
    expect(wrong.status).toBe(401);

    const del = await req('DELETE', '/v1/auth/me', { password: 'OtraClave123' });
    expect(del.status).toBe(200);
    expect(del.data.deleted).toBe(true);

    const login = await req('POST', '/v1/auth/login', { email, password: 'OtraClave123' }, false);
    expect(login.status).toBe(401);
    const refresh = await req('POST', '/v1/auth/refresh', { refreshToken }, false);
    expect(refresh.status).toBe(401);
    const me = await req('GET', '/v1/auth/me');
    expect(me.status).toBe(404);

    const reReg = await req('POST', '/v1/auth/register', { email, password, acceptsDataPolicy: true }, false);
    expect(reReg.status).toBe(201);
  });
});
