import { OutboxService } from './outbox.service';
import { DomainEventType } from './domain-events';

describe('OutboxService', () => {
  it('enqueue escribe el evento usando el cliente de transacción recibido', async () => {
    const create = jest.fn().mockResolvedValue({});
    const tx = { outboxEvent: { create } } as never;
    const service = new OutboxService({} as never);

    await service.enqueue(tx, {
      aggregateType: 'transaction',
      aggregateId: 'tx-1',
      eventType: DomainEventType.TransactionCreated,
      payload: { userId: 'u1', amount: 100 },
    });

    // Garantía transaccional: se usa el MISMO tx, no el prisma base.
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: {
        aggregateType: 'transaction',
        aggregateId: 'tx-1',
        eventType: 'transaction.created',
        payload: { userId: 'u1', amount: 100 },
      },
    });
  });

  it('withEvent ejecuta fn dentro de $transaction y encola el evento en la misma tx', async () => {
    const create = jest.fn().mockResolvedValue({});
    const tx = { outboxEvent: { create } };
    const prisma = {
      $transaction: jest.fn(async (fn: (t: unknown) => Promise<unknown>) => fn(tx)),
    } as never;
    const service = new OutboxService(prisma);

    const result = await service.withEvent(async () => ({
      result: { id: 'acc-1' },
      event: {
        aggregateType: 'account',
        aggregateId: 'acc-1',
        eventType: DomainEventType.AccountCreated,
        payload: {},
      },
    }));

    expect(result).toEqual({ id: 'acc-1' });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].data.eventType).toBe('account.created');
  });
});
