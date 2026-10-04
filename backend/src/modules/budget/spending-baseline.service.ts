import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MonthSpend, spendingBaseline, SpendingBaseline, VARIABLE_ESSENTIAL_CATEGORIES } from './spending-baseline.util';

/**
 * FIN-061 Fase 2 · Lee los últimos 3 meses CALENDARIO completos de gasto variable
 * (movimientos de gasto que no vienen de un gasto fijo) y arma la línea base.
 */
@Injectable()
export class SpendingBaselineService {
  constructor(private readonly prisma: PrismaService) {}

  async forUser(userId: string, now: Date = new Date()): Promise<SpendingBaseline | null> {
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1));
    const txs = await this.prisma.transaction.findMany({
      where: { userId, deletedAt: null, kind: 'gasto', fixedItemId: null, occurredAt: { gte: from, lt: to } },
      select: { amount: true, occurredAt: true, category: { select: { name: true, isGlobal: true } } },
    });
    const byMonth = new Map<string, MonthSpend>();
    for (let i = 3; i >= 1; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = d.toISOString().slice(0, 7);
      byMonth.set(key, { month: key, total: 0, essential: 0 });
    }
    for (const t of txs) {
      const m = byMonth.get(t.occurredAt.toISOString().slice(0, 7));
      if (!m) continue;
      const amt = Number(t.amount);
      m.total += amt;
      if (t.category?.isGlobal && VARIABLE_ESSENTIAL_CATEGORIES.includes(t.category.name)) m.essential += amt;
    }
    return spendingBaseline([...byMonth.values()]);
  }
}
