import { Injectable, NotFoundException } from '@nestjs/common';
import { InsightSeverity, InsightStatus, InsightType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateInsightInput {
  userId: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  body: string;
  /**
   * Clave de idempotencia (DEC-0006 §10.3):
   *  - condiciones mensuales → `<tipo>:<detalle>:<YYYY-MM>`
   *  - eventos únicos por entidad → `<tipo>:<entityId>` (p. ej. logro_deuda_saldada:<debtId>)
   */
  dedupeKey: string;
  metricKey?: string;
  payload?: Record<string, unknown>;
  validUntil?: Date;
}

@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Crea el insight si no existe (idempotente por dedupeKey). Devuelve null si duplicado. */
  async createIfNew(input: CreateInsightInput) {
    try {
      return await this.prisma.insight.create({
        data: {
          userId: input.userId,
          type: input.type,
          severity: input.severity,
          title: input.title,
          body: input.body,
          dedupeKey: input.dedupeKey,
          metricKey: input.metricKey ?? null,
          payload: (input.payload ?? {}) as Prisma.InputJsonValue,
          validUntil: input.validUntil ?? null,
          deliveredChannels: [],
        },
      });
    } catch (e) {
      // Violación del índice único (userId, dedupeKey) → ya existía.
      if ((e as { code?: string }).code === 'P2002') return null;
      throw e;
    }
  }

  async list(userId: string, includeDismissed = false) {
    return this.prisma.insight.findMany({
      where: {
        userId,
        ...(includeDismissed ? {} : { status: { not: 'dismissed' } }),
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    });
  }

  async setStatus(userId: string, id: string, status: InsightStatus) {
    const insight = await this.prisma.insight.findFirst({ where: { id, userId } });
    if (!insight) throw new NotFoundException('Insight no encontrado');
    return this.prisma.insight.update({ where: { id }, data: { status } });
  }

  async setProactiveEnabled(userId: string, enabled: boolean) {
    await this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, proactiveEnabled: enabled },
      update: { proactiveEnabled: enabled },
    });
    return { proactiveEnabled: enabled };
  }

  async preferences(userId: string) {
    const s = await this.prisma.userSettings.findUnique({ where: { userId } });
    return { proactiveEnabled: s?.proactiveEnabled ?? true };
  }
}
