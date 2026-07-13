import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DebtOutlayService } from '../debts/debt-outlay.service';
import { computeNetWorth } from '../accounts/networth.util';
import { computeScore, SCORE_VERSION } from '../health/score.util';
import { computeCoreMetrics, MetricValue } from './metrics/core-metrics';
import { daysBetween, monthStart } from './metrics/series.util';
import { COLD_START_DAYS, MetricKey } from './engine.constants';

/**
 * Núcleo del Motor Financiero (FIN-003). `recompute(userId)` es una función de
 * ESTADO ABSOLUTO: recalcula las métricas del mes desde las tablas fuente y hace
 * upsert por (userId, metricKey, period, capturedAt). Procesar un evento
 * duplicado produce el mismo resultado → idempotente por diseño (contrato
 * at-least-once del outbox de FIN-002).
 */
@Injectable()
export class EngineService {
  private readonly logger = new Logger(EngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    // FIN-023 (§32): el compromiso mensual de deuda es el desembolso REAL.
    private readonly debtOutlay: DebtOutlayService,
  ) {}

  /** Recalcula y persiste las métricas core del mes corriente del usuario. */
  async recompute(userId: string, now: Date = new Date()): Promise<MetricValue[]> {
    const from = monthStart(now);
    const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));

    const [txByKind, fixedItems, debts, accounts, assets, outlays] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['kind'],
        where: { userId, deletedAt: null, occurredAt: { gte: from, lt: to } },
        _sum: { amount: true },
      }),
      this.prisma.fixedItem.findMany({
        where: { userId, deletedAt: null, isActive: true },
      }),
      this.prisma.debt.findMany({
        where: { userId, deletedAt: null, status: 'activa' },
      }),
      this.prisma.account.findMany({
        where: { userId, deletedAt: null, archivedAt: null },
      }),
      this.prisma.asset.findMany({ where: { userId, deletedAt: null } }),
      this.debtOutlay.outlaysByUser(userId),
    ]);

    const sumKind = (k: string) =>
      Number(txByKind.find((t) => t.kind === k)?._sum.amount ?? 0);
    const fixedIncome = fixedItems
      .filter((i) => i.kind === 'ingreso')
      .reduce((a, i) => a + Number(i.amount), 0);
    const fixedExpense = fixedItems
      .filter((i) => i.kind === 'gasto')
      .reduce((a, i) => a + Number(i.amount), 0);
    // FIN-023: desembolso real (cuota + seguros/cargos aparte) — corrige por
    // construcción DTI, gasto esencial, fondo de emergencia y runway; las
    // Recomendaciones se corrigen SOLAS al leer las lecturas persistidas (FIN-021).
    const debtMonthly = outlays.totalOutlay;
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

    const metrics = computeCoreMetrics({
      income: sumKind('ingreso'),
      expense: sumKind('gasto'),
      debtPayments: sumKind('pago_deuda'),
      fixedIncome,
      fixedExpense,
      debtMonthly,
      liquidBalance: nw.totalLiquid,
      emergencyBalance: nw.totalEmergencyFund,
      netWorth: nw.netWorth,
    });

    await this.upsertReadings(userId, metrics, from, 'month');

    // Score Millo v1 (FIN-004, integración aditiva DEC-0004 §11.3): función pura
    // sobre las métricas recién calculadas + tendencia de patrimonio si existe.
    await this.recomputeScore(userId, metrics, from);
    return metrics;
  }

  /** Calcula y persiste el Score y sus pilares como lecturas de la serie. */
  private async recomputeScore(
    userId: string,
    metrics: MetricValue[],
    capturedAt: Date,
  ): Promise<void> {
    const get = (key: string) => metrics.find((m) => m.metricKey === key)?.value ?? null;
    const trend = await this.prisma.metricReading.findFirst({
      where: {
        userId,
        metricKey: MetricKey.TrendNetWorth,
        period: 'month',
        capturedAt,
      },
    });

    const result = computeScore({
      liquidityRunway: get(MetricKey.LiquidityRunway),
      dti: get(MetricKey.Dti),
      savingsRate: get(MetricKey.SavingsRate),
      emergencyFundMonths: get(MetricKey.EmergencyFundMonths),
      netWorth: get(MetricKey.NetWorth),
      netWorthTrend: trend ? Number(trend.value) : null,
      essentialExpense: get(MetricKey.EssentialExpense),
    });

    const readings: MetricValue[] = [
      { metricKey: 'score', value: result.score },
      { metricKey: 'score.version', value: SCORE_VERSION },
      ...result.pillars
        .filter((p) => p.value !== null)
        .map((p) => ({ metricKey: `score.${p.key}`, value: p.value as number })),
    ];
    await this.upsertReadings(userId, readings, capturedAt, 'month');
  }

  /** Upsert idempotente de lecturas en la serie. */
  async upsertReadings(
    userId: string,
    metrics: MetricValue[],
    capturedAt: Date,
    period: 'day' | 'month',
  ): Promise<void> {
    for (const m of metrics) {
      await this.prisma.metricReading.upsert({
        where: {
          userId_metricKey_period_capturedAt: {
            userId,
            metricKey: m.metricKey,
            period,
            capturedAt,
          },
        },
        update: { value: m.value },
        create: {
          userId,
          metricKey: m.metricKey,
          value: m.value,
          period,
          capturedAt,
        },
      });
    }
  }

  /**
   * Estado de cold-start global (DEC-0003 §10.2): días de historial desde la
   * primera transacción y si tendencias/anomalías están habilitadas.
   */
  async coldStartStatus(userId: string, now: Date = new Date()) {
    const first = await this.prisma.transaction.findFirst({
      where: { userId, deletedAt: null },
      orderBy: { occurredAt: 'asc' },
      select: { occurredAt: true },
    });
    const days = first ? daysBetween(first.occurredAt, now) : 0;
    return {
      historyDays: days,
      requiredDays: COLD_START_DAYS,
      enabled: days >= COLD_START_DAYS,
      remainingDays: Math.max(0, COLD_START_DAYS - days),
    };
  }
}
