import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { toEffectiveAnnualRate } from '../finance/amortization/interest.util';
import { toMonthlyEffectiveRate } from '../finance/amortization/interest.util';
import {
  compareStrategies,
  PortfolioDebt,
} from '../finance/portfolio/portfolio.simulator';
import {
  generateSuggestions,
  FinancialSnapshot,
  CategorySpend,
} from './suggestions.engine';

@Injectable()
export class SuggestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: TransactionsService,
  ) {}

  /** Construye la foto financiera y devuelve sugerencias (sin persistir). */
  async getSuggestions(userId: string) {
    const snapshot = await this.buildSnapshot(userId);
    return generateSuggestions(snapshot);
  }

  /** Compara avalanche vs snowball con un presupuesto extra. */
  async compareStrategies(userId: string, extraBudget: number) {
    const debts = await this.prisma.debt.findMany({
      where: { userId, deletedAt: null, status: 'activa' },
      include: { entity: true },
    });
    const portfolio: PortfolioDebt[] = debts
      .filter((d) => Number(d.currentBalance) > 0)
      .map((d) => ({
        id: d.id,
        name: d.name,
        balance: Number(d.currentBalance),
        monthlyRate: toMonthlyEffectiveRate(Number(d.interestRate), d.rateBasis),
        minPayment: Number(d.monthlyPayment ?? 0),
      }));

    const result = compareStrategies(portfolio, extraBudget);
    const nameOf = (id: string) => debts.find((d) => d.id === id)?.name ?? id;
    return {
      avalanche: { ...result.avalanche, order: result.avalanche.payoffOrder.map(nameOf) },
      snowball: { ...result.snowball, order: result.snowball.payoffOrder.map(nameOf) },
      recommended: result.recommended,
      interestDifference:
        Math.round((result.snowball.totalInterest - result.avalanche.totalInterest) * 100) / 100,
    };
  }

  private async buildSnapshot(userId: string): Promise<FinancialSnapshot> {
    const [debts, dash, categorySpend] = await Promise.all([
      this.prisma.debt.findMany({
        where: { userId, deletedAt: null, status: 'activa' },
      }),
      this.transactions.monthlyDashboard(userId),
      this.spendByCategory(userId),
    ]);

    return {
      income: dash.income,
      expense: dash.expense,
      debtPayments: dash.debtPayments,
      debts: debts
        .filter((d) => Number(d.currentBalance) > 0)
        .map((d) => ({
          id: d.id,
          name: d.name,
          balance: Number(d.currentBalance),
          annualRatePct:
            Math.round(
              toEffectiveAnnualRate(Number(d.interestRate), d.rateBasis) * 10000,
            ) / 100,
        })),
      spendByCategory: categorySpend,
    };
  }

  private async spendByCategory(userId: string): Promise<CategorySpend[]> {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const rows = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        deletedAt: null,
        kind: 'gasto',
        occurredAt: { gte: start, lt: end },
      },
      _sum: { amount: true },
    });
    const cats = await this.prisma.category.findMany({
      where: { id: { in: rows.map((r) => r.categoryId).filter(Boolean) as string[] } },
    });
    const nameOf = (id: string | null) =>
      id ? (cats.find((c) => c.id === id)?.name ?? 'otros') : 'otros';
    return rows.map((r) => ({
      category: nameOf(r.categoryId),
      amount: Number(r._sum.amount ?? 0),
    }));
  }
}
