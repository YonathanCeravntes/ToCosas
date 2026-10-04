import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * FIN-059 · Millo en pareja (Fundador, 2026-10-03): hogar con dos personas, consentimiento
 * de cada una, "de la casa", aporte justo proporcional, cuadre, metas, privacidad y salir.
 */
describe('FIN-059 · Millo en pareja', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let base: string;
  const tokens: Record<'y' | 'a' | 'x', string> = { y: '', a: '', x: '' };
  const stamp = Date.now();

  const req = async (who: 'y' | 'a' | 'x', method: string, path: string, body?: unknown) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens[who]}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data: any = null;
    try { data = await res.json(); } catch { /* sin cuerpo */ }
    return { status: res.status, data };
  };
  const today = new Date().toISOString();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1');
    prisma = app.get(PrismaService);
    for (const [who, name] of [['y', 'Yonathan Prueba'], ['a', 'Andrea Prueba'], ['x', 'Intruso Prueba']] as const) {
      const r = await fetch(`${base}/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `e2e-fin059-${who}-${stamp}@millo.test`, password: 'Passw0rd!e2e', fullName: name, acceptsDataPolicy: true }),
      });
      tokens[who] = (await r.json()).tokens.accessToken;
    }
    // Ingresos 6M y 4M → 60/40.
    await req('y', 'POST', '/v1/income/sources', { name: 'Salario', amount: 6_000_000, dayOfMonth: 1 });
    await req('a', 'POST', '/v1/income/sources', { name: 'Salario', amount: 4_000_000, dayOfMonth: 1 });
  });

  afterAll(async () => {
    await app.close();
  });

  let code = '';

  it('sin consentimiento no se crea; con él, el hogar nace con un código de invitación', async () => {
    expect((await req('y', 'POST', '/v1/household', { consent: false })).status).toBe(400);
    const r = await req('y', 'POST', '/v1/household', { consent: true });
    expect(r.status).toBe(201);
    expect(r.data.household.partner).toBeNull();
    code = r.data.household.invite.code;
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
    // Un segundo hogar no.
    expect((await req('y', 'POST', '/v1/household', { consent: true })).status).toBe(409);
  });

  it('la pareja se une con el código; un tercero ya no cabe; el propio código no sirve', async () => {
    expect((await req('y', 'POST', '/v1/household/join', { code, consent: true })).status).toBe(409);
    const j = await req('a', 'POST', '/v1/household/join', { code: code.toLowerCase(), consent: true });
    expect(j.status).toBe(201);
    expect(j.data.household.partner.name).toBe('Yonathan');
    // El código quedó usado.
    expect((await req('x', 'POST', '/v1/household/join', { code, consent: true })).status).toBe(404);
    const y = await req('y', 'GET', '/v1/household');
    expect(y.data.household.partner.name).toBe('Andrea');
    expect(y.data.household.invite).toBeNull();
  });

  it('solo lo marcado "de la casa" cuenta; lo personal nunca aparece', async () => {
    await req('y', 'POST', '/v1/transactions', { kind: 'gasto', amount: 2_070_000, occurredAt: today, note: 'Arriendo', household: true });
    await req('a', 'POST', '/v1/transactions', { kind: 'gasto', amount: 1_130_000, occurredAt: today, note: 'Mercado', household: true });
    await req('a', 'POST', '/v1/transactions', { kind: 'gasto', amount: 90_000, occurredAt: today, note: 'Regalo secreto' });
    const m = await req('y', 'GET', '/v1/household/month');
    expect(m.status).toBe(200);
    expect(m.data.spent).toBe(3_200_000);
    expect(m.data.recent.map((t: { label: string }) => t.label)).not.toContain('Regalo secreto');
  });

  it('sin compartir ingreso es mitad y mitad (y se dice); compartiéndolo, 60/40 y Andrea le pasa $150.000', async () => {
    let m = await req('y', 'GET', '/v1/household/month');
    expect(m.data.fair).toMatchObject({ mode: 'mitad', fallbackReason: 'sin_ingreso_compartido' });
    await req('y', 'PATCH', '/v1/household/me', { shareIncome: true });
    await req('a', 'PATCH', '/v1/household/me', { shareIncome: true });
    m = await req('y', 'GET', '/v1/household/month');
    expect(m.data.fair.mode).toBe('proporcional');
    expect(m.data.fair.rows.map((r: { who: string; percent: number }) => [r.who, r.percent])).toEqual([['Tú', 60], ['Andrea', 40]]);
    expect(m.data.fair.settlement).toMatchObject({ from: 'Andrea', to: 'Tú', fromIsMe: false, amount: 150_000 });
    // El ingreso en pesos nunca sale del servidor.
    expect(JSON.stringify(m.data)).not.toContain('6000000');
    expect(JSON.stringify(m.data)).not.toContain('4000000');
  });

  it('presupuesto de la casa → "nos queda"; metas juntos con aportes de los dos', async () => {
    await req('a', 'PATCH', '/v1/household', { monthlyBudget: 3_840_000 });
    const g = await req('y', 'POST', '/v1/household/goals', { name: 'Viaje a Cartagena', targetAmount: 3_000_000 });
    expect(g.status).toBe(201);
    await req('y', 'POST', `/v1/household/goals/${g.data.id}/contribute`, { amount: 1_000_000 });
    await req('a', 'POST', `/v1/household/goals/${g.data.id}/contribute`, { amount: 800_000 });
    const m = await req('a', 'GET', '/v1/household/month');
    expect(m.data.left).toBe(640_000);
    expect(m.data.goals[0]).toMatchObject({ name: 'Viaje a Cartagena', saved: 1_800_000, percent: 60 });
  });

  it('un tercero no ve nada del hogar', async () => {
    expect((await req('x', 'GET', '/v1/household/month')).status).toBe(404);
    expect((await req('x', 'GET', '/v1/household')).data.household).toBeNull();
  });

  it('deudas personales: solo totales y solo si la persona lo activa', async () => {
    await req('a', 'POST', '/v1/debts', {
      name: 'Tarjeta personal', debtType: 'credito_personal', originalAmount: 2_000_000, currentBalance: 2_000_000,
      startDate: today.slice(0, 10), termMonths: 12, interestRate: 24, rateBasis: 'EA', rateKind: 'fija',
    });
    let m = await req('y', 'GET', '/v1/household/month');
    expect(m.data.partnerDebts).toEqual([]);
    await req('a', 'PATCH', '/v1/household/me', { shareDebts: true });
    m = await req('y', 'GET', '/v1/household/month');
    expect(m.data.partnerDebts).toHaveLength(1);
    expect(m.data.partnerDebts[0]).toMatchObject({ name: 'Andrea', count: 1, balance: 2_000_000 });
    expect(JSON.stringify(m.data.partnerDebts)).not.toContain('Tarjeta personal');
  });

  it('salir es un toque, sin permiso del otro; el hogar sigue para quien se queda', async () => {
    const l = await req('a', 'POST', '/v1/household/leave');
    expect(l.status).toBe(201);
    expect((await req('a', 'GET', '/v1/household')).data.household).toBeNull();
    const y = await req('y', 'GET', '/v1/household');
    expect(y.data.household.partner).toBeNull();
    const m = await req('y', 'GET', '/v1/household/month');
    expect(m.data.spent).toBe(2_070_000); // lo de Andrea ya no suma
    // Al salir el último, el hogar se cierra.
    await req('y', 'POST', '/v1/household/leave');
    const members = await prisma.householdMember.count({ where: { leftAt: null, user: { email: { contains: `fin059-y-${stamp}` } } } });
    expect(members).toBe(0);
  });
});
