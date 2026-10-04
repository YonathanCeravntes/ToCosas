import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SpendableService } from '../budget/spendable.service';
import { SpendingBaselineService } from '../budget/spending-baseline.service';
import { YearPlanService } from '../budget/year-plan.service';
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
    private readonly baseline: SpendingBaselineService,
    private readonly yearPlan: YearPlanService,
  ) {}

  async forUser(
    userId: string,
    monthlyOverride?: number,
  ): Promise<
    CashflowPlan & {
      dueDates: Record<string, string | null>;
      margin: {
        source: 'estable' | 'hoy';
        amount: number;
        typicalVariable: number | null;
        lowVariable: number | null;
        highVariable: number | null;
        stableIncome: number;
        incomeSource: 'mes_flojo' | 'estimado';
        annualSetAside: number;
      };
    }
  > {
    const now = new Date();
    const [teQueda, debts, outlays, fixedItems, accounts, typical, annual] = await Promise.all([
      this.spendable.compute(userId, new Date()),
      this.prisma.debt.findMany({ where: { userId, deletedAt: null, status: 'activa' } }),
      this.debtOutlay.outlaysByUser(userId),
      this.prisma.fixedItem.findMany({ where: { userId, deletedAt: null, isActive: true, kind: 'gasto' } }),
      this.prisma.account.findMany({ where: { userId, deletedAt: null, archivedAt: null, isEmergencyFund: true } }),
      this.baseline.forUser(userId, now),
      this.yearPlan.listAnnual(userId, now),
    ]);
    const income = await this.yearPlan.stableIncome(userId, teQueda, now);
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
        compareRate: rate > 0 ? toMonthlyEffectiveRate(rate, basis) : 0,
      };
    });
    const committed = fixedItems.reduce((a, i) => a + Number(i.amount), 0) + outlays.totalOutlay;
    // FIN-061 F2: lo esencial incluye el mercado, transporte y salud típicos y (2.5) lo
    // que toca apartar al mes para los gastos grandes del año.
    const annualSetAside = annual.monthlyTotal;
    const essential = committed + (typical?.typicalEssential ?? 0) + annualSetAside;
    // FIN-061 F2 · Margen ESTABLE: ingreso − compromisos − gasto variable típico
    // (mediana de 3 meses). Antes era "Te queda" de hoy: el día 2 era casi todo el
    // mes y el día 28 casi nada. Sin historial, se usa lo de hoy.
    // 2.5: con ingreso irregular, la parte variable es la del mes flojo (percentil 25 de 6
    // meses); los gastos grandes del año se apartan antes de proponer abonos.
    const stable = typical
      ? Math.max(0, Math.round(income.amount - committed - typical.typicalVariable - annualSetAside))
      : null;
    const free = stable ?? teQueda.amount;
    const emergencyBalance = accounts.reduce((a, x) => a + Number(x.currentBalance), 0);
    const plan = buildCashflowPlan({ free, essential, emergencyBalance, debts: planDebts, monthlyOverride });
    const dueDates = Object.fromEntries(debts.map((d) => [d.id, d.nextDueDate ? d.nextDueDate.toISOString() : null]));
    return {
      ...plan,
      dueDates,
      margin: {
        source: stable != null ? 'estable' : 'hoy',
        amount: free,
        typicalVariable: typical?.typicalVariable ?? null,
        lowVariable: typical?.lowVariable ?? null,
        highVariable: typical?.highVariable ?? null,
        stableIncome: income.amount,
        incomeSource: income.variable.source,
        annualSetAside,
      },
    };
  }
}
