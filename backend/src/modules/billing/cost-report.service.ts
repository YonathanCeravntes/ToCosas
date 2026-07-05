import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Telemetría de costo variable por usuario/mes (DEC-0009 §10.5): insumo del
 * fundador para fijar el precio de Millo+ con datos reales antes de activar
 * cobros de producción.
 *  (a) Llamadas reales a Anthropic: AiInteractionLog purpose='chat',
 *      direction='response' con model no nulo (las plantillas no cuentan).
 *  (b) Mensajes WhatsApp salientes: NotificationLog channel='whatsapp'
 *      (recordatorios/proactivos) + respuestas del bot (webhook_events
 *      provider='whatsapp' procesados — 1 respuesta por mensaje entrante).
 */
@Injectable()
export class CostReportService {
  constructor(private readonly prisma: PrismaService) {}

  async monthly(month?: string) {
    const ref = month ? new Date(`${month}-01T00:00:00Z`) : new Date();
    const from = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1));
    const to = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 1));

    const [anthropic, waNotifs, waReplies] = await Promise.all([
      this.prisma.aiInteractionLog.groupBy({
        by: ['userId'],
        where: {
          purpose: 'chat',
          direction: 'response',
          model: { not: null },
          createdAt: { gte: from, lt: to },
        },
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true },
      }),
      this.prisma.notificationLog.groupBy({
        by: ['userId'],
        where: { channel: 'whatsapp', sentAt: { gte: from, lt: to } },
        _count: { _all: true },
      }),
      // Respuestas del bot de WhatsApp (sin userId directo: agregado global).
      this.prisma.webhookEvent.count({
        where: { provider: 'whatsapp', status: 'processed', processedAt: { gte: from, lt: to } },
      }),
    ]);

    const byUser = new Map<string, { anthropicCalls: number; inputTokens: number; outputTokens: number; waMessages: number }>();
    for (const row of anthropic) {
      byUser.set(row.userId, {
        anthropicCalls: row._count._all,
        inputTokens: row._sum.inputTokens ?? 0,
        outputTokens: row._sum.outputTokens ?? 0,
        waMessages: 0,
      });
    }
    for (const row of waNotifs) {
      const entry = byUser.get(row.userId) ?? { anthropicCalls: 0, inputTokens: 0, outputTokens: 0, waMessages: 0 };
      entry.waMessages += row._count._all;
      byUser.set(row.userId, entry);
    }

    return {
      month: from.toISOString().slice(0, 7),
      users: [...byUser.entries()].map(([userId, v]) => ({ userId, ...v })),
      totals: {
        anthropicCalls: anthropic.reduce((a, r) => a + r._count._all, 0),
        inputTokens: anthropic.reduce((a, r) => a + (r._sum.inputTokens ?? 0), 0),
        outputTokens: anthropic.reduce((a, r) => a + (r._sum.outputTokens ?? 0), 0),
        waNotificationMessages: waNotifs.reduce((a, r) => a + r._count._all, 0),
        waBotReplies: waReplies,
      },
    };
  }
}
