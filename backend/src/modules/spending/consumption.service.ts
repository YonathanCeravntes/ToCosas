import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SpendableService } from '../budget/spendable.service';
import { SpendClassService } from '../budget/spend-class.service';
import { median } from '../budget/spending-baseline.util';
import { DebtOutlayService } from '../debts/debt-outlay.service';
import { RateBasis } from '../finance/amortization/amortization.types';
import { toMonthlyEffectiveRate } from '../finance/amortization/interest.util';
import { analyzeConsumption, CategoryMonth, CONSUMPTION, ConsumptionAnalysis, SubscriptionItem } from './consumption.util';

const monthKey = (d: Date) => d.toISOString().slice(0, 7);

/** Interés total de una compra a `n` cuotas con interés (cuota francesa). */
export function installmentInterest(amount: number, monthlyRate: number, n: number): number {
  if (n <= 1 || monthlyRate <= 0) return 0;
  const payment = (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
  return Math.max(0, Math.round(payment * n - amount));
}

/**
 * FIN-061 Fase 2.3 · Arma el análisis de consumo del mes con las fuentes únicas:
 * ingreso = SpendableService (incomeBase), cuotas = DebtOutlayService, clases =
 * SpendClassService. Este mes se compara con la mediana de los 3 meses anteriores
 * con datos (la persona contra sí misma, nunca contra el promedio nacional).
 */
@Injectable()
export class ConsumptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spendable: SpendableService,
    private readonly classes: SpendClassService,
    private readonly debtOutlay: DebtOutlayService,
  ) {}

  async forUser(userId: string, now: Date = new Date()): Promise<ConsumptionAnalysis & { month: string; incomeBase: number; dti: number }> {
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1));
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const current = monthKey(thisMonth);
    const past = [3, 2, 1].map((i) => monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));

    const [teQueda, outlays, debts, rows, txs, purchases, fixedItems] = await Promise.all([
      this.spendable.compute(userId, now),
      this.debtOutlay.outlaysByUser(userId),
      this.prisma.debt.findMany({ where: { userId, deletedAt: null, status: { in: ['activa', 'en_mora'] } }, select: { status: true } }),
      this.classes.list(userId),
      this.prisma.transaction.findMany({
        where: { userId, deletedAt: null, kind: 'gasto', fixedItemId: null, occurredAt: { gte: from, lt: next } },
        select: { amount: true, occurredAt: true, categoryId: true },
      }),
      this.prisma.cardPurchase.findMany({
        where: { deletedAt: null, debt: { userId, deletedAt: null }, occurredAt: { gte: from, lt: next } },
        select: {
          amount: true, occurredAt: true, categoryId: true, installmentsCount: true, withInterest: true,
          debt: { select: { interestRate: true, rateBasis: true } },
        },
      }),
      this.prisma.fixedItem.findMany({
        where: { userId, deletedAt: null, isActive: true, kind: 'gasto' },
        select: { id: true, name: true, amount: true, categoryId: true },
      }),
    ]);

    const incomeBase = teQueda.incomeBase;
    const dti = incomeBase > 0 ? outlays.totalOutlay / incomeBase : 0;
    const classOf = new Map(rows.map((r) => [r.categoryId, r]));

    // Tallies por categoría y mes (movimientos variables + compras con tarjeta).
    type Tally = { amount: number; count: number; financed: number; interest: number };
    const tally = new Map<string, Map<string, Tally>>();
    const small = new Map<string, { amount: number; count: number }>();
    const add = (cat: string | null, d: Date, amount: number, financed = 0, interest = 0) => {
      const m = monthKey(d);
      const cls = cat ? classOf.get(cat)?.spendClass : 'mixto';
      if (cls !== 'esencial' && amount < CONSUMPTION.antThreshold) {
        const s = small.get(m) ?? { amount: 0, count: 0 };
        s.amount += amount; s.count += 1; small.set(m, s);
      }
      if (!cat) return;
      const byMonth = tally.get(cat) ?? new Map<string, Tally>();
      const t = byMonth.get(m) ?? { amount: 0, count: 0, financed: 0, interest: 0 };
      t.amount += amount; t.count += 1; t.financed += financed; t.interest += interest;
      byMonth.set(m, t); tally.set(cat, byMonth);
    };
    for (const t of txs) add(t.categoryId, t.occurredAt, Number(t.amount));
    for (const p of purchases) {
      const amount = Number(p.amount);
      const financed = p.withInterest && p.installmentsCount > 1;
      const interest = financed
        ? installmentInterest(amount, toMonthlyEffectiveRate(Number(p.debt.interestRate), p.debt.rateBasis as RateBasis), p.installmentsCount)
        : 0;
      add(p.categoryId, p.occurredAt, amount, financed ? amount : 0, interest);
    }

    // Meses con datos (mismo criterio de la línea base: un mes sin registros no cuenta).
    const monthsWithData = past.filter((m) => [...tally.values()].some((bm) => (bm.get(m)?.amount ?? 0) > 0) || (small.get(m)?.amount ?? 0) > 0);

    const categories: CategoryMonth[] = rows
      .filter((r) => !r.isFixed || tally.has(r.categoryId))
      .map((r) => {
        const bm = tally.get(r.categoryId);
        const cur = bm?.get(current);
        const hist = monthsWithData.map((m) => bm?.get(m) ?? { amount: 0, count: 0 });
        const hasHist = hist.some((h) => h.amount > 0);
        return {
          categoryId: r.categoryId,
          name: r.name,
          spendClass: r.spendClass,
          protected: r.protected,
          monthlyCap: r.monthlyCap,
          amount: Math.round(cur?.amount ?? 0),
          count: cur?.count ?? 0,
          typicalAmount: hasHist ? Math.round(median(hist.map((h) => h.amount))) : null,
          typicalCount: hasHist ? median(hist.map((h) => h.count)) : null,
          financedAmount: Math.round(cur?.financed ?? 0),
          financedInterest: Math.round(cur?.interest ?? 0),
        };
      })
      .filter((c) => c.amount > 0 || c.typicalAmount != null);

    // Gastos fijos que son gusto (suscripciones…) y suscripciones con su precio anterior.
    const subsCat = rows.find((r) => r.name === 'Suscripciones')?.categoryId;
    const gustoFixed = fixedItems.filter((f) => f.categoryId && classOf.get(f.categoryId)?.spendClass === 'gusto');
    const subsItems = fixedItems.filter((f) => f.categoryId && f.categoryId === subsCat);
    const subsTx = subsItems.length
      ? await this.prisma.transaction.findMany({
          where: { userId, deletedAt: null, fixedItemId: { in: subsItems.map((s) => s.id) }, occurredAt: { gte: from, lt: next } },
          select: { fixedItemId: true, amount: true, occurredAt: true },
          orderBy: { occurredAt: 'desc' },
        })
      : [];
    const subscriptions: SubscriptionItem[] = subsItems.map((s) => {
      const paid = subsTx.filter((t) => t.fixedItemId === s.id);
      const amount = Number(s.amount);
      // Precio anterior = el último pago registrado distinto del precio de hoy.
      const prev = paid.find((t) => Math.abs(Number(t.amount) - amount) > 0.5);
      return { name: s.name, amount, previousAmount: prev ? Number(prev.amount) : null };
    });

    const smallHist = monthsWithData.map((m) => small.get(m)?.amount ?? 0);
    const analysis = analyzeConsumption({
      incomeBase,
      dti,
      inArrears: debts.some((d) => d.status === 'en_mora'),
      hasDebt: debts.length > 0,
      categories,
      fixedGustos: gustoFixed.reduce((a, f) => a + Number(f.amount), 0),
      subscriptions,
      smallPurchases: {
        amount: Math.round(small.get(current)?.amount ?? 0),
        count: small.get(current)?.count ?? 0,
        typicalAmount: smallHist.length ? Math.round(median(smallHist)) : null,
      },
    });
    return { month: current, incomeBase, dti: Math.round(dti * 1000) / 1000, ...analysis };
  }
}
