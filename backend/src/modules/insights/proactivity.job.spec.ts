import { ProactivityJob } from './proactivity.job';

const now = new Date('2026-07-15T12:00:00Z'); // 7:00 AM Bogotá

function insight(overrides: Record<string, unknown> = {}) {
  return {
    id: `i-${Math.random()}`,
    userId: 'u1',
    title: 'T',
    body: 'B',
    severity: 'info',
    createdAt: new Date('2026-07-15T06:00:00Z'),
    user: {
      settings: { proactiveEnabled: true, notifPush: true, notifWhatsapp: false, quietHours: null },
      devices: [{ fcmToken: 'ExponentPushToken[x]' }],
      waLinks: [],
      tgLinks: [],
    },
    ...overrides,
  };
}

function build(pending: unknown[], alreadyDeliveredToday = 0) {
  const update = jest.fn().mockResolvedValue({});
  const prisma = {
    insight: {
      findMany: jest.fn().mockResolvedValue(pending),
      update,
    },
  } as never;
  const push = { sendToTokens: jest.fn().mockResolvedValue(undefined) } as never;
  const wa = { sendText: jest.fn().mockResolvedValue(undefined) } as never;
  const tg = { sendText: jest.fn().mockResolvedValue(undefined) } as never;
  // Presupuesto global (FIN-007): el tope 1/día ahora vive aquí.
  const budget = {
    canSend: jest.fn().mockResolvedValue(alreadyDeliveredToday === 0),
    record: jest.fn().mockResolvedValue(undefined),
  } as never;
  return { job: new ProactivityJob(prisma, push, wa, tg, budget), update, push, budget };
}

describe('ProactivityJob (FIN-006 §4.5, anti-fatiga)', () => {
  it('entrega SOLO el insight de mayor severidad por usuario', async () => {
    const { job, update } = build([
      insight({ id: 'a', severity: 'info' }),
      insight({ id: 'b', severity: 'critical' }),
      insight({ id: 'c', severity: 'warning' }),
    ]);
    const delivered = await job.run(now);
    expect(delivered).toBe(1);
    expect(update.mock.calls[0][0].where.id).toBe('b');
    expect(update.mock.calls[0][0].data.deliveredChannels).toContain('push');
  });

  it('respeta proactiveEnabled=false', async () => {
    const { job, update } = build([
      insight({ user: { settings: { proactiveEnabled: false }, devices: [], waLinks: [], tgLinks: [] } }),
    ]);
    expect(await job.run(now)).toBe(0);
    expect(update).not.toHaveBeenCalled();
  });

  it('tope 1/día: si ya se entregó hoy, omite', async () => {
    const { job, update } = build([insight()], 1);
    expect(await job.run(now)).toBe(0);
    expect(update).not.toHaveBeenCalled();
  });

  it('quiet hours: omite dentro del rango (incluso cruzando medianoche)', () => {
    const job = build([]).job;
    // 7:00 AM Bogotá con quiet 22:00–08:00 → dentro
    expect(job.inQuietHours({ start: '22:00', end: '08:00' }, now)).toBe(true);
    // quiet 22:00–06:00 → fuera (son las 7:00)
    expect(job.inQuietHours({ start: '22:00', end: '06:00' }, now)).toBe(false);
    // sin quietHours → nunca bloquea
    expect(job.inQuietHours(null, now)).toBe(false);
  });
});
