import { ConversationService, ConversationInput } from './conversation.service';

/**
 * FIN-042 · Flujo del bot con documentos: consentimiento específico → extracción (IA
 * mockeada) → propuesta pendiente → sí/no/corrección → alta por el dominio (mockeado).
 * Regla de oro (DEC-0029): NADA se registra sin confirmación explícita.
 */
describe('ConversationService · documentos (FIN-042)', () => {
  const file = async () => ({ data: Buffer.from('img'), mimeType: 'image/jpeg' });
  const input = (over: Partial<ConversationInput>): ConversationInput => ({
    userId: 'u1',
    text: '',
    type: 'text',
    channelLabel: 'Telegram',
    source: 'telegram',
    verify: async () => false,
    ...over,
  });

  const build = (opts: { consented?: boolean; available?: boolean; extraction?: unknown; pending?: unknown } = {}) => {
    const store: { pending: unknown } = { pending: opts.pending ?? null };
    const prisma = {
      userSettings: {
        findUnique: jest.fn().mockResolvedValue(opts.consented === false ? { docsAiConsentAt: null } : { docsAiConsentAt: new Date() }),
        upsert: jest.fn(),
      },
      botPendingAction: {
        findUnique: jest.fn().mockImplementation(async () => store.pending),
        upsert: jest.fn().mockImplementation(async ({ create }: { create: { payload: unknown; kind: string } }) => {
          store.pending = { payload: create.payload, kind: create.kind, expiresAt: new Date(Date.now() + 60_000) };
        }),
        deleteMany: jest.fn().mockImplementation(async () => {
          store.pending = null;
        }),
      },
      financialEntity: { findFirst: jest.fn().mockResolvedValue({ id: 'ent1', name: 'Davivienda' }) },
      category: { findFirst: jest.fn().mockResolvedValue(null) },
      debt: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
      transaction: { findFirst: jest.fn() },
    };
    const transactions = { create: jest.fn().mockResolvedValue({ id: 't1' }), remove: jest.fn(), monthlyDashboard: jest.fn() };
    const debts = { create: jest.fn().mockResolvedValue({ debt: { id: 'd1', name: 'Davivienda · Tarjeta Visa' } }) };
    const cards = { registerPurchase: jest.fn().mockResolvedValue({}) };
    const moduleRef = { get: jest.fn((token: { name: string }) => (token.name === 'DebtsService' ? debts : cards)) };
    const docs = {
      isAvailable: jest.fn().mockReturnValue(opts.available ?? true),
      extract: jest.fn().mockResolvedValue(
        opts.extraction ?? {
          kind: 'extracto_tarjeta',
          entityName: 'Davivienda',
          productLabel: 'Tarjeta Visa',
          balance: 2_350_000,
          creditLimit: 4_000_000,
          totalPayment: 235_000,
          annualEffectiveRate: 28.3,
          dueDate: '2026-10-15',
          confidence: 0.9,
        },
      ),
    };
    const svc = new ConversationService(
      prisma as never,
      transactions as never,
      { outlaysByUser: jest.fn() } as never,
      { run: jest.fn() } as never,
      { hasValidConsent: jest.fn() } as never,
      docs as never,
      moduleRef as never,
    );
    return { svc, prisma, transactions, debts, cards, docs, store };
  };

  it('sin consentimiento de documentos: pide "autorizo" y NO descarga ni envía nada', async () => {
    const { svc, docs } = build({ consented: false });
    const reply = await svc.handle(input({ type: 'image', file }));
    expect(reply).toContain('autorizo');
    expect(docs.extract).not.toHaveBeenCalled();
  });

  it('"autorizo" registra el consentimiento y pide reenviar el documento', async () => {
    const { svc, prisma } = build({ consented: false });
    const reply = await svc.handle(input({ text: 'autorizo' }));
    expect(prisma.userSettings.upsert).toHaveBeenCalled();
    expect(reply).toContain('envíame');
  });

  it('IA no disponible: lo dice con honestidad y ofrece el camino en texto', async () => {
    const { svc } = build({ available: false });
    const reply = await svc.handle(input({ type: 'image', file }));
    expect(reply).toContain('no está disponible');
  });

  it('foto de extracto → propuesta clara con saldo, cupo, cuotas y pregunta de confirmación; nada creado aún', async () => {
    const { svc, debts, store } = build();
    const reply = await svc.handle(input({ type: 'image', file }));
    expect(reply).toContain('$2.350.000');
    expect(reply).toContain('Cupo: $4.000.000');
    expect(reply).toContain('10 cuotas');
    expect(reply).toContain('¿Creo esta deuda');
    expect(debts.create).not.toHaveBeenCalled();
    expect(store.pending).not.toBeNull();
  });

  it('"no" descarta la propuesta sin registrar', async () => {
    const { svc, debts, store } = build();
    await svc.handle(input({ type: 'image', file }));
    const reply = await svc.handle(input({ text: 'no' }));
    expect(reply).toContain('no registré nada');
    expect(debts.create).not.toHaveBeenCalled();
    expect(store.pending).toBeNull();
  });

  it('corrección "cuota 470.000" recalcula y vuelve a proponer', async () => {
    const { svc } = build();
    await svc.handle(input({ type: 'image', file }));
    const reply = await svc.handle(input({ text: 'cuota 470.000' }));
    expect(reply).toContain('Pago mensual: $470.000');
    expect(reply).toContain('5 cuotas');
  });

  it('"sí" crea la tarjeta por el dominio (DebtsService + CardService) y limpia la propuesta', async () => {
    const { svc, debts, cards, store } = build();
    await svc.handle(input({ type: 'image', file }));
    const reply = await svc.handle(input({ text: 'sí' }));
    expect(debts.create).toHaveBeenCalledWith('u1', expect.objectContaining({ debtType: 'tarjeta_credito', creditLimit: 4_000_000, paymentDay: 15, entityId: 'ent1' }));
    expect(cards.registerPurchase).toHaveBeenCalledWith('u1', expect.objectContaining({ debtId: 'd1', amount: 2_350_000, installments: 10 }));
    expect(reply).toContain('Creé la tarjeta');
    expect(store.pending).toBeNull();
  });

  it('comprobante → "sí" registra el gasto por TransactionsService', async () => {
    const { svc, transactions } = build({ extraction: { kind: 'comprobante', merchant: 'Éxito', amount: 45_000, occurredAt: '2026-09-27', confidence: 0.8 } });
    const p = await svc.handle(input({ type: 'image', file }));
    expect(p).toContain('¿Lo registro?');
    const reply = await svc.handle(input({ text: 'ok' }));
    expect(transactions.create).toHaveBeenCalledWith('u1', expect.objectContaining({ amount: 45_000, occurredAt: '2026-09-27T12:00:00Z' }), expect.objectContaining({ source: 'telegram' }));
    expect(reply).toContain('Registré tu gasto de $45.000');
  });

  it('documento ilegible: no propone en falso', async () => {
    const { svc, store } = build({ extraction: { kind: 'desconocido', confidence: 0.1, notes: 'imagen borrosa' } });
    const reply = await svc.handle(input({ type: 'image', file }));
    expect(reply).toContain('No reconocí');
    expect(store.pending).toBeNull();
  });

  it('con propuesta viva, un texto ajeno ("resumen") sigue el flujo normal', async () => {
    const { svc, transactions } = build();
    transactions.monthlyDashboard.mockResolvedValue({ income: 0, expense: 0, estimatedCashflow: 0 });
    await svc.handle(input({ type: 'image', file }));
    const reply = await svc.handle(input({ text: 'ayuda' }));
    expect(reply).toContain('Puedo ayudarte');
  });
});
