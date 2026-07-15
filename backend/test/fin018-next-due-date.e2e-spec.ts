import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * FIN-018 · Corrección de `nextDueDate` (incidencia elevada por el CPSAO tras
 * IMP-0018 v1.0): registrar un pago de deuda debe AVANZAR la fecha del próximo
 * pago — hasta la próxima ocurrencia FUTURA conservando el día ancla — y
 * limpiarla si la deuda queda saldada. Contra app + BD reales.
 *
 * Ejecución: `npm run test:e2e` (requiere el Postgres de docker levantado).
 */
describe('FIN-018 · avance de nextDueDate al registrar pagos', () => {
  let app: INestApplication;
  let prisma: PrismaService;
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

  const newDebt = async (name: string, amount: number) => {
    const r = await req('POST', '/v1/debts', {
      name,
      debtType: 'libre_inversion',
      originalAmount: amount,
      currentBalance: amount,
      startDate: '2026-01-15',
      termMonths: 24,
      interestRate: 15,
      rateBasis: 'EA',
    });
    expect(r.status).toBe(201);
    return r.data.debt;
  };

  const payDebt = (debtId: string, amount: number) =>
    req('POST', '/v1/transactions', {
      kind: 'pago_deuda',
      amount,
      occurredAt: new Date().toISOString(),
      debtId,
    });

  const dueDateOf = async (debtId: string): Promise<string | null> => {
    const d = await prisma.debt.findUnique({ where: { id: debtId } });
    return d?.nextDueDate ? d.nextDueDate.toISOString().slice(0, 10) : null;
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
      email: `e2e-fin018-due-${Date.now()}@millo.test`,
      password: 'Passw0rd!e2e',
    });
    token = reg.data.tokens.accessToken;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('fecha VENCIDA (deuda sin pagos previos): un pago la avanza a la próxima ocurrencia FUTURA conservando el día ancla', async () => {
    const debt = await newDebt('E2E due vencida', 2_000_000);
    // Se reproduce el caso real de la captura: next_due_date meses atrás.
    const stale = new Date();
    stale.setUTCMonth(stale.getUTCMonth() - 3);
    stale.setUTCDate(28);
    await prisma.debt.update({
      where: { id: debt.id },
      data: { nextDueDate: new Date(Date.UTC(stale.getUTCFullYear(), stale.getUTCMonth(), 28)) },
    });

    const pay = await payDebt(debt.id, 100_000);
    expect(pay.status).toBe(201);

    const due = await dueDateOf(debt.id);
    expect(due).not.toBeNull();
    const dueDate = new Date(due + 'T00:00:00Z');
    expect(dueDate.getTime()).toBeGreaterThan(Date.now()); // FUTURA, ya no vencida
    expect(dueDate.getUTCDate()).toBe(28); // conserva el día ancla
    // Es la PRÓXIMA ocurrencia (a lo sumo ~1 mes adelante), no un salto arbitrario.
    expect(dueDate.getTime() - Date.now()).toBeLessThan(32 * 24 * 3600 * 1000);
  });

  it('fecha FUTURA: un pago la avanza exactamente un mes (cuota del periodo cubierta)', async () => {
    const debt = await newDebt('E2E due futura', 2_000_000);
    // Fecha futura explícita: día 15 del mes que viene.
    const now = new Date();
    const future = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 15));
    await prisma.debt.update({ where: { id: debt.id }, data: { nextDueDate: future } });

    const pay = await payDebt(debt.id, 100_000);
    expect(pay.status).toBe(201);

    const after = await dueDateOf(debt.id);
    const a = new Date(after + 'T00:00:00Z');
    const monthsDiff =
      (a.getUTCFullYear() - future.getUTCFullYear()) * 12 +
      (a.getUTCMonth() - future.getUTCMonth());
    expect(monthsDiff).toBe(1); // exactamente un mes: la cuota del periodo quedó cubierta
    expect(a.getUTCDate()).toBe(15); // mismo día ancla
  });

  it('pago que salda la deuda: status pagada y next_due_date en NULL', async () => {
    const debt = await newDebt('E2E due saldada', 500_000);
    const pay = await payDebt(debt.id, 500_000);
    expect(pay.status).toBe(201);

    const d = await prisma.debt.findUnique({ where: { id: debt.id } });
    expect(d?.status).toBe('pagada');
    expect(d?.nextDueDate).toBeNull();
  });
});
