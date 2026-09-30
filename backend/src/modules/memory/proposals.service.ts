import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InsightsService } from '../insights/insights.service';
import { NetIncomeService } from '../income/net-income.service';
import { BudgetService } from '../budget/budget.service';
import { SnapshotJob } from '../financial-engine/jobs/snapshot.job';
import { matchFixed } from '../budget/fixed-expense.util';
import { financialPeriod } from '../budget/financial-period.util';
import { monthStartMinus } from '../financial-engine/metrics/series.util';
import { merchantKey } from '../transactions/merchant-key.util';
import { detectIncomeProposal, detectMonthlyMerchants } from './proposals.util';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

/** Acciones que una propuesta puede ejecutar al confirmarla. */
type ProposalPayload =
  | { action: 'crear_gasto_fijo'; key: string; name: string; amount: number; dayOfMonth: number }
  | { action: 'crear_ingreso_fijo' | 'crear_ingreso_variable'; name: string; amount: number; dayOfMonth?: number };

/**
 * FIN-046 Fase 4 · "Aprende de ti". Convierte lo que Millo nota en PROPUESTAS de un
 * toque (novedades tipo `oportunidad` con `payload.action`):
 *  - "¿Pagas Netflix cada mes? ¿Lo vuelvo gasto fijo?"
 *  - "¿Te entra plata cada mes?" / "Te está entrando más de lo que declaraste".
 * Nada se aplica solo: `accept` lo ejecuta cuando la persona confirma. Cada propuesta
 * sale una sola vez (dedupe); si la descarta, no vuelve.
 */
@Injectable()
export class ProposalsService {
  private readonly logger = new Logger(ProposalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly insights: InsightsService,
    private readonly netIncome: NetIncomeService,
    private readonly budget: BudgetService,
    private readonly snapshot: SnapshotJob,
  ) {}

  /** Recorrido diario: propuestas nuevas para los usuarios activos. */
  async run(now = new Date()): Promise<number> {
    const userIds = await this.snapshot.activeUserIds(now);
    let created = 0;
    for (const userId of userIds) {
      try {
        created += await this.analyzeUser(userId, now);
      } catch (e) {
        this.logger.error(`propuestas(${userId}) falló: ${(e as Error).message}`);
      }
    }
    return created;
  }

  async analyzeUser(userId: string, now = new Date()): Promise<number> {
    let created = 0;

    // 1) Gastos que se repiten cada mes y aún no son gasto fijo.
    const [txs, fixed] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId, deletedAt: null, kind: 'gasto', fixedItemId: null, source: { not: 'system' },
          note: { not: null }, occurredAt: { gte: monthStartMinus(now, 3) },
        },
        select: { note: true, amount: true, occurredAt: true, categoryId: true },
      }),
      this.prisma.fixedItem.findMany({ where: { userId, deletedAt: null, kind: 'gasto' } }),
    ]);
    const proposals = detectMonthlyMerchants(
      txs.map((t) => ({ note: t.note, amount: Number(t.amount), occurredAt: t.occurredAt, categoryId: t.categoryId })),
      now,
    );
    for (const p of proposals) {
      // Ya es un gasto fijo (por nombre o palabras de su tipo): no se propone.
      if (matchFixed(fixed.map((f) => ({ id: f.id, name: f.name, amount: Number(f.amount), aliases: [] })), p.key, p.amount)) continue;
      if (fixed.some((f) => merchantKey(f.name) === p.key)) continue;
      const ok = await this.insights.createIfNew({
        userId,
        type: 'oportunidad',
        severity: 'info',
        title: `¿Pagas ${p.name} cada mes?`,
        body: `Lo registraste ${p.months} meses seguidos por unos ${fmt(p.amount)} cerca del día ${p.dayOfMonth}. Si lo vuelves gasto fijo, se registra solo y queda apartado en Mi mes.`,
        dedupeKey: `propuesta:fijo:${p.key}`,
        payload: { action: 'crear_gasto_fijo', key: p.key, name: p.name, amount: p.amount, dayOfMonth: p.dayOfMonth },
      });
      if (ok) created += 1;
    }

    // 2) Ingresos que Millo no conoce (3 meses completos).
    const from = monthStartMinus(now, 3);
    const to = monthStartMinus(now, 0);
    const [incomeTx, income] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId, deletedAt: null, kind: 'ingreso', occurredAt: { gte: from, lt: to } },
        select: { amount: true, occurredAt: true },
      }),
      this.netIncome.compute(userId),
    ]);
    const months = new Map<number, { amount: number; days: number[] }>();
    for (const t of incomeTx) {
      const k = t.occurredAt.getUTCFullYear() * 12 + t.occurredAt.getUTCMonth();
      const m = months.get(k) ?? { amount: 0, days: [] };
      m.amount += Number(t.amount);
      m.days.push(t.occurredAt.getUTCDate());
      months.set(k, m);
    }
    const received = [...months.values()].map((m) => ({ amount: m.amount, day: m.days.sort((a, b) => a - b)[0] }));
    const inc = months.size === 3 ? detectIncomeProposal(received, income.netMonthlyEstimate) : null;
    if (inc) {
      const fixedIncome = inc.action === 'crear_ingreso_fijo';
      const ok = await this.insights.createIfNew({
        userId,
        type: 'oportunidad',
        severity: 'info',
        title: fixedIncome ? '¿Te entra plata cada mes?' : 'Te está entrando más de lo que declaraste',
        body: fixedIncome
          ? `Los últimos 3 meses recibiste unos ${fmt(inc.amount)} cerca del día ${inc.dayOfMonth}. Si lo agregas como ingreso fijo, tu mes y tu plan cuentan con él.`
          : `Los últimos 3 meses te entraron al menos ${fmt(inc.amount)} más de tus ingresos declarados. Si lo sumas como ingreso variable (estimado), tu plan lo aprovecha.`,
        dedupeKey: fixedIncome ? 'propuesta:ingreso_fijo' : 'propuesta:ingreso_variable',
        payload: { ...inc },
      });
      if (ok) created += 1;
    }
    return created;
  }

  /** La persona confirma la propuesta: se ejecuta y la novedad se retira. */
  async accept(userId: string, insightId: string, now = new Date()) {
    const insight = await this.prisma.insight.findFirst({ where: { id: insightId, userId } });
    if (!insight) throw new NotFoundException('Propuesta no encontrada');
    const p = insight.payload as unknown as ProposalPayload | null;
    if (!p?.action) throw new BadRequestException('Esta novedad no tiene una acción para confirmar');
    if (insight.status === 'dismissed') return { done: true, already: true };

    let result: Record<string, unknown>;
    if (p.action === 'crear_gasto_fijo') {
      const item = await this.budget.create(userId, { kind: 'gasto', name: p.name, amount: p.amount, dayOfMonth: p.dayOfMonth } as never);
      // Lo de este ciclo ya se pagó: se enlaza al fijo nuevo para no contarlo doble.
      const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
      const period = financialPeriod(now, settings?.cycleStartDay ?? 1);
      const cycleTx = await this.prisma.transaction.findMany({
        where: { userId, deletedAt: null, kind: 'gasto', fixedItemId: null, occurredAt: { gte: period.start, lt: period.end } },
        select: { id: true, note: true },
      });
      const ids = cycleTx.filter((t) => merchantKey(t.note) === p.key).map((t) => t.id);
      if (ids.length) await this.prisma.transaction.updateMany({ where: { id: { in: ids } }, data: { fixedItemId: (item as { id: string }).id } });
      result = { fixedItemId: (item as { id: string }).id, linked: ids.length };
    } else {
      const source = await this.prisma.incomeSource.create({
        data: {
          userId,
          kind: 'otro',
          name: p.name,
          amount: p.amount,
          isVariable: p.action === 'crear_ingreso_variable',
          dayOfMonth: p.dayOfMonth ?? null,
        },
      });
      result = { incomeSourceId: source.id };
    }
    await this.prisma.insight.update({ where: { id: insight.id }, data: { status: 'dismissed' } });
    return { done: true, action: p.action, ...result };
  }
}
