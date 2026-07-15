import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { InsightsService } from '../../insights/insights.service';
import { EngineService } from '../engine.service';
import { InsightsGenerator } from '../insights.generator';
import { SnapshotJob } from './snapshot.job';
import { linearSlope, monthStart, monthStartMinus, zScore } from '../metrics/series.util';
import {
  ANOMALY_CATEGORY_MIN_MONTHS,
  ANOMALY_Z_THRESHOLD,
  ENGINE_TZ,
  MetricKey,
} from '../engine.constants';

const TREND_SOURCES: Array<{ source: string; target: string }> = [
  { source: MetricKey.Cashflow, target: MetricKey.TrendCashflow },
  { source: MetricKey.SavingsRate, target: MetricKey.TrendSavingsRate },
  { source: MetricKey.NetWorth, target: MetricKey.TrendNetWorth },
];

/**
 * Tendencias y anomalías (FIN-003 §4.3), a las 2 AM de Bogotá (DEC-0003 §10.3).
 *
 * Cold-start doble (DEC-0003 §10.2): el umbral GLOBAL de 60 días habilita este
 * job para el usuario; el umbral POR CATEGORÍA (≥3 meses de datos en esa
 * categoría) es condición adicional de cada anomalía puntual.
 *
 * Las anomalías se persisten como `MetricReading` `anomaly.<categoria>` con el
 * z-score (decisión temporal DEC-0003 §4.6; FIN-006 las migrará a `Insight`).
 */
@Injectable()
export class TrendsJob {
  private readonly logger = new Logger(TrendsJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: EngineService,
    private readonly snapshot: SnapshotJob,
    private readonly insights: InsightsService,
    private readonly generator: InsightsGenerator,
  ) {}

  @Cron('0 0 2 * * *', { timeZone: ENGINE_TZ })
  async run(now: Date = new Date()): Promise<{ users: number; anomalies: number }> {
    const userIds = await this.snapshot.activeUserIds(now);
    let users = 0;
    let anomalies = 0;
    for (const userId of userIds) {
      try {
        const cold = await this.engine.coldStartStatus(userId, now);
        if (cold.enabled) {
          // Tendencias/anomalías: solo con cold-start global superado (DEC-0003 §10.2).
          users += 1;
          await this.computeTrends(userId, now);
          anomalies += await this.computeAnomalies(userId, now);
          // La tendencia alimenta el pilar Patrimonio del Score (FIN-004).
          await this.engine.recompute(userId, now);
        }
        // Generadores de insights (FIN-006 §4.3): los de aritmética del mes
        // (sobregiro, DTI, fondo, banda) no requieren cold-start; los de
        // tendencia se auto-omiten si no hay lecturas trend.* previas.
        await this.generator.generateForUser(userId, now);
      } catch (e) {
        this.logger.error(`trends(${userId}) falló: ${(e as Error).message}`);
      }
    }
    this.logger.log(`Tendencias: ${users} usuario(s); anomalías detectadas: ${anomalies}`);
    return { users, anomalies };
  }

  /** Pendiente de los últimos 3 valores mensuales de cada métrica fuente. */
  private async computeTrends(userId: string, now: Date): Promise<void> {
    const from = monthStartMinus(now, 2); // mes actual + 2 anteriores
    const current = monthStart(now);
    for (const { source, target } of TREND_SOURCES) {
      const readings = await this.prisma.metricReading.findMany({
        where: {
          userId,
          metricKey: source,
          period: 'month',
          capturedAt: { gte: from },
        },
        orderBy: { capturedAt: 'asc' },
      });
      if (readings.length < 2) continue;
      const slope = linearSlope(readings.map((r) => Number(r.value)));
      await this.engine.upsertReadings(
        userId,
        [{ metricKey: target, value: slope }],
        current,
        'month',
      );
    }
  }

  /**
   * Gasto mensual por categoría fuera de banda (z-score). Requiere además
   * ≥ANOMALY_CATEGORY_MIN_MONTHS meses con datos en ESA categoría.
   */
  private async computeAnomalies(userId: string, now: Date): Promise<number> {
    const current = monthStart(now);
    const from = monthStartMinus(now, ANOMALY_CATEGORY_MIN_MONTHS + 2); // margen de historial
    const txs = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        kind: 'gasto',
        categoryId: { not: null },
        occurredAt: { gte: from },
      },
      select: { amount: true, occurredAt: true, categoryId: true, category: { select: { name: true } } },
    });

    // Agrupar gasto por categoría → por mes.
    const byCat = new Map<string, { name: string; months: Map<number, number> }>();
    for (const t of txs) {
      const key = t.categoryId as string;
      const bucket = byCat.get(key) ?? { name: t.category?.name ?? key, months: new Map() };
      const m = monthStart(t.occurredAt).getTime();
      bucket.months.set(m, (bucket.months.get(m) ?? 0) + Number(t.amount));
      byCat.set(key, bucket);
    }

    let found = 0;
    for (const { name, months } of byCat.values()) {
      const currentSpend = months.get(current.getTime()) ?? 0;
      const history = [...months.entries()]
        .filter(([m]) => m < current.getTime())
        .sort(([a], [b]) => a - b)
        .map(([, v]) => v);
      // Umbral por categoría (DEC-0003 §10.2): mínimo 3 meses previos con datos.
      if (history.length < ANOMALY_CATEGORY_MIN_MONTHS) continue;
      const z = zScore(history, currentSpend);
      if (z === null || Math.abs(z) < ANOMALY_Z_THRESHOLD) continue;
      // FIN-006 §4.2 (corte de escritura): la anomalía ya NO se escribe en
      // MetricReading; nace como Insight con ciclo de vida propio.
      const period = current.toISOString().slice(0, 7);
      const created = await this.insights.createIfNew({
        userId,
        type: 'anomalia',
        severity: 'warning',
        title: `Gasto inusual en ${name}`,
        body: `Tu gasto del mes en "${name}" se salió de tu patrón habitual (${z > 0 ? 'muy por encima' : 'muy por debajo'} de lo normal).`,
        dedupeKey: `anomalia:${name}:${period}`,
        payload: { zScore: z, category: name, currentSpend },
      });
      if (created) found += 1;
    }
    return found;
  }
}
