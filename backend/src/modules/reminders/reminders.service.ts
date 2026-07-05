import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationChannel } from '@prisma/client';
import { WhatsAppSender } from './whatsapp-sender.interface';
import { PushSender } from '../notifications/push-sender.interface';
import { NotificationBudgetService } from '../notifications/notification-budget.service';
import { TelegramSender } from '../telegram/telegram.provider';
import { CreateReminderDto, UpdateReminderDto } from './dto/reminder.dto';
import { addOneMonth, daysUntil, offsetLabel, shouldFireToday } from './reminder.util';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sender: WhatsAppSender,
    private readonly push: PushSender,
    private readonly telegram: TelegramSender,
    private readonly budget: NotificationBudgetService,
  ) {}

  /**
   * Crea o actualiza el recordatorio recurrente de la cuota de una deuda. Se
   * llama al crear/editar la deuda para que las cuotas avisen sin configuración
   * manual. Canales por defecto: push + WhatsApp.
   */
  async ensureDebtReminder(
    userId: string,
    debt: { id: string; name: string; nextDueDate: Date | null; monthlyPayment: unknown },
  ): Promise<void> {
    if (!debt.nextDueDate) return;
    const existing = await this.prisma.reminder.findFirst({
      where: { userId, debtId: debt.id, deletedAt: null },
    });
    const data = {
      title: `Cuota ${debt.name}`,
      dueDate: debt.nextDueDate,
      amount: debt.monthlyPayment != null ? (debt.monthlyPayment as never) : null,
    };
    if (existing) {
      await this.prisma.reminder.update({ where: { id: existing.id }, data });
    } else {
      await this.prisma.reminder.create({
        data: {
          userId,
          debtId: debt.id,
          ...data,
          offsetsDays: [3, 1, 0],
          channels: ['push', 'whatsapp', 'telegram'],
        },
      });
    }
  }

  async create(userId: string, dto: CreateReminderDto) {
    return this.prisma.reminder.create({
      data: {
        userId,
        debtId: dto.debtId ?? null,
        title: dto.title,
        dueDate: new Date(dto.dueDate),
        amount: dto.amount ?? null,
        offsetsDays: dto.offsetsDays ?? [3, 1, 0],
        channels: (dto.channels as ('push' | 'whatsapp' | 'email')[]) ?? ['push'],
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.reminder.findMany({
      where: { userId, deletedAt: null },
      orderBy: { dueDate: 'asc' },
    });
  }

  async update(userId: string, id: string, dto: UpdateReminderDto) {
    const r = await this.prisma.reminder.findFirst({ where: { id, userId, deletedAt: null } });
    if (!r) throw new NotFoundException('Recordatorio no encontrado');
    return this.prisma.reminder.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        channels: dto.channels as ('push' | 'whatsapp' | 'email')[] | undefined,
      },
    });
  }

  async remove(userId: string, id: string) {
    const r = await this.prisma.reminder.findFirst({ where: { id, userId, deletedAt: null } });
    if (!r) throw new NotFoundException('Recordatorio no encontrado');
    await this.prisma.reminder.update({ where: { id }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }

  /**
   * Recorre los recordatorios activos y dispara los que corresponden a hoy.
   * Devuelve cuántos se enviaron. Idempotente por día (last_sent_at).
   */
  async dispatchDue(today: Date = new Date()): Promise<{ sent: number }> {
    const reminders = await this.prisma.reminder.findMany({
      where: { isActive: true, deletedAt: null },
      include: { user: { include: { settings: true, waLinks: true, devices: true, tgLinks: true } } },
    });

    let sent = 0;
    for (const r of reminders) {
      if (!shouldFireToday(r.dueDate, r.offsetsDays, today)) continue;
      // Evitar reenviar el mismo día.
      if (r.lastSentAt && daysUntil(r.lastSentAt, today) === 0) continue;
      // Presupuesto global (FIN-007 §4.5 / DEC-0007 §10.3): máx. 2 recordatorios/día.
      if (!(await this.budget.canSend(r.userId, 'recordatorio', today))) continue;

      const remaining = daysUntil(r.dueDate, today);
      const when = offsetLabel(remaining);
      const amount = r.amount ? ` de ${fmt(Number(r.amount))}` : '';
      const message = `🔔 Recordatorio: ${when === 'hoy' ? 'hoy vence' : `${when} vence`} "${r.title}"${amount}.`;

      const usedChannels: NotificationChannel[] = [];
      // Canal push (Expo/FCM) — envía a los dispositivos registrados del usuario.
      if (r.channels.includes('push')) {
        const tokens = (r.user?.devices ?? [])
          .map((d) => d.fcmToken)
          .filter((t): t is string => !!t);
        await this.push.sendToTokens(tokens, {
          title: r.title,
          body: `${when === 'hoy' ? 'Vence hoy' : `Vence ${when}`}${amount}.`,
          data: { reminderId: r.id, debtId: r.debtId },
        });
        if (tokens.length > 0) usedChannels.push('push');
      }
      // Canal WhatsApp — usa el número verificado si existe y hay opt-in.
      if (r.channels.includes('whatsapp')) {
        const link = r.user?.waLinks?.find(
          (l) => l.status === 'verified' && l.optIn,
        );
        if (link) {
          await this.sender.sendText(link.phoneE164, message);
          usedChannels.push('whatsapp');
        }
      }
      // Canal Telegram — usa el chat verificado con opt-in.
      if (r.channels.includes('telegram')) {
        const link = r.user?.tgLinks?.find(
          (l) => l.status === 'verified' && l.optIn && l.chatId,
        );
        if (link?.chatId) {
          await this.telegram.sendText(link.chatId, message);
          usedChannels.push('telegram');
        }
      }
      // Presupuesto global: registra el EVENTO (timestamp propio por recordatorio).
      await this.budget.record(r.userId, 'recordatorio', usedChannels, new Date());

      // Cuota recurrente: al llegar el día de vencimiento, avanza al mes siguiente
      // para que la próxima cuota vuelva a avisar automáticamente.
      const rollToNextMonth = r.debtId != null && remaining <= 0;
      await this.prisma.reminder.update({
        where: { id: r.id },
        data: rollToNextMonth
          ? { lastSentAt: today, dueDate: addOneMonth(r.dueDate) }
          : { lastSentAt: today },
      });
      if (rollToNextMonth && r.debtId) {
        await this.prisma.debt.update({
          where: { id: r.debtId },
          data: { nextDueDate: addOneMonth(r.dueDate) },
        });
      }
      sent += 1;
    }
    if (sent > 0) this.logger.log(`Recordatorios enviados: ${sent}`);
    return { sent };
  }
}
