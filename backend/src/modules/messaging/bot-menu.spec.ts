import { ConversationService, ConversationInput } from './conversation.service';
import { SpendableService } from '../budget/spendable.service';
import { TelegramProvider } from '../telegram/telegram.provider';
import { BOT_COMMANDS, BOT_DESCRIPTION, BOT_SHORT_DESCRIPTION, parseCallback, parseMenuCommand, txButtons } from './bot-menu';

const TX = '0b6e4f00-1111-4222-8333-444455556666';
const CAT_A = 'aaaa1111-0000-4000-8000-000000000001';
const CAT_B = 'bbbb2222-0000-4000-8000-000000000002';

/** FIN-055 · Bot de Telegram personalizado: menú, botones fijos y botones bajo cada gasto. */
describe('Bot de Telegram personalizado (FIN-055)', () => {
  it('reconoce los comandos del menú y los textos de los botones fijos', () => {
    expect(parseMenuCommand('/queda')).toBe('queda');
    expect(parseMenuCommand('/queda@Millo_finanzas_bot')).toBe('queda');
    expect(parseMenuCommand('/start')).toBe('start');
    expect(parseMenuCommand('¿Cuánto me queda?')).toBe('queda');
    expect(parseMenuCommand('Mis deudas')).toBe('deudas');
    expect(parseMenuCommand('Guardar factura')).toBe('documentos');
    expect(parseMenuCommand('Anotar gasto')).toBe('gasto');
    // Vinculación y movimientos no son comandos del menú.
    expect(parseMenuCommand('/start 123456')).toBeNull();
    expect(parseMenuCommand('almuerzo 18.500')).toBeNull();
    expect(parseMenuCommand('¿cuánto me queda si compro un carro?')).toBeNull();
  });

  it('respeta los límites de Telegram (descripción 512, "Acerca de" 120, callback 64 bytes)', () => {
    expect(BOT_DESCRIPTION.length).toBeLessThanOrEqual(512);
    expect(BOT_SHORT_DESCRIPTION.length).toBeLessThanOrEqual(120);
    expect(BOT_COMMANDS.map((c) => c.command)).toEqual(['queda', 'pagos', 'deudas', 'documentos', 'app', 'ayuda']);
    const longest = `sc:${TX}:${CAT_A.replace(/-/g, '').slice(0, 8)}`;
    expect(Buffer.byteLength(longest)).toBeLessThanOrEqual(64);
    for (const b of txButtons(TX).flat()) expect(Buffer.byteLength(b.data)).toBeLessThanOrEqual(64);
  });

  it('interpreta los callbacks y rechaza los que no reconoce', () => {
    expect(parseCallback(`un:${TX}`)).toEqual({ kind: 'undo', txId: TX });
    expect(parseCallback(`ct:${TX}`)).toEqual({ kind: 'categories', txId: TX });
    expect(parseCallback(`sc:${TX}:aaaa1111`)).toEqual({ kind: 'set_category', txId: TX, prefix: 'aaaa1111' });
    expect(parseCallback(`sc:${TX}`)).toBeNull();
    expect(parseCallback('borrar:todo')).toBeNull();
  });

  it('el proveedor entiende el toque de un botón (callback_query)', () => {
    const p = new TelegramProvider({ get: () => undefined } as never);
    const [m] = p.parseInbound({ update_id: 7, callback_query: { id: 'cb1', data: `un:${TX}`, message: { chat: { id: 55 } } } });
    expect(m).toMatchObject({ updateId: '7', chatId: '55', type: 'callback', text: `un:${TX}`, callbackId: 'cb1' });
  });

  describe('conversación', () => {
    const input = (text: string): ConversationInput => ({
      userId: 'u1',
      text,
      type: 'text',
      channelLabel: 'Telegram',
      source: 'telegram',
      verify: async () => false,
    });

    const build = () => {
      const tx = { id: TX, userId: 'u1', kind: 'gasto', amount: 18_500, note: 'almuerzo', categoryId: CAT_A };
      const prisma = {
        category: {
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn().mockResolvedValue([
            { id: CAT_A, name: 'Comida' },
            { id: CAT_B, name: 'Transporte' },
          ]),
        },
        financialEntity: { findFirst: jest.fn().mockResolvedValue(null) },
        debt: {
          findMany: jest.fn().mockResolvedValue([{ id: 'd1', name: 'Tarjeta Visa', currentBalance: 2_000_000, monthlyPayment: 150_000 }]),
          findUnique: jest.fn(),
        },
        transaction: { findFirst: jest.fn().mockResolvedValue(tx), groupBy: jest.fn().mockResolvedValue([{ categoryId: CAT_B, _count: { _all: 5 } }]) },
        user: { findUnique: jest.fn().mockResolvedValue({ fullName: 'Yonathan Cervantes' }) },
        userSettings: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
        botPendingAction: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn(), deleteMany: jest.fn() },
      };
      const transactions = {
        create: jest.fn().mockResolvedValue({ id: TX }),
        remove: jest.fn().mockResolvedValue({ deleted: true }),
        update: jest.fn().mockResolvedValue({}),
        suggestCategory: jest.fn().mockResolvedValue(null),
      };
      const spendable = { compute: jest.fn().mockResolvedValue({ amount: 412_300, perDay: 45_811, daysLeft: 9 }) };
      const moduleRef = { get: jest.fn((t: unknown) => (t === SpendableService ? spendable : null)) };
      const debtOutlay = { outlaysByUser: jest.fn().mockResolvedValue({ totalOutlay: 150_000, byDebt: new Map([['d1', { outlay: 160_000 }]]) }) };
      const svc = new ConversationService(
        prisma as never,
        transactions as never,
        debtOutlay as never,
        {} as never,
        { hasValidConsent: jest.fn().mockResolvedValue(false) } as never,
        { isAvailable: () => false } as never,
        moduleRef as never,
        {} as never,
        { sendMessage: jest.fn() } as never,
      );
      return { svc, prisma, transactions };
    };

    it('/start saluda por el nombre y muestra los botones fijos', async () => {
      const { svc } = build();
      const r = await svc.handleRich(input('/start'));
      expect(r.text).toContain('¡Hola, Yonathan!');
      expect(r.mainKeyboard).toBe(true);
    });

    it('al anotar un gasto dice cuánto queda y ofrece Cambiar categoría / Deshacer', async () => {
      const { svc } = build();
      const r = await svc.handleRich(input('almuerzo 18.500'));
      expect(r.text).toContain('Registré tu gasto de $18.500');
      expect(r.text).toContain('Te queda este mes: $412.300');
      expect(r.buttons?.flat().map((b) => b.text)).toEqual(['Cambiar categoría', 'Deshacer']);
      // WhatsApp (solo texto) recibe el mismo acuse.
      expect(await svc.handle(input('almuerzo 18.500'))).toContain('Te queda este mes');
    });

    it('"¿Cuánto me queda?" responde con la misma fuente de Te queda (§32)', async () => {
      const { svc } = build();
      expect((await svc.handleRich(input('¿Cuánto me queda?'))).text).toContain('$412.300');
    });

    it('"Mis deudas" lista saldo y cuota real de cada deuda', async () => {
      const { svc } = build();
      const r = await svc.handleRich(input('Mis deudas'));
      expect(r.text).toContain('Tarjeta Visa: debes $2.000.000 · cuota $160.000');
    });

    it('Cambiar categoría: lista las más usadas (sin la actual) y al elegir aprende por el servicio central', async () => {
      const { svc, transactions } = build();
      const list = await svc.handleCallback('u1', `ct:${TX}`);
      const labels = list.buttons!.flat().map((b) => b.text);
      expect(labels).toEqual(['Transporte', 'Otra']);
      const pick = list.buttons![0][0].data;
      const r = await svc.handleCallback('u1', pick);
      expect(transactions.update).toHaveBeenCalledWith('u1', TX, { categoryId: CAT_B });
      expect(r.text).toContain('lo pasé a Transporte');
      expect(r.text).toContain('"almuerzo"');
    });

    it('Deshacer anula ese movimiento; si ya no existe, lo dice', async () => {
      const { svc, prisma, transactions } = build();
      expect((await svc.handleCallback('u1', `un:${TX}`)).text).toContain('anulé');
      expect(transactions.remove).toHaveBeenCalledWith('u1', TX);
      prisma.transaction.findFirst.mockResolvedValue(null);
      expect((await svc.handleCallback('u1', `un:${TX}`)).text).toContain('ya no está');
      expect((await svc.handleCallback(null, `un:${TX}`)).text).toContain('vincula');
    });
  });
});
