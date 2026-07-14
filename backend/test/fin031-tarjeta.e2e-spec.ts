import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * FIN-031 · Espina del SO Financiero — compra con tarjeta de crédito de punta a
 * punta (DEC-0031). Contra app + BD reales:
 *  - la compra genera cuotas, mueve saldo/cupo (DERIVADOS) — trazable;
 *  - "lo comprometido" (§32) incluye la cuota por la ÚNICA autoridad
 *    (DebtOutlayService) → aparece en /budget/monthly;
 *  - sin duplicados: no nace una 2ª deuda;
 *  - reversión: anular sin cuotas pagadas revierte; con cuota pagada se bloquea.
 *
 * Ejecución: `npm run test:e2e` (requiere el Postgres de docker levantado).
 */
describe('FIN-031 · compra con tarjeta de crédito (espina, §32/§42)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let base: string;
  let token: string;
  let userId: string;
  let cardId: string;

  const req = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1');
    prisma = app.get(PrismaService);

    const reg = await req('POST', '/v1/auth/register', {
      email: `e2e-fin031-${Date.now()}@millo.test`,
      password: 'Passw0rd!e2e',
    });
    token = reg.data.tokens.accessToken;
    userId = reg.data.user.id;

    const card = await req('POST', '/v1/debts', {
      name: 'Tarjeta e2e',
      debtType: 'tarjeta_credito',
      originalAmount: 0, // el saldo real de una tarjeta se deriva de sus compras
      currentBalance: 0,
      startDate: '2026-06-15',
      termMonths: 24,
      interestRate: 28,
      rateBasis: 'EA',
      creditLimit: 3_000_000,
    });
    expect(card.status).toBe(201);
    cardId = card.data.debt.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('cupo inicial: 3.000.000 disponible, 0 utilizado (derivado)', async () => {
    const { data } = await req('GET', `/v1/debts/cards/${cardId}`);
    expect(data.creditLimit).toBe(3_000_000);
    expect(data.usedAmount).toBe(0);
    expect(data.availableCredit).toBe(3_000_000);
  });

  it('una compra de 600.000 a 3 cuotas mueve saldo/cupo y NO crea una 2ª deuda', async () => {
    const before = await req('GET', '/v1/debts');
    const debtsBefore = before.data.length;

    const purchase = await req('POST', `/v1/debts/cards/${cardId}/purchases`, {
      amount: 600_000,
      installments: 3,
    });
    expect(purchase.status).toBe(201);
    expect(purchase.data.perInstallment).toBe(200_000);
    expect(purchase.data.acknowledgment).toContain('200.000'); // acuse §5.1

    const card = await req('GET', `/v1/debts/cards/${cardId}`);
    expect(card.data.usedAmount).toBe(600_000); // 3×200k pendientes
    expect(card.data.availableCredit).toBe(2_400_000);

    // Sin duplicados (I): no nació una 2ª deuda.
    const after = await req('GET', '/v1/debts');
    expect(after.data.length).toBe(debtsBefore);
  });

  it('§32: la cuota de la tarjeta entra en "lo comprometido" por la única autoridad', async () => {
    const { data } = await req('GET', '/v1/budget/monthly');
    const cardCommitment = data.debts.find((d: { debtId: string }) => d.debtId === cardId);
    expect(cardCommitment).toBeDefined();
    expect(cardCommitment.amount).toBe(200_000); // la próxima cuota, no la "cuota" del contrato
  });

  it('§42: anular la compra SIN cuotas pagadas revierte el saldo/cupo', async () => {
    const p = await req('POST', `/v1/debts/cards/${cardId}/purchases`, { amount: 300_000, installments: 2 });
    const card1 = await req('GET', `/v1/debts/cards/${cardId}`);
    const purchaseId = card1.data.purchases[0].id;
    expect(card1.data.usedAmount).toBe(900_000); // 600k + 300k

    const del = await req('DELETE', `/v1/debts/cards/purchases/${purchaseId}`);
    expect(del.status).toBe(200);
    const card2 = await req('GET', `/v1/debts/cards/${cardId}`);
    expect(card2.data.usedAmount).toBe(600_000); // vuelve al estado previo
    void p;
  });

  it('§4.5: anular una compra CON una cuota pagada se BLOQUEA con la ruta de corrección', async () => {
    const p = await req('POST', `/v1/debts/cards/${cardId}/purchases`, { amount: 400_000, installments: 4 });
    const card = await req('GET', `/v1/debts/cards/${cardId}`);
    const purchaseId = card.data.purchases[0].id;
    // Simulamos el pago de una cuota (marca paidAt) directo en BD.
    const inst = await prisma.cardInstallment.findFirst({ where: { cardPurchaseId: purchaseId }, orderBy: { periodNo: 'asc' } });
    await prisma.cardInstallment.update({ where: { id: inst!.id }, data: { paidAt: new Date() } });

    const del = await req('DELETE', `/v1/debts/cards/purchases/${purchaseId}`);
    expect(del.status).toBe(409); // ConflictException
    expect(JSON.stringify(del.data)).toContain('falsear tu historial');
    void p;
  });
});
