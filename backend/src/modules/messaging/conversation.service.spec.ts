import { ForbiddenException } from '@nestjs/common';
import { ConversationService, ConversationInput } from './conversation.service';
import { FORBIDDEN_BRAND_TERMS } from '../copilot/copilot.constants';

/**
 * FIN-029 · Motor conversacional único (DEC-0029 §5). Se prueba el
 * comportamiento del CANAL: acuse explícito, honestidad, simular solo
 * escenarios, paywall honesto y genericidad — con el dominio mockeado (el
 * motor no reimplementa lógica financiera).
 */
describe('ConversationService (FIN-029, DEC-0029 §5)', () => {
  const baseInput = (text: string, over: Partial<ConversationInput> = {}): ConversationInput => ({
    userId: 'u1',
    text,
    type: 'text',
    channelLabel: 'Telegram',
    source: 'telegram',
    verify: async () => false,
    ...over,
  });

  const build = (over: {
    prisma?: Record<string, unknown>;
    txCreate?: jest.Mock;
    txRemove?: jest.Mock;
    simRun?: jest.Mock;
  } = {}) => {
    const prisma = {
      category: { findFirst: jest.fn().mockResolvedValue(null) },
      financialEntity: { findFirst: jest.fn().mockResolvedValue(null) },
      debt: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue(null) },
      transaction: { findFirst: jest.fn().mockResolvedValue(null) },
      ...over.prisma,
    } as never;
    const transactions = {
      create: over.txCreate ?? jest.fn().mockResolvedValue({ id: 't1' }),
      remove: over.txRemove ?? jest.fn().mockResolvedValue({ deleted: true }),
      monthlyDashboard: jest.fn().mockResolvedValue({ income: 0, expense: 0, estimatedCashflow: 0 }),
    } as never;
    const debtOutlay = { outlaysByUser: jest.fn().mockResolvedValue({ totalOutlay: 0 }) } as never;
    const simulations = { run: over.simRun ?? jest.fn() } as never;
    return new ConversationService(prisma, transactions, debtOutlay, simulations);
  };

  it('§5.1 — al registrar un gasto, el acuse dice QUÉ y DÓNDE', async () => {
    const svc = build();
    const reply = await svc.handle(baseInput('Gasté $45.000 en mercado'));
    expect(reply).toContain('45.000');
    expect(reply.toLowerCase()).toContain('en tus movimientos'); // el DÓNDE
  });

  it('§5.1 — al anular, también acusa con el DÓNDE', async () => {
    const svc = build({
      prisma: { transaction: { findFirst: jest.fn().mockResolvedValue({ id: 't9', amount: 30_000 }) } },
    });
    const reply = await svc.handle(baseInput('deshacer'));
    expect(reply.toLowerCase()).toContain('anulé');
    expect(reply.toLowerCase()).toContain('en tus movimientos');
  });

  it('§5.2 — cuando no entiende, lo dice claro y NUNCA finge haber anotado', async () => {
    const svc = build();
    const reply = await svc.handle(baseInput('asdfghjk'));
    expect(reply.toLowerCase()).toContain('no te entend');
    // Jamás un falso "registré/anoté/listo".
    expect(/registr[eé]|anot[eé]|✅/.test(reply)).toBe(false);
  });

  it('§5.3 — simular MUESTRA el escenario, sin empujar la decisión', async () => {
    const svc = build({
      prisma: {
        debt: {
          findMany: jest.fn().mockResolvedValue([{ id: 'd1', name: 'Tarjeta', interestRate: 30 }]),
          findUnique: jest.fn(),
        },
      },
      simRun: jest.fn().mockResolvedValue({ specifics: { monthsSaved: 8, interestSaved: 2_400_000 } }),
    });
    const reply = await svc.handle(baseInput('¿qué pasa si abono $200.000 a mi deuda?'));
    expect(reply).toContain('8 meses antes');
    expect(reply).toContain('2.400.000');
    // NO empuja: nada de "deberías" ni imperativos de decisión.
    expect(/deber[ií]as|te conviene|haz(lo)?/.test(reply.toLowerCase())).toBe(false);
    // NO registró nada (es hipotético).
    expect(reply).not.toContain('Registré');
  });

  it('§5.4 — al agotar la cuota de IA, el paywall es honesto (no error ni corte seco)', async () => {
    const svc = build({
      prisma: {
        debt: { findMany: jest.fn().mockResolvedValue([{ id: 'd1', name: 'Tarjeta', interestRate: 30 }]), findUnique: jest.fn() },
      },
      simRun: jest.fn().mockRejectedValue(new ForbiddenException({ code: 'PREMIUM_REQUIRED' })),
    });
    const reply = await svc.handle(baseInput('simula si abono 100000 a mi deuda'));
    expect(reply.toLowerCase()).toContain('millo+');
    expect(reply).not.toMatch(/error|500|forbidden/i);
  });

  it('§5.5 — genericidad: las respuestas NUNCA nombran marcas/entidades', async () => {
    const svc = build();
    const replies = await Promise.all([
      svc.handle(baseInput('ayuda')),
      svc.handle(baseInput('Gasté $10.000 en almuerzo')),
      svc.handle(baseInput('hola')),
      svc.handle(baseInput('no sé qué decir')),
    ]);
    const text = replies.join(' \n ').toLowerCase();
    for (const term of FORBIDDEN_BRAND_TERMS) {
      expect(text.includes(term)).toBe(false);
    }
  });

  it('el motor invoca el servicio central para registrar (no reimplementa lógica)', async () => {
    const txCreate = jest.fn().mockResolvedValue({ id: 't1' });
    const svc = build({ txCreate });
    await svc.handle(baseInput('Gasté $12.000 en café'));
    expect(txCreate).toHaveBeenCalledTimes(1);
  });
});
