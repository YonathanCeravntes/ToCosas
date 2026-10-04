import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SpendClassService } from './spend-class.service';
import { MonthSpend, spendingBaseline, SpendingBaseline } from './spending-baseline.util';

/**
 * FIN-061 Fase 2 · Lee los últimos 3 meses CALENDARIO completos de gasto variable
 * (movimientos de gasto que no vienen de un gasto fijo) y arma la línea base. Lo
 * esencial sigue la clasificación de la persona (2.2: SpendClassService).
 */
@Injectable()
export class SpendingBaselineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classes: SpendClassService,
  ) {}

  async forUser(userId: string, now: Date = new Date()): Promise<SpendingBaseline | null> {
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1));
    const [txs, classMap] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId, deletedAt: null, kind: 'gasto', fixedItemId: null, occurredAt: { gte: from, lt: to } },
        select: { amount: true, occurredAt: true, categoryId: true },
      }),
      this.classes.classMap(userId),
    ]);
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
      if (t.categoryId && classMap.get(t.categoryId)?.spendClass === 'esencial') m.essential += amt;
    }
    return spendingBaseline([...byMonth.values()]);
  }
}
