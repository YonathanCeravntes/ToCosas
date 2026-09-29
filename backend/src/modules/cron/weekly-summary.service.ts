import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SpendableService } from '../budget/spendable.service';
import { CashflowPlanService } from '../debts/cashflow-plan.service';
import { TelegramSender } from '../telegram/telegram.provider';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
const DAY = 86_400_000;

/** Semana ISO "2026-W40" (clave de envío único por semana). */
export function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / DAY + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}

/**
 * FIN-046 Fase 3 · Resumen semanal por Telegram (domingo): lo que salió en la semana,
 * lo que queda del ciclo (§32), el próximo pago y la jugada del plan (FIN-045).
 * Una vez por semana por persona; respeta `proactiveEnabled` y el opt-in del chat.
 */
@Injectable()
export class WeeklySummaryService {
  private readonly logger = new Logger(WeeklySummaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly spendable: SpendableService,
    private readonly plan: CashflowPlanService,
    private readonly telegram: TelegramSender,
  ) {}

  async run(now = new Date()): Promise<number> {
    const links = await this.prisma.telegramLink.findMany({
      where: { status: 'verified', optIn: true, chatId: { not: null }, user: { deletedAt: null } },
      include: { user: { include: { settings: true } } },
    });
    const week = isoWeek(now);
    let sent = 0;
    for (const link of links) {
      if (link.user.settings?.proactiveEnabled === false) continue;
      const dedupeKey = `fin046_semanal_${week}`;
      const done = await this.prisma.insight.findUnique({ where: { userId_dedupeKey: { userId: link.userId, dedupeKey } } });
      if (done) continue;
      try {
        const text = await this.compose(link.userId, now);
        await this.telegram.sendText(link.chatId!, text);
        // Marca de envío (queda descartada: no aparece como novedad en la app).
        await this.prisma.insight.create({
          data: {
            userId: link.userId, type: 'cambio_tendencia', severity: 'info', status: 'dismissed',
            title: 'Resumen semanal', body: text, dedupeKey, deliveredAt: now, deliveredChannels: ['telegram'],
          },
        });
        sent += 1;
      } catch (e) {
        this.logger.warn(`Resumen semanal falló para un usuario: ${(e as Error).message}`);
      }
    }
    if (sent) this.logger.log(`Resúmenes semanales enviados: ${sent}`);
    return sent;
  }

  async compose(userId: string, now = new Date()): Promise<string> {
    const since = new Date(now.getTime() - 7 * DAY);
    const [tq, week, nextDebt, plan] = await Promise.all([
      this.spendable.compute(userId, now),
      this.prisma.transaction.groupBy({
        by: ['kind'],
        where: { userId, deletedAt: null, occurredAt: { gte: since, lte: now } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.debt.findFirst({
        where: { userId, deletedAt: null, status: 'activa', nextDueDate: { gte: new Date(now.getTime() - DAY) } },
        orderBy: { nextDueDate: 'asc' },
      }),
      this.plan.forUser(userId),
    ]);
    const sum = (k: string) => Number(week.find((w) => w.kind === k)?._sum.amount ?? 0);
    const count = week.reduce((a, w) => a + w._count._all, 0);
    const lines = ['📊 Tu semana en Millo'];
    lines.push(
      count > 0
        ? `• Salieron ${fmt(sum('gasto') + sum('pago_deuda'))} en ${count} movimiento${count === 1 ? '' : 's'}${sum('ingreso') > 0 ? ` y entraron ${fmt(sum('ingreso'))}` : ''}.`
        : '• Esta semana no registraste movimientos. Escríbeme tus gastos y te ayudo a llevarlos.',
    );
    const until = new Date(tq.until).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    lines.push(`• Te quedan ${fmt(tq.amount)} para gastar hasta el ${until}${tq.perDay ? ` (≈ ${fmt(tq.perDay)} por día)` : ''}.`);
    if (nextDebt?.nextDueDate) {
      const when = nextDebt.nextDueDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
      const step = plan.steps.find((s) => s.debtId === nextDebt.id);
      lines.push(`• Próximo pago: ${nextDebt.name}${step ? ` ${fmt(step.payment)}` : ''} el ${when}.`);
    }
    const first = plan.steps[0];
    if (first && plan.toDebt > 0) {
      lines.push(`👉 Tu jugada: abónale ${fmt(plan.toDebt)} a ${first.name} y liberas ${fmt(first.payment)} al mes cuando la termines.`);
    }
    lines.push('Pregúntame lo que quieras, por ejemplo "¿cuánto me queda?".');
    return lines.join('\n');
  }
}
