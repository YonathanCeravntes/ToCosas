import { RemindersService } from './reminders.service';

/**
 * FIN-024 P1 (DEC-0024) · Escritor único de `nextDueDate`:
 * el dispatch de recordatorios NUNCA escribe fechas (ni en la deuda ni en el
 * recordatorio) y, para recordatorios de deuda, evalúa contra la fecha REAL
 * de la deuda — no contra el `reminder.dueDate` legado.
 */
describe('RemindersService.dispatchDue (FIN-024 P1)', () => {
  const HOY = new Date('2026-07-13T08:00:00.000Z');

  const build = (reminders: unknown[]) => {
    const debtUpdate = jest.fn();
    const reminderUpdate = jest.fn().mockResolvedValue({});
    const prisma = {
      reminder: {
        findMany: jest.fn().mockResolvedValue(reminders),
        update: reminderUpdate,
      },
      debt: { update: debtUpdate },
    } as never;
    const push = { sendToTokens: jest.fn().mockResolvedValue(undefined) } as never;
    const sender = { sendText: jest.fn() } as never;
    const telegram = { sendText: jest.fn() } as never;
    const budget = {
      canSend: jest.fn().mockResolvedValue(true),
      record: jest.fn().mockResolvedValue(undefined),
    } as never;
    return { svc: new RemindersService(prisma, sender, push, telegram, budget), debtUpdate, reminderUpdate };
  };

  const baseReminder = (over: Record<string, unknown>) => ({
    id: 'r1',
    userId: 'u1',
    debtId: null,
    title: 'Cuota Tarjeta',
    dueDate: new Date('2026-07-13T00:00:00.000Z'),
    offsetsDays: [3, 1, 0],
    channels: ['push'],
    amount: 97_000,
    lastSentAt: null,
    user: { settings: null, waLinks: [], devices: [{ fcmToken: 'tok' }], tgLinks: [] },
    debt: null,
    ...over,
  });

  it('deuda que VENCE HOY: avisa pero NO escribe ninguna fecha (ni deuda ni recordatorio)', async () => {
    const { svc, debtUpdate, reminderUpdate } = build([
      baseReminder({
        debtId: 'd1',
        // dueDate legado desincronizado a propósito: la fecha real es la de la deuda.
        dueDate: new Date('2026-05-28T00:00:00.000Z'),
        debt: { id: 'd1', nextDueDate: new Date('2026-07-13T00:00:00.000Z') },
      }),
    ]);
    const { sent } = await svc.dispatchDue(HOY);
    expect(sent).toBe(1); // disparó contra la fecha REAL (hoy), no la legada
    expect(debtUpdate).not.toHaveBeenCalled(); // el pago es el ÚNICO escritor
    expect(reminderUpdate).toHaveBeenCalledTimes(1);
    expect(reminderUpdate.mock.calls[0][0].data).toEqual({ lastSentAt: HOY }); // sin dueDate
  });

  it('deuda VENCIDA (fecha en el pasado): calla — el aviso post-vencimiento es FIN-025', async () => {
    const { svc, debtUpdate } = build([
      baseReminder({
        debtId: 'd1',
        debt: { id: 'd1', nextDueDate: new Date('2026-07-01T00:00:00.000Z') },
      }),
    ]);
    const { sent } = await svc.dispatchDue(HOY);
    expect(sent).toBe(0);
    expect(debtUpdate).not.toHaveBeenCalled();
  });

  it('deuda SALDADA (nextDueDate null): el recordatorio de deuda no dispara', async () => {
    const { svc } = build([
      baseReminder({ debtId: 'd1', debt: { id: 'd1', nextDueDate: null } }),
    ]);
    expect((await svc.dispatchDue(HOY)).sent).toBe(0);
  });

  it('recordatorio MANUAL (sin debtId): sigue usando su propia fecha, sin cambios', async () => {
    const { svc, reminderUpdate } = build([
      baseReminder({ dueDate: new Date('2026-07-14T00:00:00.000Z') }), // vence mañana → offset 1
    ]);
    expect((await svc.dispatchDue(HOY)).sent).toBe(1);
    expect(reminderUpdate.mock.calls[0][0].data).toEqual({ lastSentAt: HOY });
  });
});
