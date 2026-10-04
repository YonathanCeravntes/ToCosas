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

  const build = (opts: { consented?: boolean; available?: boolean; extraction?: unknown; pending?: unknown; vault?: Record<string, jest.Mock> } = {}) => {
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
    // FIN-054: sin permiso de guardar por defecto (la bóveda tiene sus propias pruebas).
    const vault = {
      save: jest.fn().mockResolvedValue({ saved: false, reason: 'sin_permiso' }),
      findMatchingExpense: jest.fn().mockResolvedValue(null),
      linkTransaction: jest.fn(),
      consentStatus: jest.fn().mockResolvedValue({ accepted: false }),
      grantConsent: jest.fn(),
      revokeConsent: jest.fn(),
      ...opts.vault,
    };
    const moduleRef = {
      get: jest.fn((token: { name: string }) =>
        token.name === 'DebtsService' ? debts : token.name === 'DocumentsService' ? vault : cards,
      ),
    };
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
      { create: jest.fn() } as never,
      { sendMessage: jest.fn() } as never,
    );
    return { svc, prisma, transactions, debts, cards, docs, store, vault };
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
    expect(reply).toContain('Pago mensual (mínimo): $470.000');
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

  // --- FIN-054 · Mis documentos ---

  it('FIN-054: factura electrónica con permiso → se guarda y, al confirmar, queda enlazada a su gasto', async () => {
    const { svc, vault, transactions } = build({
      extraction: { kind: 'factura_electronica', merchant: 'Éxito', issuerNit: '890900608-9', cufe: 'ab'.repeat(48), amount: 186_400, occurredAt: '2026-09-28', paymentMethod: 'tarjeta', confidence: 0.9 },
      vault: { save: jest.fn().mockResolvedValue({ saved: true, duplicate: false, fileStored: true, document: { id: 'doc1' } }) },
    });
    const p = await svc.handle(input({ type: 'image', file }));
    expect(vault.save).toHaveBeenCalledWith('u1', expect.objectContaining({ kind: 'factura', issuer: 'Éxito', paymentMethod: 'tarjeta', total: 186_400 }), expect.anything());
    expect(p).toContain('factura electrónica');
    expect(p).toContain('Lo guardé en *Mis documentos*');
    await svc.handle(input({ text: 'sí' }));
    expect(transactions.create).toHaveBeenCalled();
    expect(vault.linkTransaction).toHaveBeenCalledWith('u1', 'doc1', 't1');
  });

  it('FIN-054: si el gasto ya estaba registrado, la factura solo se enlaza (no propone otro gasto)', async () => {
    const { svc, vault, store } = build({
      extraction: { kind: 'factura_electronica', merchant: 'Claro', cufe: 'cd'.repeat(48), amount: 95_000, occurredAt: '2026-09-20', confidence: 0.9 },
      vault: {
        save: jest.fn().mockResolvedValue({ saved: true, duplicate: false, fileStored: true, document: { id: 'doc2' } }),
        findMatchingExpense: jest.fn().mockResolvedValue({ id: 'tx9', note: 'Claro' }),
      },
    });
    const reply = await svc.handle(input({ type: 'image', file }));
    expect(reply).toContain('Ya tenías registrado ese gasto');
    expect(vault.linkTransaction).toHaveBeenCalledWith('u1', 'doc2', 'tx9');
    expect(store.pending).toBeNull();
  });

  it('FIN-054: extracto de cuenta y certificado NO son deudas ni gastos: se guardan y se explica para qué sirven', async () => {
    const saved = jest.fn().mockResolvedValue({ saved: true, duplicate: false, fileStored: false, document: { id: 'd' } });
    const a = build({ extraction: { kind: 'extracto_cuenta', entityName: 'Bancolombia', balance: 3_200_000, statementDate: '2026-08-31', confidence: 0.9 }, vault: { save: saved } });
    const r1 = await a.svc.handle(input({ type: 'image', file }));
    expect(r1).toContain('No es una deuda');
    expect(a.debts.create).not.toHaveBeenCalled();
    expect(a.store.pending).toBeNull();
    const b = build({ extraction: { kind: 'certificado', entityName: 'Mi empresa', certificateType: 'ingresos_retenciones', taxYear: 2025, amount: 60_000_000, confidence: 0.9 }, vault: { save: saved } });
    const r2 = await b.svc.handle(input({ type: 'image', file }));
    expect(r2).toContain('certificado de ingresos y retenciones');
    expect(r2).toContain('borrador de tu renta');
    expect(saved).toHaveBeenLastCalledWith('u1', expect.objectContaining({ kind: 'certificado', year: 2025, certificateType: 'ingresos_retenciones' }), expect.anything());
  });

  it('FIN-054: sin permiso de guardar, invita a "guardar documentos"; factura de salud sin su permiso no se guarda', async () => {
    const a = build({ extraction: { kind: 'comprobante', merchant: 'Éxito', amount: 45_000, occurredAt: '2026-09-27', confidence: 0.8 } });
    expect(await a.svc.handle(input({ type: 'image', file }))).toContain('guardar documentos');
    const b = build({
      extraction: { kind: 'comprobante', merchant: 'Farmatodo', amount: 42_300, occurredAt: '2026-09-25', confidence: 0.8 },
      vault: { save: jest.fn().mockResolvedValue({ saved: false, reason: 'salud_sin_permiso' }) },
    });
    const r = await b.svc.handle(input({ type: 'image', file }));
    expect(b.vault.save).toHaveBeenCalledWith('u1', expect.objectContaining({ isHealth: true }), expect.anything());
    expect(r).toContain('dato sensible');
  });

  it('FIN-054: "guardar documentos" muestra el aviso de privacidad y "acepto guardar" da el permiso (sin salud)', async () => {
    const { svc, vault } = build();
    const t = await svc.handle(input({ text: 'guardar documentos' }));
    expect(t).toContain('Estados Unidos');
    expect(t).toContain('5 años');
    expect(t).toContain('acepto guardar');
    const ok = await svc.handle(input({ text: 'acepto guardar' }));
    expect(vault.grantConsent).toHaveBeenCalledWith('u1', false);
    expect(ok).toContain('incluir salud');
  });

  it('BT-026: "Guardar documento" (singular, mayúscula) también muestra el aviso; "no guardes mis facturas" revoca', async () => {
    const { svc, vault } = build();
    expect(await svc.handle(input({ text: 'Guardar documento' }))).toContain('acepto guardar');
    expect(await svc.handle(input({ text: 'guárdame las facturas' }))).toContain('acepto guardar');
    await svc.handle(input({ text: 'No guardes mis facturas' }));
    expect(vault.revokeConsent).toHaveBeenCalledWith('u1', false);
  });
});
