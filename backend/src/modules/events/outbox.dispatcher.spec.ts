import { OutboxDispatcher } from './outbox.dispatcher';

type Row = { id: string; eventType: string; payload: unknown; attempts: number };

function build(rows: Row[], emitImpl?: () => void) {
  const update = jest.fn().mockResolvedValue({});
  const deleteMany = jest.fn().mockResolvedValue({ count: 3 });
  const $queryRaw = jest.fn().mockResolvedValue(rows);
  const prisma = { $queryRaw, outboxEvent: { update, deleteMany } } as never;
  const emit = jest.fn(emitImpl ?? (() => true));
  const emitter = { emit } as never;
  const dispatcher = new OutboxDispatcher(prisma, emitter);
  return { dispatcher, update, deleteMany, $queryRaw, emit };
}

describe('OutboxDispatcher', () => {
  it('reclama con claim atómico ($queryRaw) y no con select+update separados', async () => {
    const { dispatcher, $queryRaw } = build([]);
    await dispatcher.drainOnce();
    expect($queryRaw).toHaveBeenCalledTimes(1); // UPDATE ... FOR UPDATE SKIP LOCKED ... RETURNING
  });

  it('procesa un evento: lo emite y lo marca processed', async () => {
    const { dispatcher, update, emit } = build([
      { id: 'e1', eventType: 'account.created', payload: { a: 1 }, attempts: 1 },
    ]);
    const n = await dispatcher.drainOnce();
    expect(n).toBe(1);
    expect(emit).toHaveBeenCalledWith('account.created', { a: 1 });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'e1' }, data: expect.objectContaining({ status: 'processed' }) }),
    );
  });

  it('ante error con reintentos disponibles vuelve a pending con backoff', async () => {
    const { dispatcher, update } = build(
      [{ id: 'e2', eventType: 'x', payload: {}, attempts: 2 }],
      () => { throw new Error('boom'); },
    );
    await dispatcher.drainOnce();
    const data = update.mock.calls[0][0].data;
    expect(data.status).toBe('pending');
    expect(data.error).toContain('boom');
    expect(data.availableAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('ante error superado el máximo de intentos marca failed', async () => {
    const { dispatcher, update } = build(
      [{ id: 'e3', eventType: 'x', payload: {}, attempts: 5 }],
      () => { throw new Error('fatal'); },
    );
    await dispatcher.drainOnce();
    const data = update.mock.calls[0][0].data;
    expect(data.status).toBe('failed');
    expect(data.error).toContain('fatal');
  });

  it('purga eventos processed con más de 30 días', async () => {
    const { dispatcher, deleteMany } = build([]);
    const count = await dispatcher.purge();
    expect(count).toBe(3);
    const where = deleteMany.mock.calls[0][0].where;
    expect(where.status).toBe('processed');
    expect(where.processedAt.lt).toBeInstanceOf(Date);
  });
});
