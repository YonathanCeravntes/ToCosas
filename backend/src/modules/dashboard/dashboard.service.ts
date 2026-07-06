import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { computeNetWorth } from '../accounts/networth.util';
import { financialPeriod } from '../budget/financial-period.util';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface CategoryBucket {
  name: string;
  icon: string;
  color: string;
  amount: number;
  percent: number;
}

/**
 * FIN-014 · Dashboard de Inicio v2 (DEC-0011 §4.3).
 *
 * Agregador THIN: compone servicios/utils ya auditados (patrimonio de FIN-002,
 * periodo de FIN-016) en paralelo, sin lógica financiera nueva. El endpoint
 * clásico /transactions/dashboard se conserva sin cambios (no breaking).
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async home(userId: string) {
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    // FIN-016: el Inicio respeta el ciclo financiero del usuario.
    const period = financialPeriod(new Date(), settings?.cycleStartDay ?? 1);

    const [accounts, assets, debts, fixedItems, periodTxs, recent] = await Promise.all([
      this.prisma.account.findMany({ where: { userId, deletedAt: null } }),
      this.prisma.asset.findMany({ where: { userId, deletedAt: null } }),
      this.prisma.debt.findMany({ where: { userId, deletedAt: null, status: 'activa' } }),
      this.prisma.fixedItem.findMany({ where: { userId, deletedAt: null, isActive: true } }),
      this.prisma.transaction.findMany({
        where: {
          userId,
          deletedAt: null,
          status: 'confirmada',
          occurredAt: { gte: period.start, lt: period.end },
        },
        include: { category: true },
      }),
      this.prisma.transaction.findMany({
        where: { userId, deletedAt: null, status: 'confirmada' },
        orderBy: { occurredAt: 'desc' },
        take: 10,
        include: { category: true, debt: true },
      }),
    ]);

    // Patrimonio (util pura de FIN-002, misma fuente que /net-worth).
    const liabilities = debts.reduce((acc, d) => acc + Number(d.currentBalance), 0);
    const netWorth = computeNetWorth(
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

    // Ahorro total: cuentas de ahorro + fondo de emergencia (sin doble conteo).
    const savingsAccounts = accounts.filter((a) => a.type === 'ahorros' || a.isEmergencyFund);
    const totalSavings = savingsAccounts.reduce((acc, a) => acc + Number(a.currentBalance), 0);

    // Fijo (compromisos declarados) vs variable (transacciones del ciclo).
    const fixedIncome = sumFixed(fixedItems, 'ingreso');
    const fixedExpense = sumFixed(fixedItems, 'gasto');

    const incomeByCat = new Map<string, CategoryBucket>();
    const expenseByCat = new Map<string, CategoryBucket>();
    let variableIncome = 0;
    let variableExpense = 0;
    let debtPayments = 0;

    for (const t of periodTxs) {
      const amt = Number(t.amount);
      if (t.kind === 'ingreso') {
        variableIncome += amt;
        bucket(incomeByCat, t, amt);
      } else if (t.kind === 'gasto') {
        variableExpense += amt;
        bucket(expenseByCat, t, amt);
      } else if (t.kind === 'pago_deuda') {
        debtPayments += amt;
      }
    }

    const incomeTotal = fixedIncome + variableIncome;
    const expenseTotal = fixedExpense + variableExpense;

    return {
      period: {
        start: period.start.toISOString(),
        end: period.end.toISOString(),
        label: period.label,
        cycleStartDay: settings?.cycleStartDay ?? 1,
      },
      netWorth,
      savings: {
        total: round2(totalSavings),
        emergencyFund: netWorth.totalEmergencyFund,
        accounts: savingsAccounts.map((a) => ({
          id: a.id,
          name: a.name,
          balance: Number(a.currentBalance),
          isEmergencyFund: a.isEmergencyFund,
        })),
      },
      income: {
        fixed: round2(fixedIncome),
        variable: round2(variableIncome),
        total: round2(incomeTotal),
        byCategory: toSorted(incomeByCat, variableIncome),
      },
      expense: {
        fixed: round2(fixedExpense),
        variable: round2(variableExpense),
        total: round2(expenseTotal),
        byCategory: toSorted(expenseByCat, variableExpense),
      },
      debtPayments: round2(debtPayments),
      estimatedCashflow: round2(incomeTotal - expenseTotal - debtPayments),
      recentTransactions: recent.map((t) => ({
        id: t.id,
        kind: t.kind,
        amount: Number(t.amount),
        occurredAt: t.occurredAt.toISOString(),
        note: t.note,
        category: t.category
          ? { name: t.category.name, icon: t.category.icon ?? '📦', color: t.category.color ?? '#B0B0B0' }
          : null,
        debtName: t.debt?.name ?? null,
      })),
    };
  }
}

function sumFixed(items: Array<{ kind: string; amount: unknown }>, kind: string): number {
  return items.filter((i) => i.kind === kind).reduce((acc, i) => acc + Number(i.amount), 0);
}

function bucket(
  map: Map<string, CategoryBucket>,
  t: { categoryId: string | null; category: { name: string; icon: string | null; color: string | null } | null },
  amount: number,
) {
  const key = t.categoryId ?? 'sin';
  const cur = map.get(key) ?? {
    name: t.category?.name ?? 'Sin categoría',
    icon: t.category?.icon ?? '📦',
    color: t.category?.color ?? '#B0B0B0',
    amount: 0,
    percent: 0,
  };
  cur.amount += amount;
  map.set(key, cur);
}

function toSorted(map: Map<string, CategoryBucket>, total: number): CategoryBucket[] {
  return [...map.values()]
    .map((c) => ({
      ...c,
      amount: round2(c.amount),
      percent: total > 0 ? Math.round((c.amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}
