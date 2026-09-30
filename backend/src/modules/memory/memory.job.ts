import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ENGINE_TZ } from '../financial-engine/engine.constants';
import { SnapshotJob } from '../financial-engine/jobs/snapshot.job';
import { MemoryService } from './memory.service';

/**
 * Job semanal de memoria (FIN-006 §4.4): domingos 3:30 AM Bogotá. Analiza a los
 * usuarios activos (mismo criterio de 90 días de DEC-0003 §10.4).
 */
@Injectable()
export class MemoryJob {
  private readonly logger = new Logger(MemoryJob.name);

  constructor(
    private readonly memory: MemoryService,
    private readonly snapshot: SnapshotJob,
  ) {}

  @Cron('0 30 3 * * 0', { timeZone: ENGINE_TZ })
  async run(now: Date = new Date()): Promise<number> {
    const userIds = await this.snapshot.activeUserIds(now);
    let facts = 0;
    for (const userId of userIds) {
      try {
        facts += await this.memory.analyzeUser(userId, now);
      } catch (e) {
        this.logger.error(`memoria(${userId}) falló: ${(e as Error).message}`);
      }
    }
    this.logger.log(`Memoria: ${facts} hechos confirmados en ${userIds.length} usuario(s)`);
    return facts;
  }
}
