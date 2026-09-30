import { Injectable } from '@nestjs/common';
import { NotificationChannel, NotificationKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Presupuesto GLOBAL de notificaciones (FIN-007 §4.5 — resuelve DEC-0006 §10.4).
 *
 * Reparto FIJO sin reasignación (DEC-0007 §10.3):
 *   · recordatorios de cuota: hasta 2/día por usuario
 *   · avisos proactivos:      hasta 1/día por usuario
 * El cupo no usado NO se transfiere: el tope de 1 proactivo/día es una garantía
 * anti-fatiga independiente (DEC-0006), no un cupo optimizable.
 */
export const DAILY_CAP: Record<NotificationKind, number> = {
  recordatorio: 2,
  proactivo: 1,
};

@Injectable()
export class NotificationBudgetService {
  constructor(private readonly prisma: PrismaService) {}

  /** ¿Puede enviarse una notificación de este tipo hoy? (reparto fijo por kind) */
  async canSend(userId: string, kind: NotificationKind, now: Date = new Date()): Promise<boolean> {
    return (await this.sentToday(userId, kind, now)) < DAILY_CAP[kind];
  }

  /**
   * Registra el envío de UN evento: una fila por canal utilizado, todas con el
   * MISMO `sentAt` — el presupuesto cuenta eventos (distinct sentAt), el log
   * audita canales. Cada evento debe registrarse con su propio timestamp.
   */
  async record(
    userId: string,
    kind: NotificationKind,
    channels: NotificationChannel[],
    now: Date = new Date(),
  ): Promise<void> {
    if (channels.length === 0) return;
    await this.prisma.notificationLog.createMany({
      data: channels.map((channel) => ({ userId, kind, channel, sentAt: now })),
    });
  }

  /** Eventos del día por tipo (distinct sentAt: multi-canal cuenta UNA vez). */
  async sentToday(userId: string, kind: NotificationKind, now: Date = new Date()): Promise<number> {
    const rows = await this.prisma.notificationLog.findMany({
      where: { userId, kind, sentAt: { gte: this.dayStart(now) } },
      distinct: ['sentAt'],
      select: { sentAt: true },
    });
    return rows.length;
  }

  private dayStart(now: Date): Date {
    const d = new Date(now.getTime());
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
}
