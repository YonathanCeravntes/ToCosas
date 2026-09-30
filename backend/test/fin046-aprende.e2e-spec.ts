import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { ProposalsService } from '../src/modules/memory/proposals.service';

/**
 * FIN-046 Fase 4 · "Aprende de ti": categorías por comercio y propuestas de un toque
 * (gasto fijo e ingreso). Nada se aplica sin confirmar.
 */
describe('FIN-046 Fase 4 · Millo aprende de ti', () => {
  let app: INestApplication;
  let base: string;
  let token = '';
  let userId = '';
  const email = `e2e-fin046f4-${Date.now()}@millo.test`;

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
  const monthsAgo = (n: number, day: number) => {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - n, day, 12)).toISOString();
  };
  const today = Math.min(new Date().getUTCDate(), 28);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1');
    const reg = await req('POST', '/v1/auth/register', { email, password: 'Passw0rd!e2e', acceptsDataPolicy: true });
    token = reg.data.tokens.accessToken;
    userId = reg.data.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('aprende la categoría de un comercio y la corrige cuando la persona la cambia', async () => {
    const cats = (await req('GET', '/v1/categories?kind=gasto')).data;
    const comida = cats.find((c: { name: string }) => c.name === 'Comida');
    const mercado = cats.find((c: { name: string }) => c.name === 'Mercado');
    await req('POST', '/v1/transactions', { kind: 'gasto', amount: 30_000, note: 'Rappi', categoryId: comida.id, occurredAt: new Date().toISOString() });

    const t2 = await req('POST', '/v1/transactions', { kind: 'gasto', amount: 28_000, note: 'rappi 28 mil', occurredAt: new Date().toISOString() });
    expect(t2.data.categoryId).toBe(comida.id);

    // La persona corrige: era mercado.
    await req('PATCH', `/v1/transactions/${t2.data.id}`, { categoryId: mercado.id });
    const t3 = await req('POST', '/v1/transactions', { kind: 'gasto', amount: 90_000, note: 'Rappi', occurredAt: new Date().toISOString() });
    expect(t3.data.categoryId).toBe(mercado.id);
  });

  it('"¿Pagas Netflix cada mes?": propone, y al confirmar crea el fijo sin contar doble', async () => {
    await req('POST', '/v1/transactions', { kind: 'gasto', amount: 45_000, note: 'Netflix', occurredAt: monthsAgo(1, today) });
    await req('POST', '/v1/transactions', { kind: 'gasto', amount: 45_000, note: 'pagué Netflix', occurredAt: monthsAgo(0, today) });
    const before = (await req('GET', '/v1/budget/monthly')).data.teQueda.amount;

    const svc = app.get(ProposalsService);
    expect(await svc.analyzeUser(userId)).toBeGreaterThanOrEqual(1);
    expect(await svc.analyzeUser(userId)).toBe(0); // una sola vez

    const list = (await req('GET', '/v1/insights')).data;
    const p = list.find((i: { title: string }) => i.title === '¿Pagas Netflix cada mes?');
    expect(p.payload).toMatchObject({ action: 'crear_gasto_fijo', name: 'Netflix', amount: 45_000 });
    // Rappi (3 veces este mes) no es un fijo.
    expect(list.some((i: { title: string }) => /Rappi/.test(i.title))).toBe(false);

    const ok = await req('POST', `/v1/proposals/${p.id}/accept`);
    expect(ok.status).toBe(201);
    expect(ok.data).toMatchObject({ done: true, action: 'crear_gasto_fijo', linked: 1 });

    const m = (await req('GET', '/v1/budget/monthly')).data;
    const netflix = m.expenses.find((e: { name: string }) => e.name === 'Netflix');
    expect(netflix.thisCycle.status).toBe('registrado');
    expect(netflix.type?.name).toBe('Suscripciones');
    expect(m.teQueda.amount).toBeCloseTo(before, 2); // ya estaba pagado: no se cuenta doble
    expect((await req('GET', '/v1/insights')).data.some((i: { id: string }) => i.id === p.id)).toBe(false);
  });

  it('"¿Te entra plata cada mes?": con 3 meses de ingreso estable propone un ingreso fijo', async () => {
    for (const n of [3, 2, 1]) {
      await req('POST', '/v1/transactions', { kind: 'ingreso', amount: 3_000_000, note: 'Pago', occurredAt: monthsAgo(n, 2) });
    }
    await app.get(ProposalsService).analyzeUser(userId);
    const p = (await req('GET', '/v1/insights')).data.find((i: { title: string }) => i.title === '¿Te entra plata cada mes?');
    expect(p.payload).toMatchObject({ action: 'crear_ingreso_fijo', amount: 3_000_000, dayOfMonth: 2 });
    const ok = await req('POST', `/v1/proposals/${p.id}/accept`);
    expect(ok.data.done).toBe(true);
    const sources = (await req('GET', '/v1/income/sources')).data;
    expect(sources).toEqual([expect.objectContaining({ name: 'Ingreso mensual', isVariable: false, dayOfMonth: 2 })]);
  });

  it('una novedad sin acción no se puede "confirmar"', async () => {
    const other = await req('POST', '/v1/proposals/00000000-0000-0000-0000-000000000000/accept');
    expect(other.status).toBe(404);
  });
});
