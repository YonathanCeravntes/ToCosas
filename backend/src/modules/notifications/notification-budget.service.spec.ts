import { DAILY_CAP, NotificationBudgetService } from './notification-budget.service';

/**
 * Presupuesto global (DEC-0007 §10.3): reparto FIJO 2 recordatorios + 1
 * proactivo, sin reasignación de cupos no usados.
 */

function build(events: Array<{ kind: string; sentAt: Date }>) {
  const prisma = {
    notificationLog: {
      findMany: jest.fn(({ where }) =>
        Promise.resolve(
          // distinct sentAt simulado: los eventos ya vienen únicos por sentAt
          events.filter((e) => e.kind === where.kind && e.sentAt >= where.sentAt.gte),
        ),
      ),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  } as never;
  return new NotificationBudgetService(prisma);
}

const now = new Date('2026-07-15T13:00:00Z');
const today = (h: number) => new Date(`2026-07-15T0${h}:00:00Z`);

describe('NotificationBudgetService (reparto fijo, DEC-0007 §10.3)', () => {
  it('caps: 2 recordatorios + 1 proactivo', () => {
    expect(DAILY_CAP.recordatorio).toBe(2);
    expect(DAILY_CAP.proactivo).toBe(1);
  });

  it('recordatorios: permite hasta 2, bloquea el 3º', async () => {
    expect(await build([]).canSend('u1', 'recordatorio', now)).toBe(true);
    expect(
      await build([{ kind: 'recordatorio', sentAt: today(8) }]).canSend('u1', 'recordatorio', now),
    ).toBe(true);
    expect(
      await build([
        { kind: 'recordatorio', sentAt: today(8) },
        { kind: 'recordatorio', sentAt: today(9) },
      ]).canSend('u1', 'recordatorio', now),
    ).toBe(false);
  });

  it('proactivos: permite 1, bloquea el 2º', async () => {
    expect(await build([]).canSend('u1', 'proactivo', now)).toBe(true);
    expect(
      await build([{ kind: 'proactivo', sentAt: today(7) }]).canSend('u1', 'proactivo', now),
    ).toBe(false);
  });

  it('SIN reasignación: 0 recordatorios usados NO amplían el cupo proactivo', async () => {
    // Usuario sin recordatorios hoy pero con 1 proactivo enviado:
    const budget = build([{ kind: 'proactivo', sentAt: today(7) }]);
    expect(await budget.canSend('u1', 'proactivo', now)).toBe(false); // sigue bloqueado
    expect(await budget.canSend('u1', 'recordatorio', now)).toBe(true); // su cupo intacto
  });

  it('recordatorios llenos NO bloquean el proactivo (cupos independientes)', async () => {
    const budget = build([
      { kind: 'recordatorio', sentAt: today(8) },
      { kind: 'recordatorio', sentAt: today(9) },
    ]);
    expect(await budget.canSend('u1', 'proactivo', now)).toBe(true);
  });

  it('el día anterior no cuenta', async () => {
    const yesterday = new Date('2026-07-14T23:00:00Z');
    const budget = build([{ kind: 'proactivo', sentAt: yesterday }]);
    expect(await budget.canSend('u1', 'proactivo', now)).toBe(true);
  });
});
