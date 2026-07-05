import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricKey } from '../financial-engine/engine.constants';
import { monthStart, monthStartMinus } from '../financial-engine/metrics/series.util';
import { computeNetWorth } from '../accounts/networth.util';
import { PILLAR_WEIGHTS, PillarKey, scoreBand } from '../health/score.util';
import {
  brand,
  MinimizedContext,
  MinimizedDebt,
  MinimizedDebtsView,
  MinimizedScoreView,
  MinimizedSnapshotView,
} from './minimized-views';

/**
 * ContextAssembler (FIN-005 §4.3/§4.3-A): el ÚNICO módulo que construye
 * estructuras destinadas al LLM. Emite exclusivamente los campos del allowlist:
 * nada de nombres libres (deudas/gastos fijos/categorías de usuario/cuentas),
 * nada de notas, ids internos ni datos de contacto.
 *
 * Los identificadores "deuda #N"/"gasto fijo #N" son estables por orden de
 * creación, lo que hace el mapeo reversible en servidor sin persistir mapas.
 */
@Injectable()
export class ContextAssembler {
  constructor(private readonly prisma: PrismaService) {}

  async buildInitialContext(userId: string, now = new Date()): Promise<MinimizedContext> {
    const [snapshot, debts, score] = await Promise.all([
      this.buildSnapshotView(userId, now),
      this.buildDebtsView(userId),
      this.buildScoreView(userId, now),
    ]);
    return brand({
      period: snapshot.period,
      score: score.score,
      metrics: snapshot.metrics,
      debts: debts.debts,
      budget: snapshot.budget,
      netWorth: snapshot.netWorth,
      categorySpend: await this.categorySpend(userId, now),
    });
  }

  /** Vista de la tool `get_financial_snapshot`. */
  async buildSnapshotView(userId: string, now = new Date()): Promise<MinimizedSnapshotView> {
    const current = monthStart(now);
    const [readings, fixedItems, accounts, assets, debts] = await Promise.all([
      this.prisma.metricReading.findMany({
        where: { userId, period: 'month', capturedAt: current },
      }),
      this.prisma.fixedItem.findMany({ where: { userId, deletedAt: null, isActive: true } }),
      this.prisma.account.findMany({ where: { userId, deletedAt: null, archivedAt: null } }),
      this.prisma.asset.findMany({ where: { userId, deletedAt: null } }),
      this.prisma.debt.findMany({ where: { userId, deletedAt: null, status: 'activa' } }),
    ]);

    const metrics = readings
      .filter((r) => !r.metricKey.startsWith('score') && !r.metricKey.startsWith('anomaly.'))
      .map((r) => ({ key: r.metricKey, value: Number(r.value) }));

    // Presupuesto: totales + top 3 gastos fijos SIN nombre libre ("gasto fijo #N").
    const sorted = fixedItems
      .filter((i) => i.kind === 'gasto')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const byAmount = [...sorted].sort((a, b) => Number(b.amount) - Number(a.amount));
    const fixedIncomeTotal = fixedItems
      .filter((i) => i.kind === 'ingreso')
      .reduce((a, i) => a + Number(i.amount), 0);
    const fixedExpenseTotal = sorted.reduce((a, i) => a + Number(i.amount), 0);
    const debtMonthly = debts.reduce((a, d) => a + Number(d.monthlyPayment ?? 0), 0);

    const liabilities = debts.reduce((a, d) => a + Number(d.currentBalance), 0);
    const nw = computeNetWorth(
      accounts.map((a) => ({
        currentBalance: Number(a.currentBalance),
        isLiquid: a.isLiquid,
        includeInNetWorth: a.includeInNetWorth,
        isEmergencyFund: a.isEmergencyFund,
      })),
      assets.map((a) => ({
        currentValue: Number(a.currentValue),
        includeInNetWorth: a.includeInNetWorth,
      })),
      liabilities,
    );

    return brand({
      kind: 'financial_snapshot' as const,
      period: current.toISOString().slice(0, 7),
      metrics,
      budget: {
        fixedIncomeTotal,
        fixedExpenseTotal,
        topFixedExpenses: byAmount.slice(0, 3).map((i) => ({
          ref: `gasto fijo #${sorted.indexOf(i) + 1}`,
          amount: Number(i.amount),
        })),
        available: fixedIncomeTotal - fixedExpenseTotal - debtMonthly,
      },
      netWorth: {
        totalAssets: nw.totalAssets,
        totalLiquid: nw.totalLiquid,
        emergencyFund: nw.totalEmergencyFund,
        totalLiabilities: nw.totalLiabilities,
        net: nw.netWorth,
      },
    });
  }

  /** Vista de la tool `get_debts` — identificadores no libres (§4.3). */
  async buildDebtsView(userId: string): Promise<MinimizedDebtsView> {
    const debts = await this.prisma.debt.findMany({
      where: { userId, deletedAt: null, status: 'activa' },
      orderBy: { createdAt: 'asc' },
      include: { amortization: { orderBy: { periodNo: 'desc' }, take: 1 } },
    });
    const minimized: MinimizedDebt[] = debts.map((d, i) => ({
      ref: `deuda #${i + 1} (${d.debtType})`,
      type: d.debtType,
      balance: Number(d.currentBalance),
      ratePct: Number(d.interestRate),
      rateBasis: d.rateBasis,
      monthlyPayment: Number(d.monthlyPayment ?? 0),
      projectedPayoffDate:
        d.amortization[0]?.dueDate.toISOString().slice(0, 10) ?? null,
    }));
    return brand({ kind: 'debts' as const, debts: minimized });
  }

  /** Vista de la tool `get_score_breakdown`. */
  async buildScoreView(userId: string, now = new Date()): Promise<MinimizedScoreView> {
    const current = monthStart(now);
    const previous = monthStartMinus(now, 1);
    const [cur, prev] = await Promise.all([
      this.readScore(userId, current),
      this.readScore(userId, previous),
    ]);
    const pillars = (Object.keys(PILLAR_WEIGHTS) as PillarKey[]).map((key) => ({
      key,
      value: cur.get(`score.${key}`) ?? null,
      status: cur.has(`score.${key}`) ? 'ok' : 'unavailable',
    }));
    const scoreValue = cur.get('score') ?? null;
    return brand({
      kind: 'score_breakdown' as const,
      score: {
        value: scoreValue,
        band: scoreValue !== null ? scoreBand(scoreValue) : null,
        pillars,
      },
      deltaByPillar: pillars
        .filter((p) => p.value !== null && prev.has(`score.${p.key}`))
        .map((p) => ({
          pillar: p.key,
          delta: Math.round(((p.value as number) - (prev.get(`score.${p.key}`) as number)) * 10) / 10,
        }))
        .filter((d) => d.delta !== 0),
    });
  }

  /** Gasto por categoría: nombre solo si es curada (global); si no, "#N" (§4.3-B). */
  private async categorySpend(userId: string, now: Date) {
    const from = monthStart(now);
    const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
    const txs = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        kind: 'gasto',
        categoryId: { not: null },
        occurredAt: { gte: from, lt: to },
      },
      include: { category: { select: { name: true, isGlobal: true, createdAt: true } } },
    });
    const byCat = new Map<string, { amount: number; isGlobal: boolean; createdAt: Date }>();
    for (const t of txs) {
      if (!t.category) continue;
      const key = t.category.name;
      const prev = byCat.get(key);
      byCat.set(key, {
        amount: (prev?.amount ?? 0) + Number(t.amount),
        isGlobal: t.category.isGlobal,
        createdAt: t.category.createdAt,
      });
    }
    // Categorías de usuario (texto libre) → "categoría personalizada #N" estable.
    const customs = [...byCat.entries()]
      .filter(([, v]) => !v.isGlobal)
      .sort(([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime());
    return [...byCat.entries()].map(([name, v]) => ({
      category: v.isGlobal
        ? name
        : `categoría personalizada #${customs.findIndex(([n]) => n === name) + 1}`,
      amount: v.amount,
    }));
  }

  private async readScore(userId: string, capturedAt: Date): Promise<Map<string, number>> {
    const rows = await this.prisma.metricReading.findMany({
      where: { userId, period: 'month', capturedAt, metricKey: { startsWith: 'score' } },
    });
    return new Map(rows.map((r) => [r.metricKey, Number(r.value)]));
  }
}
