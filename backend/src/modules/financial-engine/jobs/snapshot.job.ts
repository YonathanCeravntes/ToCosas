import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { computeNetWorth } from '../../accounts/networth.util';
import { MetricKey, ACTIVE_USER_WINDOW_DAYS, ENGINE_TZ } from '../engine.constants';
import { EngineService } from '../engine.service';

/**
 * Snapshot diario de patrimonio (FIN-003 §4.1) para usuarios ACTIVOS
 * (DEC-0003 §10.4: transacción, cambio de deuda o actualización de saldo/activo
 * en los últimos 90 días). Corre a la 1 AM hora de Bogotá (DEC-0003 §10.3).
 */
@Injectable()
export class SnapshotJob {
  private readonly logger = new Logger(SnapshotJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: EngineService,
  ) {}

  @Cron('0 0 1 * * *', { timeZone: ENGINE_TZ })
  async run(now: Date = new Date()): Promise<number> {
    const userIds = await this.activeUserIds(now);
    let count = 0;
    for (const userId of userIds) {
      try {
        await this.snapshotUser(userId, now);
        count += 1;
      } catch (e) {
        this.logger.error(`snapshot(${userId}) falló: ${(e as Error).message}`);
      }
    }
    this.logger.log(`Snapshots diarios generados: ${count}/${userIds.length}`);
    return count;
  }

  /** DEC-0003 §10.4 — actividad en cualquiera de las fuentes en ≤90 días. */
  async activeUserIds(now: Date): Promise<string[]> {
    const cutoff = new Date(now.getTime() - ACTIVE_USER_WINDOW_DAYS * 86_400_000);
    const [tx, debts, accounts, assets] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { deletedAt: null, createdAt: { gte: cutoff } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.debt.findMany({
        where: { deletedAt: null, updatedAt: { gte: cutoff } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.account.findMany({
        where: { deletedAt: null, updatedAt: { gte: cutoff } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.asset.findMany({
        where: { deletedAt: null, updatedAt: { gte: cutoff } },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);
    return [
      ...new Set([...tx, ...debts, ...accounts, ...assets].map((r) => r.userId)),
    ];
  }

  private async snapshotUser(userId: string, now: Date): Promise<void> {
    const [accounts, assets, debts] = await Promise.all([
      this.prisma.account.findMany({
        where: { userId, deletedAt: null, archivedAt: null },
      }),
      this.prisma.asset.findMany({ where: { userId, deletedAt: null } }),
      this.prisma.debt.findMany({
        where: { userId, deletedAt: null, status: 'activa' },
      }),
    ]);
    const liabilities = debts.reduce((a, d) => a + Number(d.currentBalance), 0);
    const nw = computeNetWorth(
      accounts.map((a) => ({
        currentBalance: Number(a.currentBalance),
        isLiquid: a.isLiquid,
        includeInNetWorth: a.includeInNetWorth,
        isEmergencyFund: a.isEmergencyFund,
      })),
      assets.map((a) => ({
        currentValue: Number(a.currentValue),
        includeInNetWorth: a.includeInNetWorth,
      })),
      liabilities,
    );

    await this.prisma.financialSnapshot.create({
      data: {
        userId,
        capturedAt: now,
        netWorth: nw.netWorth,
        totalAssets: nw.totalAssets,
        totalLiquid: nw.totalLiquid,
        totalLiabilities: nw.totalLiabilities,
        extra: { totalEmergencyFund: nw.totalEmergencyFund },
      },
    });

    // Serie diaria de patrimonio (día truncado UTC como ancla idempotente).
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    await this.engine.upsertReadings(
      userId,
      [{ metricKey: MetricKey.NetWorth, value: nw.netWorth }],
      day,
      'day',
    );
  }
}
