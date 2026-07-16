import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * FIN-036 (DEC-0036) · Confirmación de actualización por corte, contra app + BD
 * reales: día-1 (cero preguntas antes del corte); al corte pregunta lo declarado;
 * nivel 2 §42 (propone → el usuario confirma → guarda valor anterior → reversible;
 * "no cambió" congela); el cambio confirmado actualiza el campo EXISTENTE de Debt.
 *
 * Ejecución: `npm run test:e2e` (requiere el Postgres de docker levantado).
 */
describe('FIN-036 · inteligencia de actualización (día-1, §42 nivel 2, calma)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let base: string;
  let token: string;
  let cardId: string;

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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1');
    prisma = app.get(PrismaService);

    const reg = await req('POST', '/v1/auth/register', {
      email: `e2e-fin036-${Date.now()}@millo.test`,
      password: 'Passw0rd!e2e',
    });
    token = reg.data.tokens.accessToken;

    const card = await req('POST', '/v1/debts', {
      name: 'Tarjeta e2e', debtType: 'fintech', originalAmount: 0, currentBalance: 0,
      startDate: '2026-06-01', termMonths: 24, interestRate: 32, rateBasis: 'EA',
      creditLimit: 3_000_000, paymentDay: 10,
    });
    expect(card.status).toBe(201);
    cardId = card.data.debt.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('DÍA-1: recién creada (sin corte transcurrido) → cero confirmaciones', async () => {
    const { status, data } = await req('GET', '/v1/debts/reviews');
    expect(status).toBe(200);
    expect(data).toHaveLength(0); // el corte aún no pasa desde que la deuda existe
  });

  it('al pasar un corte, pregunta EXACTAMENTE lo que su modalidad declara (cupo)', async () => {
    // Simulamos el paso del tiempo: la deuda existe hace 40 días y su corte fue hace 6.
    const now = new Date();
    const past = new Date(now.getTime() - 40 * 24 * 3600 * 1000);
    const cut = new Date(now.getTime() - 6 * 24 * 3600 * 1000);
    await prisma.debt.update({ where: { id: cardId }, data: { createdAt: past, nextDueDate: cut } });

    const { data } = await req('GET', '/v1/debts/reviews');
    expect(data).toHaveLength(1); // cupo al_corte; la tasa es fija → calma
    expect(data[0]).toMatchObject({ debtId: cardId, field: 'creditLimit', currentValue: 3_000_000 });
  });

  it('§42 nivel 2 · confirmar el cambio aplica el campo, guarda el valor anterior y es trazable', async () => {
    const r = await req('POST', `/v1/debts/${cardId}/reviews/creditLimit`, { changed: true, newValue: 4_000_000 });
    expect(r.status).toBe(201);
    expect(r.data.previousValue).toBe(3_000_000); // reversible: el valor anterior queda guardado
    expect(r.data.acknowledgment).toContain('4.000.000');

    const debt = await req('GET', `/v1/debts/${cardId}`);
    expect(Number(debt.data.creditLimit)).toBe(4_000_000); // campo EXISTENTE actualizado (§32)

    // La revisión congela la ventana: ya no está pendiente.
    const { data } = await req('GET', '/v1/debts/reviews');
    expect(data).toHaveLength(0);
  });

  it('CALMA · "no cambió" congela sin tocar el valor (y no se repregunta en la ventana)', async () => {
    // Abrimos una ventana nueva: el corte volvió a pasar.
    await prisma.debtFieldReview.deleteMany({ where: { debtId: cardId } });
    const { data: before } = await req('GET', '/v1/debts/reviews');
    expect(before).toHaveLength(1);

    const r = await req('POST', `/v1/debts/${cardId}/reviews/creditLimit`, { changed: false });
    expect(r.status).toBe(201);
    expect(r.data.acknowledgment).toContain('sigue igual');

    const debt = await req('GET', `/v1/debts/${cardId}`);
    expect(Number(debt.data.creditLimit)).toBe(4_000_000); // intacto
    expect((await req('GET', '/v1/debts/reviews')).data).toHaveLength(0); // congelado
  });

  it('whitelist del descriptor: un campo NO declarado por la modalidad se rechaza (400)', async () => {
    const r = await req('POST', `/v1/debts/${cardId}/reviews/monthlyPayment`, { changed: true, newValue: 99 });
    expect(r.status).toBe(400); // fintech no revisa monthlyPayment — solo lo declarado
  });
});
