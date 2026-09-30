import { SnapshotJob } from './snapshot.job';
import { RetentionJob } from './retention.job';
import { ACTIVE_USER_WINDOW_DAYS, DAY_READING_RETENTION_DAYS } from '../engine.constants';

describe('SnapshotJob.activeUserIds (DEC-0003 §10.4)', () => {
  it('une usuarios con actividad en tx/deudas/cuentas/activos y deduplica', async () => {
    const prisma = {
      transaction: { findMany: jest.fn().mockResolvedValue([{ userId: 'a' }, { userId: 'b' }]) },
      debt: { findMany: jest.fn().mockResolvedValue([{ userId: 'b' }]) },
      account: { findMany: jest.fn().mockResolvedValue([{ userId: 'c' }]) },
      asset: { findMany: jest.fn().mockResolvedValue([]) },
    } as never;
    const job = new SnapshotJob(prisma, {} as never);
    const now = new Date('2026-07-15T06:00:00Z');
    const ids = await job.activeUserIds(now);
    expect(ids.sort()).toEqual(['a', 'b', 'c']);

    // Ventana de 90 días aplicada en cada fuente.
    const txWhere = (prisma as never as { transaction: { findMany: jest.Mock } })
      .transaction.findMany.mock.calls[0][0].where;
    const cutoff: Date = txWhere.createdAt.gte;
    const expected = new Date(now.getTime() - ACTIVE_USER_WINDOW_DAYS * 86_400_000);
    expect(cutoff.toISOString()).toBe(expected.toISOString());
  });
});

describe('RetentionJob.purgeDayReadings (DEC-0002 §4.5)', () => {
  it("borra solo lecturas 'day' con más de 180 días", async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 7 });
    const prisma = { metricReading: { deleteMany } } as never;
    const job = new RetentionJob(prisma);
    const now = new Date('2026-07-15T09:00:00Z');
    const count = await job.purgeDayReadings(now);
    expect(count).toBe(7);
    const where = deleteMany.mock.calls[0][0].where;
    expect(where.period).toBe('day');
    const cutoff: Date = where.capturedAt.lt;
    const expected = new Date(now.getTime() - DAY_READING_RETENTION_DAYS * 86_400_000);
    expect(cutoff.toISOString()).toBe(expected.toISOString());
  });
});
