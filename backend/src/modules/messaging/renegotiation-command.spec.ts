import { parseRenegotiation } from './renegotiation-command';
import { ConversationService, ConversationInput, describeRenegotiation } from './conversation.service';

describe('FIN-044 · renegociación por chat', () => {
  it('interpreta nombre y cambios con formato regional', () => {
    expect(parseRenegotiation('renegociar Davivienda libre cuotas 60 tasa 13,5 variable dia 15 desde 2026-11-01')).toEqual({
      debtQuery: 'Davivienda libre',
      dto: { remainingInstallments: 60, interestRate: 13.5, rateKind: 'variable', paymentDay: 15, keepCycle: false, effectiveFrom: '2026-11-01' },
    });
    expect(parseRenegotiation('renegociar moto cuota 850.000 saldo 12.000.000')).toEqual({
      debtQuery: 'moto',
      dto: { monthlyPayment: 850_000, currentBalance: 12_000_000 },
    });
    expect(parseRenegotiation('renegociar Davivienda')).toHaveProperty('error');
    expect(parseRenegotiation('resumen')).toBeNull();
  });

  const input = (text: string): ConversationInput => ({ userId: 'u1', text, type: 'text', channelLabel: 'Telegram', source: 'telegram', verify: async () => false });

  const build = () => {
    const store: { pending: unknown } = { pending: null };
    const preview = {
      debtId: 'd1', name: 'Davivienda · Libre inversión', scheduleModel: 'amortizado', effectiveFrom: '2026-11-15', keptCycle: false,
      before: { balance: 60e6, monthlyPayment: 980_000, remainingInstallments: 120, interestRate: 15.39, rateBasis: 'EA', rateKind: 'fija', paymentDay: 2, nextDueDate: '2026-10-02', payoffDate: '2036-09-02', remainingInterest: 57e6 },
      after: { balance: 60e6, monthlyPayment: 1_380_000, remainingInstallments: 60, interestRate: 13.5, rateBasis: 'EA', rateKind: 'variable', paymentDay: 15, nextDueDate: '2026-11-15', payoffDate: '2031-10-15', remainingInterest: 22e6 },
      changes: ['Cuotas restantes: 120 → 60', 'Tasa: 15.39% → 13.5% EA', 'Tipo de tasa: fija → variable'],
    };
    const reneg = { preview: jest.fn().mockResolvedValue(preview), apply: jest.fn().mockResolvedValue(preview) };
    const prisma = {
      userSettings: { findUnique: jest.fn(), upsert: jest.fn() },
      debt: { findMany: jest.fn().mockResolvedValue([{ id: 'd1', name: 'Davivienda · Libre inversión' }]) },
      botPendingAction: {
        findUnique: jest.fn().mockImplementation(async () => store.pending),
        upsert: jest.fn().mockImplementation(async ({ create }: { create: Record<string, unknown> }) => { store.pending = { ...create, expiresAt: new Date(Date.now() + 60_000) }; }),
        deleteMany: jest.fn().mockImplementation(async () => { store.pending = null; }),
      },
    };
    const svc = new ConversationService(prisma as never, {} as never, {} as never, {} as never, {} as never, { isAvailable: () => false } as never, { get: () => reneg } as never, {} as never);
    return { svc, reneg, store, preview };
  };

  it('muestra antes → después y solo aplica con "sí"', async () => {
    const { svc, reneg, store } = build();
    const p = await svc.handle(input('renegociar davivienda cuotas 60 tasa 13,5 variable dia 15'));
    expect(p).toContain('Renegociación de *Davivienda · Libre inversión*');
    expect(p).toContain('Cuotas restantes: 120 → 60');
    expect(p).toContain('¿La aplico?');
    expect(reneg.apply).not.toHaveBeenCalled();
    const ok = await svc.handle(input('sí'));
    expect(reneg.apply).toHaveBeenCalledWith('u1', 'd1', expect.objectContaining({ remainingInstallments: 60, rateKind: 'variable' }), 'telegram');
    expect(ok).toContain('Renegociación guardada');
    expect(store.pending).toBeNull();
  });

  it('"no" descarta sin aplicar', async () => {
    const { svc, reneg } = build();
    await svc.handle(input('renegociar davivienda cuotas 60'));
    expect(await svc.handle(input('no'))).toContain('no cambié nada');
    expect(reneg.apply).not.toHaveBeenCalled();
  });

  it('describeRenegotiation incluye fecha de fin e intereses', () => {
    const { preview } = build();
    const t = describeRenegotiation(preview as never);
    expect(t).toContain('Terminas: 2036-09-02 → 2031-10-15');
    expect(t).toContain('nuevo día de pago: 15');
  });
});
