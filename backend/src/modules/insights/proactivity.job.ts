import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationChannel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ENGINE_TZ } from '../financial-engine/engine.constants';
import { NotificationBudgetService } from '../notifications/notification-budget.service';
import { PushSender } from '../notifications/push-sender.interface';
import { WhatsAppSender } from '../reminders/whatsapp-sender.interface';
import { TelegramSender } from '../telegram/telegram.provider';

const SEVERITY_ORDER = { critical: 3, warning: 2, info: 1 } as const;

/**
 * Proactividad anti-fatiga (FIN-006 §4.5). Corre a las 7 AM de Bogotá y entrega
 * COMO MÁXIMO 1 insight por usuario por día (el de mayor severidad; el resto
 * queda visible en la app sin notificación). Respeta `proactiveEnabled` y
 * `quietHours`, y usa los canales ya consentidos (push / WhatsApp / Telegram).
 *
 * PENDIENTE DE DEC-0006 §10.4 RESUELTO EN FIN-007 (DEC-0007 §10.3): el tope
 * diario ahora lo gobierna `NotificationBudgetService` (presupuesto GLOBAL con
 * reparto fijo: 2 recordatorios + 1 proactivo/día, sin reasignación de cupos).
 */
@Injectable()
export class ProactivityJob {
  private readonly logger = new Logger(ProactivityJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushSender,
    private readonly whatsapp: WhatsAppSender,
    private readonly telegram: TelegramSender,
    private readonly budget: NotificationBudgetService,
  ) {}

  @Cron('0 0 7 * * *', { timeZone: ENGINE_TZ })
  async run(now: Date = new Date()): Promise<number> {
    const pending = await this.prisma.insight.findMany({
      where: {
        status: 'new',
        deliveredAt: null,
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
      },
      include: {
        user: { include: { settings: true, devices: true, waLinks: true, tgLinks: true } },
      },
    });

    // Elegir 1 por usuario: mayor severidad, luego más reciente (§4.5).
    const byUser = new Map<string, (typeof pending)[number]>();
    for (const insight of pending) {
      const current = byUser.get(insight.userId);
      if (
        !current ||
        SEVERITY_ORDER[insight.severity] > SEVERITY_ORDER[current.severity] ||
        (SEVERITY_ORDER[insight.severity] === SEVERITY_ORDER[current.severity] &&
          insight.createdAt > current.createdAt)
      ) {
        byUser.set(insight.userId, insight);
      }
    }

    let delivered = 0;
    for (const insight of byUser.values()) {
      const settings = insight.user?.settings;
      if (settings?.proactiveEnabled === false) continue;
      if (this.inQuietHours(settings?.quietHours, now)) continue;
      // Presupuesto global (DEC-0007 §10.3): máx. 1 proactivo/día, reparto fijo.
      if (!(await this.budget.canSend(insight.userId, 'proactivo', now))) continue;

      const channels = await this.deliver(insight);
      await this.prisma.insight.update({
        where: { id: insight.id },
        data: { deliveredAt: now, deliveredChannels: channels },
      });
      await this.budget.record(
        insight.userId,
        'proactivo',
        channels as NotificationChannel[],
        now,
      );
      delivered += 1;
    }
    this.logger.log(`Proactividad: ${delivered} aviso(s) entregado(s)`);
    return delivered;
  }

  private async deliver(
    insight: {
      title: string;
      body: string;
      id: string;
      user?: {
        settings?: { notifPush: boolean; notifWhatsapp: boolean } | null;
        devices?: Array<{ fcmToken: string | null }>;
        waLinks?: Array<{ status: string; optIn: boolean; phoneE164: string }>;
        tgLinks?: Array<{ status: string; optIn: boolean; chatId: string | null }>;
      } | null;
    },
  ): Promise<string[]> {
    const channels: string[] = [];
    const message = `${insight.title}\n${insight.body}`;

    if (insight.user?.settings?.notifPush !== false) {
      const tokens = (insight.user?.devices ?? [])
        .map((d) => d.fcmToken)
        .filter((t): t is string => !!t);
      if (tokens.length > 0) {
        await this.push.sendToTokens(tokens, {
          title: insight.title,
          body: insight.body,
          data: { insightId: insight.id, deepLink: 'copilot' },
        });
        channels.push('push');
      }
    }
    if (insight.user?.settings?.notifWhatsapp) {
      const wa = insight.user?.waLinks?.find((l) => l.status === 'verified' && l.optIn);
      if (wa) {
        await this.whatsapp.sendText(wa.phoneE164, message);
        channels.push('whatsapp');
      }
    }
    const tg = insight.user?.tgLinks?.find((l) => l.status === 'verified' && l.optIn && l.chatId);
    if (tg?.chatId) {
      await this.telegram.sendText(tg.chatId, message);
      channels.push('telegram');
    }
    return channels;
  }

  /** quietHours: {start:"22:00", end:"07:00"} — se omite la entrega dentro del rango. */
  inQuietHours(quietHours: unknown, now: Date): boolean {
    const qh = quietHours as { start?: string; end?: string } | null | undefined;
    if (!qh?.start || !qh?.end) return false;
    const toMinutes = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + (m || 0);
    };
    // Hora local de Bogotá (UTC-5, sin DST).
    const bogota = new Date(now.getTime() - 5 * 3_600_000);
    const cur = bogota.getUTCHours() * 60 + bogota.getUTCMinutes();
    const start = toMinutes(qh.start);
    const end = toMinutes(qh.end);
    return start <= end ? cur >= start && cur < end : cur >= start || cur < end;
  }
}
