import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * FIN-024 · Estado de mora derivado (§32: helper único `overdueDays`).
 * Contra app + BD reales: una deuda con fecha vencida expone los días de mora
 * en el list, el detalle y el summary; una deuda al día expone null y no
 * cambia nada (regresión).
 *
 * Ejecución: `npm run test:e2e` (requiere el Postgres de docker levantado).
 */
describe('FIN-024 · overdueDays en list, detalle y summary', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let base: string;
  let token: string;
  let overdueId: string;
  let currentId: string;

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
      email: `e2e-fin024-mora-${Date.now()}@millo.test`,
      password: 'Passw0rd!e2e',
    });
    token = reg.data.tokens.accessToken;

    const mk = async (name: string) => {
      const r = await req('POST', '/v1/debts', {
        name,
        debtType: 'libre_inversion',
        originalAmount: 2_000_000,
        currentBalance: 2_000_000,
        startDate: '2026-06-15',
        termMonths: 12,
        interestRate: 20,
        rateBasis: 'EA',
      });
      expect(r.status).toBe(201);
      return r.data.debt.id as string;
    };
    overdueId = await mk('E2E vencida');
    currentId = await mk('E2E al día');

    const hoy = new Date();
    const hace12 = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() - 12));
    const en9 = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() + 9));
    await prisma.debt.update({ where: { id: overdueId }, data: { nextDueDate: hace12 } });
    await prisma.debt.update({ where: { id: currentId }, data: { nextDueDate: en9 } });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('list: la vencida expone overdueDays=12; la al día, null (regresión)', async () => {
    const { status, data } = await req('GET', '/v1/debts');
    expect(status).toBe(200);
    const vencida = data.find((d: { id: string }) => d.id === overdueId);
    const alDia = data.find((d: { id: string }) => d.id === currentId);
    expect(vencida.overdueDays).toBe(12);
    expect(alDia.overdueDays).toBeNull();
  });

  it('detalle: mismo helper, mismo valor', async () => {
    const { data } = await req('GET', `/v1/debts/${overdueId}`);
    expect(data.overdueDays).toBe(12);
  });

  it('summary: upcoming trae el estado por deuda con el MISMO helper (§32)', async () => {
    const { data } = await req('GET', '/v1/debts/summary');
    const vencida = data.upcoming.find((u: { debtId: string }) => u.debtId === overdueId);
    const alDia = data.upcoming.find((u: { debtId: string }) => u.debtId === currentId);
    expect(vencida.overdueDays).toBe(12);
    expect(alDia.overdueDays).toBeNull();
  });
});
