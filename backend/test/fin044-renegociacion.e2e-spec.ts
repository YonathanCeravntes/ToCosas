import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

/**
 * FIN-044 · Renegociación de un crédito: vista previa sin efectos, aplicar desde una
 * cuota con o sin cambio de ciclo, plan recalculado, huella en el historial.
 */
describe('FIN-044 · Renegociación de un crédito', () => {
  let app: INestApplication;
  let base: string;
  let token = '';
  let debtId = '';
  let cardId = '';
  const email = `e2e-fin044-${Date.now()}@millo.test`;

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
    const d = await req('POST', '/v1/debts', {
      name: 'Libre inversión e2e',
      debtType: 'libre_inversion',
      originalAmount: 60_000_000,
      currentBalance: 60_000_000,
      startDate: '2026-09-02',
      termMonths: 120,
      interestRate: 15.39,
      rateBasis: 'EA',
      paymentDay: 2,
    });
    expect(d.status).toBe(201);
    debtId = d.data.debt.id;
    const c = await req('POST', '/v1/debts', { name: 'Tarjeta e2e', debtType: 'tarjeta_credito', originalAmount: 0, currentBalance: 0, startDate: '2026-09-01', creditLimit: 1_000_000 });
    cardId = c.data.debt.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('vista previa: muestra antes/después y NO cambia nada', async () => {
    const before = await req('GET', `/v1/debts/${debtId}`);
    const p = await req('POST', `/v1/debts/${debtId}/renegotiate/preview`, { remainingInstallments: 60, interestRate: 13.5, rateKind: 'variable' });
    expect(p.status).toBe(201);
    expect(p.data.before.remainingInstallments).toBeGreaterThan(100);
    expect(p.data.after.remainingInstallments).toBe(60);
    expect(p.data.after.monthlyPayment).toBeGreaterThan(p.data.before.monthlyPayment);
    expect(p.data.after.remainingInterest).toBeLessThan(p.data.before.remainingInterest);
    expect(p.data.changes.join(' ')).toContain('Tipo de tasa: fija → variable');
    const after = await req('GET', `/v1/debts/${debtId}`);
    expect(Number(after.data.monthlyPayment ?? after.data.debt?.monthlyPayment)).toBe(Number(before.data.monthlyPayment ?? before.data.debt?.monthlyPayment));
  });

  it('aplicar desde una fecha concreta cambiando el día de pago: plan y deuda recalculados, con huella', async () => {
    const r = await req('POST', `/v1/debts/${debtId}/renegotiate`, {
      remainingInstallments: 60,
      interestRate: 13.5,
      rateKind: 'variable',
      keepCycle: false,
      paymentDay: 15,
      effectiveFrom: '2026-11-01',
      note: 'Reestructuración',
    });
    expect(r.status).toBe(201);
    expect(r.data.effectiveFrom).toBe('2026-11-15');
    const plan = await req('GET', `/v1/debts/${debtId}/amortization`);
    expect(plan.data.length).toBe(60);
    expect(String(plan.data[0].dueDate).slice(0, 10)).toBe('2026-11-15');
    const list = await req('GET', '/v1/debts');
    const row = list.data.find((x: { id: string }) => x.id === debtId);
    expect(row.paymentDay).toBe(15);
    expect(row.rateKind).toBe('variable');
    expect(Number(row.interestRate)).toBe(13.5);
    expect(row.termMonths).toBe(60);
    const hist = await req('GET', `/v1/debts/${debtId}/renegotiations`);
    expect(hist.data.length).toBe(1);
    expect(hist.data[0].keptCycle).toBe(false);
    expect(hist.data[0].note).toBe('Reestructuración');
  });

  it('cuota pactada sin plazo: deriva las cuotas; ciclo igual conserva el día', async () => {
    const r = await req('POST', `/v1/debts/${debtId}/renegotiate/preview`, { monthlyPayment: 2_000_000 });
    expect(r.status).toBe(201);
    expect(r.data.keptCycle).toBe(true);
    expect(r.data.after.paymentDay).toBe(15);
    expect(r.data.after.remainingInstallments).toBeGreaterThan(30);
    expect(r.data.after.remainingInstallments).toBeLessThan(60);
  });

  it('una cuota que no cubre los intereses se rechaza con explicación', async () => {
    const r = await req('POST', `/v1/debts/${debtId}/renegotiate/preview`, { monthlyPayment: 1_000 });
    expect(r.status).toBe(400);
    expect(String(r.data.message)).toContain('intereses');
  });

  it('las tarjetas no se renegocian aquí (mensaje honesto)', async () => {
    const r = await req('POST', `/v1/debts/${cardId}/renegotiate/preview`, { interestRate: 20 });
    expect(r.status).toBe(400);
    expect(String(r.data.message)).toContain('tarjeta');
  });
});
