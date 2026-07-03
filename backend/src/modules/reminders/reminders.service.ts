import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppSender } from './whatsapp-sender.interface';
import { CreateReminderDto, UpdateReminderDto } from './dto/reminder.dto';
import { daysUntil, offsetLabel, shouldFireToday } from './reminder.util';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sender: WhatsAppSender,
  ) {}

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
      include: { user: { include: { settings: true, waLinks: true } } },
    });

    let sent = 0;
    for (const r of reminders) {
      if (!shouldFireToday(r.dueDate, r.offsetsDays, today)) continue;
      // Evitar reenviar el mismo día.
      if (r.lastSentAt && daysUntil(r.lastSentAt, today) === 0) continue;

      const remaining = daysUntil(r.dueDate, today);
      const when = offsetLabel(remaining);
      const amount = r.amount ? ` de ${fmt(Number(r.amount))}` : '';
      const message = `🔔 Recordatorio: ${when === 'hoy' ? 'hoy vence' : `${when} vence`} "${r.title}"${amount}.`;

      // Canal push (FCM) — placeholder de log; integración real en un PR aparte.
      if (r.channels.includes('push')) {
        this.logger.log(`[PUSH] user=${r.userId}: ${message}`);
      }
      // Canal WhatsApp — usa el número verificado si existe y hay opt-in.
      if (r.channels.includes('whatsapp')) {
        const link = r.user?.waLinks?.find(
          (l) => l.status === 'verified' && l.optIn,
        );
        if (link) {
          await this.sender.sendText(link.phoneE164, message);
        }
      }

      await this.prisma.reminder.update({
        where: { id: r.id },
        data: { lastSentAt: today },
      });
      sent += 1;
    }
    if (sent > 0) this.logger.log(`Recordatorios enviados: ${sent}`);
    return { sent };
  }
}
