import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AnthropicClient, ToolExecutor } from '../src/modules/copilot/anthropic.client';

/**
 * FIN-046 Fase 1 · El Copiloto con IA usa las herramientas nuevas (plan de flujo,
 * Te queda, próximos pagos) y PROPONE acciones que vuelven como botones. Nada de
 * lo que cruza hacia la IA lleva el nombre de la deuda (vistas minimizadas).
 *
 * La IA se reemplaza por un doble que llama las tools como lo haría el modelo.
 */
describe('FIN-046 · Copiloto con IA de verdad', () => {
  let app: INestApplication;
  let base: string;
  let token = '';
  const email = `e2e-fin046-${Date.now()}@millo.test`;
  const captured: Record<string, unknown> = {};

  const fakeLlm = {
    isConfigured: () => true,
    circuitOpen: () => false,
    async chat(contextJson: string, _history: unknown, exec: ToolExecutor) {
      captured.context = contextJson;
      captured.plan = await exec('get_cashflow_plan', {});
      captured.budget = await exec('get_budget_now', {});
      captured.upcoming = await exec('get_upcoming_payments', {});
      captured.a1 = await exec('propose_action', { type: 'abonar_deuda', debtRef: 'deuda #1', amount: 200000 });
      captured.a2 = await exec('propose_action', { type: 'crear_gasto_fijo', name: 'Arriendo', amount: 1200000, dayOfMonth: 5 });
      captured.bad = await exec('propose_action', { type: 'abonar_deuda', debtRef: 'deuda #9' });
      return { text: 'Abónale a la deuda #1. Te dejo el botón.', inputTokens: 10, outputTokens: 10, model: 'fake' };
    },
    extractStructured: () => Promise.reject(new Error('no aplica')),
  };

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
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AnthropicClient)
      .useValue(fakeLlm)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1');

    const reg = await req('POST', '/v1/auth/register', { email, password: 'Passw0rd!e2e', acceptsDataPolicy: true });
    token = reg.data.tokens.accessToken;
    const d = await req('POST', '/v1/debts', {
      name: 'Banco Secreto XYZ',
      debtType: 'libre_inversion',
      originalAmount: 10_000_000,
      currentBalance: 8_000_000,
      startDate: '2026-01-10',
      termMonths: 36,
      interestRate: 24,
      rateBasis: 'EA',
      monthlyPayment: 390_000,
      paymentDay: 10,
    });
    expect(d.status).toBe(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('sin permiso responde en modo básico (plantilla), sin llamar a la IA', async () => {
    const r = await req('POST', '/v1/copilot/messages', { content: '¿Qué deuda pago primero?' });
    expect(r.status).toBe(201);
    expect(r.data.source).toBe('template');
    expect(captured.context).toBeUndefined();
  });

  it('con permiso: la IA responde (aunque la pregunta tenga plantilla) y devuelve acciones', async () => {
    expect((await req('POST', '/v1/copilot/consent')).status).toBe(201);
    const r = await req('POST', '/v1/copilot/messages', { content: '¿Qué deuda pago primero?' });
    expect(r.status).toBe(201);
    expect(r.data.source).toBe('llm');
    // La persona lee el nombre real; la IA solo vio "deuda #1".
    expect(r.data.reply).toBe('Abónale a Banco Secreto XYZ. Te dejo el botón.');
    expect(r.data.actions).toHaveLength(2);
    const [abono, fijo] = r.data.actions;
    expect(abono.type).toBe('abonar_deuda');
    expect(abono.debtName).toBe('Banco Secreto XYZ'); // el nombre real solo va a la app
    expect(abono.amount).toBe(200000);
    expect(fijo).toMatchObject({ type: 'crear_gasto_fijo', name: 'Arriendo', amount: 1200000, dayOfMonth: 5 });
    expect((captured.bad as { accepted: boolean }).accepted).toBe(false);
  });

  it('lo que cruza hacia la IA va por referencia: nunca el nombre de la deuda', () => {
    const plan = captured.plan as { steps: Array<{ ref: string; balance: number }> };
    expect(plan.steps[0].ref).toMatch(/^deuda #1 \(libre_inversion\)$/);
    expect(plan.steps[0].balance).toBe(8_000_000);
    const everything = JSON.stringify([captured.context, captured.plan, captured.budget, captured.upcoming, captured.a1]);
    expect(everything).not.toContain('Secreto');
  });
});
