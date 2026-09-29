import { Injectable, Logger, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { SnapshotJob } from '../financial-engine/jobs/snapshot.job';
import { TrendsJob } from '../financial-engine/jobs/trends.job';
import { RetentionJob } from '../financial-engine/jobs/retention.job';
import { RecommendationsJob } from '../recommendations/recommendations.job';
import { GamificationJob } from '../gamification/gamification.support';
import { MemoryJob } from '../memory/memory.job';
import { UpdateReviewService } from '../debts/update-review.service';
import { ProactivityJob } from '../insights/proactivity.job';
import { RemindersService } from '../reminders/reminders.service';
import { AccountPurgeScheduler } from '../auth/account-purge.scheduler';
import { CopilotRetentionJob } from '../copilot/copilot-retention.job';
import { BillingExpirationJob } from '../billing/billing.module';
import { ENGINE_TZ } from '../financial-engine/engine.constants';
import { CashflowAlertsService } from './cashflow-alerts.service';
import { WeeklySummaryService } from './weekly-summary.service';

export interface PipelineStep {
  step: string;
  ok: boolean;
  result?: unknown;
  error?: string;
  ms: number;
}

/** Día de la semana en Bogotá (0 = domingo). */
export function bogotaWeekday(now: Date): number {
  const name = now.toLocaleDateString('en-US', { weekday: 'short', timeZone: ENGINE_TZ });
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

/**
 * FIN-046 Fase 3 · Recorrido diario COMPLETO en una sola llamada. Render free se duerme
 * y sus `@Cron` no corren si nadie usa la app: el "despertador" de GitHub Actions llama
 * `POST /v1/internal/cron/daily` cada mañana y aquí se ejecuta todo, en el orden del
 * reloj de siempre. Cada paso es idempotente (dedupe, lastSentAt, deliveredAt), así que
 * si además corre un `@Cron` no hay avisos dobles. Un paso que falla no frena al resto.
 */
@Injectable()
export class DailyPipelineService {
  private readonly logger = new Logger(DailyPipelineService.name);
  private running = false;

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly alerts: CashflowAlertsService,
    private readonly weekly: WeeklySummaryService,
  ) {}

  isRunning(): boolean {
    return this.running;
  }

  async run(now = new Date()): Promise<PipelineStep[]> {
    if (this.running) return [{ step: 'pipeline', ok: false, error: 'ya en curso', ms: 0 }];
    this.running = true;
    const out: PipelineStep[] = [];
    const get = <T>(cls: Type<T>): T => this.moduleRef.get(cls, { strict: false });
    const step = async (name: string, fn: () => Promise<unknown>) => {
      const t = Date.now();
      try {
        out.push({ step: name, ok: true, result: await fn(), ms: Date.now() - t });
      } catch (e) {
        out.push({ step: name, ok: false, error: (e as Error).message, ms: Date.now() - t });
      }
    };
    try {
      await step('snapshot', () => get(SnapshotJob).run(now));
      await step('tendencias', () => get(TrendsJob).run(now));
      await step('recomendaciones', () => get(RecommendationsJob).run(now));
      await step('logros', () => get(GamificationJob).run(now));
      if (bogotaWeekday(now) === 0) await step('memoria', () => get(MemoryJob).run(now));
      await step('revision_corte', () => get(UpdateReviewService).seedReviewInsights(now));
      await step('te_sobro', () => this.alerts.run(now));
      await step('avisos', () => get(ProactivityJob).run(now));
      await step('recordatorios', () => get(RemindersService).dispatchDue(now));
      if (bogotaWeekday(now) === 0) await step('resumen_semanal', () => this.weekly.run(now));
      await step('retencion', () => get(RetentionJob).run(now));
      await step('retencion_copiloto', () => get(CopilotRetentionJob).run(now));
      await step('purga_cuentas', () => get(AccountPurgeScheduler).handleDailyPurge());
      await step('suscripciones', () => get(BillingExpirationJob).run());
    } finally {
      this.running = false;
    }
    this.logger.log(`Recorrido diario: ${out.map((s) => `${s.step}=${s.ok ? 'ok' : 'error'}`).join(' ')}`);
    return out;
  }
}
