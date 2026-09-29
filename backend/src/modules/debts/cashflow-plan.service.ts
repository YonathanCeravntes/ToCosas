import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SpendableService } from '../budget/spendable.service';
import { RateBasis } from '../finance/amortization/amortization.types';
import { toEffectiveAnnualRate, toMonthlyEffectiveRate } from '../finance/amortization/interest.util';
import { DebtOutlayService } from './debt-outlay.service';
import { effectiveDebtBalances } from './debt-balance.util';
import { scheduleModelFor } from './product-type.descriptor';
import { buildCashflowPlan, CashflowPlan, PlanDebt } from './cashflow-plan.util';

/**
 * FIN-045 · Arma el plan para liberar flujo con las FUENTES ÚNICAS (§32):
 * lo libre = `SpendableService` (Te queda), cuota que se libera = `DebtOutlayService`
 * (desembolso real, incluye tarjetas), saldo = `effectiveDebtBalances` (BT-021),
 * gasto esencial = fijos de gasto + desembolso (misma definición del Motor, core-metrics).
 */
@Injectable()
export class CashflowPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spendable: SpendableService,
    private readonly debtOutlay: DebtOutlayService,
  ) {}

  async forUser(userId: string, monthlyOverride?: number): Promise<CashflowPlan & { dueDates: Record<string, string | null> }> {
    const [teQueda, debts, outlays, fixedItems, accounts] = await Promise.all([
      this.spendable.compute(userId, new Date()),
      this.prisma.debt.findMany({ where: { userId, deletedAt: null, status: 'activa' } }),
      this.debtOutlay.outlaysByUser(userId),
      this.prisma.fixedItem.findMany({ where: { userId, deletedAt: null, isActive: true, kind: 'gasto' } }),
      this.prisma.account.findMany({ where: { userId, deletedAt: null, archivedAt: null, isEmergencyFund: true } }),
    ]);
    const balances = await effectiveDebtBalances(this.prisma, debts);
    const planDebts: PlanDebt[] = debts.map((d) => {
      const basis = d.rateBasis as RateBasis;
      const rate = Number(d.interestRate ?? 0);
      const isCard = scheduleModelFor(d.debtType) === 'cuotas_por_compra';
      return {
        id: d.id,
        name: d.name,
        balance: balances.get(d.id) ?? 0,
        payment: outlays.byDebt.get(d.id)?.outlay ?? Number(d.monthlyPayment ?? 0),
        // Tarjeta: su saldo ya son cuotas fijas por compra (FIN-031); se proyecta sin
        // interés adicional para no inflar el plazo. Su tasa se muestra igual.
        monthlyRate: isCard || rate <= 0 ? 0 : toMonthlyEffectiveRate(rate, basis),
        annualRatePct: rate > 0 ? toEffectiveAnnualRate(rate, basis) * 100 : 0,
      };
    });
    const essential =
      fixedItems.reduce((a, i) => a + Number(i.amount), 0) + outlays.totalOutlay;
    const emergencyBalance = accounts.reduce((a, x) => a + Number(x.currentBalance), 0);
    const plan = buildCashflowPlan({ free: teQueda.amount, essential, emergencyBalance, debts: planDebts, monthlyOverride });
    const dueDates = Object.fromEntries(debts.map((d) => [d.id, d.nextDueDate ? d.nextDueDate.toISOString() : null]));
    return { ...plan, dueDates };
  }
}
