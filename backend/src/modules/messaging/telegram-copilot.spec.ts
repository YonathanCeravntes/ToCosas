import { ConversationService, ConversationInput, looksLikeQuestion } from './conversation.service';

/** FIN-046 Fase 2 · Telegram = Copiloto: preguntas al mismo cerebro, permiso por chat y acciones con "sí". */
describe('FIN-046 Fase 2 · el bot conversa con el Copiloto', () => {
  const input = (text: string): ConversationInput => ({
    userId: 'u1', text, type: 'text', channelLabel: 'Telegram', source: 'telegram', verify: async () => false,
  });

  const build = (opts: { consented: boolean; reply?: string; actions?: unknown[] }) => {
    const store: { pending: Record<string, unknown> | null } = { pending: null };
    const prisma = {
      category: { findFirst: jest.fn() },
      userSettings: { findUnique: jest.fn(), upsert: jest.fn() },
      conversation: { findFirst: jest.fn().mockResolvedValue({ id: 'c-reciente' }) },
      botPendingAction: {
        findUnique: jest.fn(async () => store.pending),
        upsert: jest.fn(async ({ create }: { create: Record<string, unknown> }) => { store.pending = create; }),
        deleteMany: jest.fn(async () => { store.pending = null; }),
      },
    };
    const consent = { hasValidConsent: jest.fn().mockResolvedValue(opts.consented), grant: jest.fn(), revoke: jest.fn() };
    const copilot = {
      sendMessage: jest.fn().mockResolvedValue({ conversationId: 'c-reciente', reply: opts.reply ?? 'Te quedan **$2.116.109**.', source: 'llm', aiRemainingToday: 9, actions: opts.actions ?? [] }),
    };
    const budget = { create: jest.fn().mockResolvedValue({ id: 'f1' }) };
    const svc = new ConversationService(
      prisma as never, {} as never, {} as never, { run: jest.fn() } as never, consent as never,
      { isAvailable: () => false } as never, {} as never, budget as never, copilot as never,
    );
    return { svc, prisma, consent, copilot, budget, store };
  };

  it('reconoce preguntas y no confunde un gasto con una pregunta', () => {
    expect(looksLikeQuestion('¿cuánto me queda este mes?')).toBe(true);
    expect(looksLikeQuestion('me alcanza para un carro')).toBe(true);
    expect(looksLikeQuestion('qué deuda pago primero')).toBe(true);
    expect(looksLikeQuestion('Gasté 20.000 en almuerzo')).toBe(false);
  });

  it('con permiso: la pregunta va al Copiloto, continúa el hilo reciente y responde en texto plano', async () => {
    const { svc, copilot } = build({ consented: true });
    const reply = await svc.handle(input('¿Cuánto me queda este mes?'));
    expect(copilot.sendMessage).toHaveBeenCalledWith('u1', '¿Cuánto me queda este mes?', 'c-reciente');
    expect(reply).toBe('Te quedan $2.116.109.');
  });

  it('sin permiso: no llama a la IA y explica cómo activarla', async () => {
    const { svc, copilot } = build({ consented: false });
    const reply = await svc.handle(input('¿qué deuda pago primero?'));
    expect(copilot.sendMessage).not.toHaveBeenCalled();
    expect(reply).toContain('activar ia');
  });

  it('"acepto ia" otorga el MISMO consentimiento del Copiloto de la app', async () => {
    const { svc, consent } = build({ consented: false });
    const reply = await svc.handle(input('acepto ia'));
    expect(consent.grant).toHaveBeenCalledWith('u1');
    expect(reply).toContain('la IA quedó activa');
  });

  it('acción propuesta "crear gasto fijo": pregunta, y con "sí" la crea por Presupuesto (§32)', async () => {
    const action = { type: 'crear_gasto_fijo', label: 'Crear gasto fijo: Arriendo $1.200.000 (día 5)', name: 'Arriendo', amount: 1_200_000, dayOfMonth: 5 };
    const { svc, budget, store } = build({ consented: true, reply: 'Te conviene registrar el arriendo.', actions: [action] });
    const first = await svc.handle(input('¿debo registrar mi arriendo de 1.200.000 el día 5?'));
    expect(first).toContain('¿Lo hago? Responde *sí* o *no*');
    expect(store.pending).toMatchObject({ kind: 'accion_copiloto' });
    const ack = await svc.handle(input('sí'));
    expect(budget.create).toHaveBeenCalledWith('u1', { kind: 'gasto', name: 'Arriendo', amount: 1_200_000, dayOfMonth: 5 });
    expect(ack).toContain('Guardé el gasto fijo');
    expect(store.pending).toBeNull();
  });

  it('abonar y ver plan se explican con la ruta en la app (el bot no mueve plata)', async () => {
    const { svc } = build({
      consented: true,
      reply: 'Abónale a Serfinanza.',
      actions: [{ type: 'abonar_deuda', label: 'Abonar', debtId: 'd1', debtName: 'Serfinanza', amount: 741000 }, { type: 'ver_plan', label: 'Ver plan' }],
    });
    const reply = await svc.handle(input('¿qué deuda pago primero?'));
    expect(reply).toContain('app → Deudas → Serfinanza → Abonar');
    expect(reply).toContain('app → Salud → Ver mi plan');
  });
});
