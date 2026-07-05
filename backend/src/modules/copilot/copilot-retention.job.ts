import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ENGINE_TZ } from '../financial-engine/engine.constants';
import {
  AI_LOG_RETENTION_MONTHS,
  CONVERSATION_RETENTION_MONTHS,
} from './copilot.constants';

/**
 * Retención del Copiloto (§4.7 + §4.4). Asimetría ratificada en DEC-0005 §8:
 * el log de auditoría (12 meses) es interno; el chat (24 meses de inactividad)
 * tiene utilidad directa para el usuario y además un borrado autónomo.
 */
@Injectable()
export class CopilotRetentionJob {
  private readonly logger = new Logger(CopilotRetentionJob.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 0 5 * * *', { timeZone: ENGINE_TZ })
  async run(now: Date = new Date()): Promise<{ conversations: number; logs: number }> {
    const convCutoff = this.monthsAgo(now, CONVERSATION_RETENTION_MONTHS);
    const logCutoff = this.monthsAgo(now, AI_LOG_RETENTION_MONTHS);

    const [convs, logs] = await Promise.all([
      this.prisma.conversation.deleteMany({ where: { updatedAt: { lt: convCutoff } } }),
      this.prisma.aiInteractionLog.deleteMany({ where: { createdAt: { lt: logCutoff } } }),
    ]);
    if (convs.count > 0 || logs.count > 0) {
      this.logger.log(
        `Retención Copiloto: ${convs.count} conversaciones y ${logs.count} logs purgados`,
      );
    }
    return { conversations: convs.count, logs: logs.count };
  }

  private monthsAgo(now: Date, months: number): Date {
    const d = new Date(now.getTime());
    d.setUTCMonth(d.getUTCMonth() - months);
    return d;
  }
}
