import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * FIN-047 · Gastos fijos automáticos (Fundador, 2026-09-29):
 *  - el día que toca, el fijo se registra SOLO (movimiento automático) y sale de "protegido";
 *  - si se registra a mano, se CRUZA: el automático se retira y no se cuenta doble;
 *  - si la persona borra el movimiento, no reaparece ese ciclo.
 */
describe('FIN-047 · Gastos fijos automáticos', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let base: string;
  let token = '';
  let userId = '';
  let fixedId = '';
  const email = `e2e-fin047-${Date.now()}@millo.test`;
  const day = Math.min(28, new Date().getUTCDate());

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
  const fixedTxs = () =>
    prisma.transaction.findMany({ where: { userId, fixedItemId: fixedId }, orderBy: { createdAt: 'asc' } });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1');
    prisma = app.get(PrismaService);

    const reg = await req('POST', '/v1/auth/register', { email, password: 'Passw0rd!e2e', acceptsDataPolicy: true });
    token = reg.data.tokens.accessToken;
    userId = reg.data.user.id;
    await req('POST', '/v1/income/profile', { workProfile: 'empleado' });
    await req('POST', '/v1/income/sources', { name: 'Salario', amount: 5_000_000, dayOfMonth: 1 });
    const f = await req('POST', '/v1/budget/fixed-items', { kind: 'gasto', name: 'Arriendo', amount: 1_200_000, dayOfMonth: day });
    expect(f.status).toBe(201);
    fixedId = f.data.id;
    // Creado hace tiempo (un fijo nuevo empieza a registrarse el ciclo siguiente a su día).
    await prisma.fixedItem.update({ where: { id: fixedId }, data: { createdAt: new Date(Date.now() - 60 * 86_400_000) } });
  });

  afterAll(async () => {
    await app.close();
  });

  it('el día que toca se registra solo y sale de "protegido"', async () => {
    const m = await req('GET', '/v1/budget/monthly');
    expect(m.status).toBe(200);
    const txs = await fixedTxs();
    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({ source: 'system', kind: 'gasto', note: 'Arriendo' });
    expect(Number(txs[0].amount)).toBe(1_200_000);
    const item = m.data.expenses.find((e: { id: string }) => e.id === fixedId);
    expect(item.thisCycle).toMatchObject({ status: 'registrado', auto: true });
    expect(m.data.teQueda.pendingCommitments.find((c: { name: string }) => c.name === 'Arriendo')).toBeUndefined();
    // Inicio: "fijos del mes" es lo registrado.
    const home = await req('GET', '/v1/dashboard/home');
    expect(home.data.expense.fixed).toBe(1_200_000);
  });

  it('registrarlo a mano lo CRUZA: no se cuenta doble y "Te queda" no cambia', async () => {
    const before = (await req('GET', '/v1/budget/monthly')).data.teQueda.amount;
    const t = await req('POST', '/v1/transactions', {
      kind: 'gasto', amount: 1_200_000, note: 'Pagué el arriendo', occurredAt: new Date().toISOString(),
    });
    expect(t.status).toBe(201);
    expect(t.data.fixedItemId).toBe(fixedId);
    const txs = await fixedTxs();
    const alive = txs.filter((x) => !x.deletedAt);
    expect(alive).toHaveLength(1);
    expect(alive[0].source).toBe('app');
    const after = (await req('GET', '/v1/budget/monthly')).data.teQueda.amount;
    expect(after).toBe(before);
  });

  it('si lo borra, no reaparece este ciclo y vuelve a quedar apartado', async () => {
    const alive = (await fixedTxs()).filter((x) => !x.deletedAt)[0];
    expect((await req('DELETE', `/v1/transactions/${alive.id}`)).status).toBeLessThan(300);
    const svc = app.get((await import('../src/modules/budget/fixed-expense.service')).FixedExpenseService);
    expect(await svc.materialize(userId)).toBe(0);
    const m = await req('GET', '/v1/budget/monthly');
    const pending = m.data.teQueda.pendingCommitments.find((c: { name: string }) => c.name === 'Arriendo');
    expect(pending?.amount).toBe(1_200_000);
  });

  it('se puede EDITAR el gasto fijo y el ingreso fijo', async () => {
    const f = await req('PATCH', `/v1/budget/fixed-items/${fixedId}`, { amount: 1_300_000, dayOfMonth: 6 });
    expect(f.status).toBe(200);
    expect(Number(f.data.amount)).toBe(1_300_000);
    const sources = await req('GET', '/v1/income/sources');
    const s = await req('PATCH', `/v1/income/sources/${sources.data[0].id}`, { amount: 5_500_000 });
    expect(s.status).toBe(200);
    expect(Number(s.data.amount)).toBe(5_500_000);
  });

  it('FIN-048: los tipos fijos vienen separados de las categorías del día a día', async () => {
    const cats = await req('GET', '/v1/categories?kind=gasto');
    const fixed = cats.data.filter((c: { isFixed: boolean }) => c.isFixed).map((c: { name: string }) => c.name);
    const variable = cats.data.filter((c: { isFixed: boolean; isGlobal: boolean }) => !c.isFixed && c.isGlobal).map((c: { name: string }) => c.name);
    expect(fixed).toEqual(expect.arrayContaining(['Arriendo', 'Servicios públicos', 'Internet y TV', 'Suscripciones', 'Otro fijo']));
    expect(variable).toEqual(expect.arrayContaining(['Comida', 'Mercado', 'Transporte']));
    expect(variable).not.toContain('Arriendo');
  });

  it('FIN-048: un fijo por tipo con nota; "pagué la luz" lo cruza por las palabras del tipo', async () => {
    const cats = await req('GET', '/v1/categories?kind=gasto');
    const sp = cats.data.find((c: { name: string }) => c.name === 'Servicios públicos');
    const f = await req('POST', '/v1/budget/fixed-items', { kind: 'gasto', name: 'Servicios públicos', amount: 180_000, dayOfMonth: 20, categoryId: sp.id, notes: 'luz y agua' });
    expect(f.status).toBe(201);
    const m = await req('GET', '/v1/budget/monthly');
    const item = m.data.expenses.find((e: { id: string }) => e.id === f.data.id);
    expect(item).toMatchObject({ notes: 'luz y agua', type: { name: 'Servicios públicos' } });
    const t = await req('POST', '/v1/transactions', { kind: 'gasto', amount: 172_000, note: 'Pagué la luz', occurredAt: new Date().toISOString() });
    expect(t.data.fixedItemId).toBe(f.data.id);
  });

  it('FIN-048: "gasto fijo" por nombre (bot/Copiloto) infiere el tipo', async () => {
    const f = await req('POST', '/v1/budget/fixed-items', { kind: 'gasto', name: 'netflix', amount: 45_000, dayOfMonth: 12 });
    const m = await req('GET', '/v1/budget/monthly');
    const item = m.data.expenses.find((e: { id: string }) => e.id === f.data.id);
    expect(item.type?.name).toBe('Suscripciones');
  });
});
