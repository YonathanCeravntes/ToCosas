import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CashflowAlertsService } from '../src/modules/cron/cashflow-alerts.service';
import { WeeklySummaryService, isoWeek } from '../src/modules/cron/weekly-summary.service';
import { bogotaWeekday } from '../src/modules/cron/daily-pipeline.service';

/**
 * FIN-046 Fase 3 · Millo proactivo: el despertador (protegido por CRON_SECRET) corre
 * el recorrido diario; "te sobró" crea UN aviso por ciclo con la jugada del plan;
 * el resumen semanal arma el mensaje con las fuentes únicas.
 */
describe('FIN-046 · Millo proactivo', () => {
  let app: INestApplication;
  let base: string;
  let token = '';
  let userId = '';
  const email = `e2e-fin046p-${Date.now()}@millo.test`;
  const SECRET = 'secreto-de-prueba-123';

  const req = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data: any = null;
    try { data = await res.json(); } catch { /* sin cuerpo */ }
    return { status: res.status, data };
  };

  beforeAll(async () => {
    process.env.CRON_SECRET = SECRET;
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
    await req('POST', '/v1/income/profile', { workProfile: 'empleado' });
    await req('POST', '/v1/income/sources', { name: 'Salario', amount: 5_000_000, dayOfMonth: 1 });
    const d = await req('POST', '/v1/debts', {
      name: 'Crédito e2e', debtType: 'libre_inversion', originalAmount: 10_000_000, currentBalance: 6_000_000,
      startDate: '2026-01-10', termMonths: 36, interestRate: 22, rateBasis: 'EA', monthlyPayment: 400_000, paymentDay: 10,
    });
    expect(d.status).toBe(201);
  });

  afterAll(async () => {
    delete process.env.CRON_SECRET;
    await app.close();
  });

  it('el despertador exige la clave', async () => {
    expect((await req('POST', '/v1/internal/cron/daily', undefined, {})).status).toBe(401);
    expect((await req('POST', '/v1/internal/cron/daily', undefined, { 'x-cron-secret': 'otra' })).status).toBe(401);
  });

  it('con la clave corre el recorrido diario completo y cada paso reporta', async () => {
    const r = await req('POST', '/v1/internal/cron/daily?wait=1', undefined, { 'x-cron-secret': SECRET });
    expect(r.status).toBe(202);
    const names = r.data.steps.map((s: { step: string }) => s.step);
    for (const n of ['snapshot', 'tendencias', 'recomendaciones', 'te_sobro', 'avisos', 'recordatorios']) expect(names).toContain(n);
    const failed = r.data.steps.filter((s: { ok: boolean }) => !s.ok);
    expect(failed).toEqual([]);
  });

  it('"te sobró": cerca del cierre crea UN aviso con la jugada del plan, y no lo repite', async () => {
    const alerts = app.get(CashflowAlertsService);
    const now = new Date();
    // Penúltimo día del mes SIGUIENTE (el de este mes ya pudo avisarse en el recorrido diario).
    const nearEnd = new Date(now.getFullYear(), now.getMonth() + 2, -1, 12);
    expect(await alerts.forUser(userId, nearEnd)).toBe(true);
    expect(await alerts.forUser(userId, nearEnd)).toBe(false);
    const prisma = app.get(PrismaService);
    const ins = await prisma.insight.findFirst({ where: { userId, dedupeKey: { startsWith: 'fin046_sobro_' } }, orderBy: { createdAt: 'desc' } });
    expect(ins?.type).toBe('oportunidad');
    expect(ins?.body).toContain('Crédito e2e');
    expect(ins?.body).toContain('Ver mi plan');
  });

  it('a mitad de ciclo no molesta', async () => {
    const alerts = app.get(CashflowAlertsService);
    const now = new Date();
    expect(await alerts.forUser(userId, new Date(now.getFullYear(), now.getMonth() + 2, 10, 12))).toBe(false);
  });

  it('el resumen semanal trae lo que queda, el próximo pago y la jugada', async () => {
    const text = await app.get(WeeklySummaryService).compose(userId);
    expect(text).toContain('Tu semana en Millo');
    expect(text).toContain('Te quedan');
    expect(text).toContain('Crédito e2e');
  });

  it('utilidades de calendario', () => {
    expect(isoWeek(new Date(2026, 8, 29))).toBe('2026-W40');
    expect(bogotaWeekday(new Date('2026-09-27T15:00:00Z'))).toBe(0); // domingo en Bogotá
  });
});
