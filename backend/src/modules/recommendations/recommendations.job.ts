import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ENGINE_TZ } from '../financial-engine/engine.constants';
import { SnapshotJob } from '../financial-engine/jobs/snapshot.job';
import { RecommendationsService } from './recommendations.service';

/**
 * Job nightly de recomendaciones (FIN-007 §4.3): 2:45 AM Bogotá, tras el ciclo
 * de tendencias/insights (2:00). Usuarios activos (criterio 90d de DEC-0003).
 * Las recomendaciones NO notifican (v1, DEC-0007 §4.5): solo in-app.
 */
@Injectable()
export class RecommendationsJob {
  private readonly logger = new Logger(RecommendationsJob.name);

  constructor(
    private readonly recommendations: RecommendationsService,
    private readonly snapshot: SnapshotJob,
  ) {}

  @Cron('0 45 2 * * *', { timeZone: ENGINE_TZ })
  async run(now: Date = new Date()): Promise<number> {
    const userIds = await this.snapshot.activeUserIds(now);
    let created = 0;
    for (const userId of userIds) {
      try {
        created += await this.recommendations.generateForUser(userId, now);
      } catch (e) {
        this.logger.error(`recomendaciones(${userId}) falló: ${(e as Error).message}`);
      }
    }
    this.logger.log(`Recomendaciones: ${created} creadas para ${userIds.length} usuario(s)`);
    return created;
  }
}
