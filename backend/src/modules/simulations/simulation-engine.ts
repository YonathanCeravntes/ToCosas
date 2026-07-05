import { AmortizationService } from '../finance/amortization/amortization.service';
import { toMonthlyEffectiveRate } from '../finance/amortization/interest.util';
import {
  compareStrategies,
  PortfolioDebt,
} from '../finance/portfolio/portfolio.simulator';
import { computeCoreMetrics } from '../financial-engine/metrics/core-metrics';
import { MetricKey } from '../financial-engine/engine.constants';
import { computeScore, ScoreResult } from '../health/score.util';
import { RateBasis } from '../finance/amortization/amortization.types';

/**
 * Motor de simulaciones (FIN-007 §4.1–4.2). 100% PURO: recibe una foto del
 * estado financiero, aplica el delta hipotético EN MEMORIA y recalcula con las
 * MISMAS funciones del Motor real (`computeCoreMetrics` + `computeScore`) —
 * imposible que la simulación diverja del cálculo real por duplicación.
 * Nunca escribe: las series reales no se contaminan con hipótesis.
 */

export interface SimDebt {
  id: string;
  ref: string; // "deuda #N (tipo)"
  type: string;
  balance: number;
  ratePct: number;
  rateBasis: RateBasis;
  monthlyPayment: number;
  remainingMonths: number;
}

export interface FinancialState {
  income: number;
  expense: number;
  debtPayments: number;
  fixedIncome: number;
  fixedExpense: number;
  debts: SimDebt[];
  liquidBalance: number;
  emergencyBalance: number;
  assetsOnly: number; // activos (sin cuentas)
  netWorthTrend: number | null;
}

export type ScenarioParams =
  | { type: 'abono_extra'; debtId: string; extraMonthly: number }
  | { type: 'nueva_deuda'; amount: number; termMonths: number; ratePct: number; rateBasis: RateBasis; createsAsset?: boolean }
  | { type: 'reducir_gastos'; monthlyAmount: number }
  | { type: 'cambio_ingreso'; newMonthlyIncome: number }
  | { type: 'estrategia_deudas'; extraBudget: number }
  | { type: 'vender_activo'; assetValue: number; salePrice: number; applyToDebtId?: string }
  | { type: 'refinanciar'; debtId: string; newRatePct: number; newRateBasis: RateBasis; newTermMonths: number };

export interface MetricsSnapshot {
  score: number;
  band: ScoreResult['band'];
  dti: number;
  cashflow: number;
  savingsRate: number;
  liquidityRunway: number | null;
  emergencyFundMonths: number | null;
  netWorth: number;
}

export interface SimulationResult {
  type: ScenarioParams['type'];
  before: MetricsSnapshot;
  after: MetricsSnapshot;
  delta: { score: number; dti: number; cashflow: number; netWorth: number };
  specifics: Record<string, number | string | null>;
}

const amortization = new AmortizationService(); // servicio puro, sin dependencias

export function snapshotOf(state: FinancialState): MetricsSnapshot {
  const debtMonthly = state.debts.reduce((a, d) => a + d.monthlyPayment, 0);
  const liabilities = state.debts.reduce((a, d) => a + d.balance, 0);
  const netWorth = state.assetsOnly + state.liquidBalance - liabilities;

  const metrics = computeCoreMetrics({
    income: state.income,
    expense: state.expense,
    debtPayments: state.debtPayments,
    fixedIncome: state.fixedIncome,
    fixedExpense: state.fixedExpense,
    debtMonthly,
    liquidBalance: state.liquidBalance,
    emergencyBalance: state.emergencyBalance,
    netWorth,
  });
  const get = (k: string) => metrics.find((m) => m.metricKey === k)?.value ?? null;

  const score = computeScore({
    liquidityRunway: get(MetricKey.LiquidityRunway),
    dti: get(MetricKey.Dti),
    savingsRate: get(MetricKey.SavingsRate),
    emergencyFundMonths: get(MetricKey.EmergencyFundMonths),
    netWorth,
    netWorthTrend: state.netWorthTrend,
    essentialExpense: get(MetricKey.EssentialExpense),
  });

  return {
    score: score.score,
    band: score.band,
    dti: (get(MetricKey.Dti) as number) ?? 0,
    cashflow: (get(MetricKey.Cashflow) as number) ?? 0,
    savingsRate: (get(MetricKey.SavingsRate) as number) ?? 0,
    liquidityRunway: get(MetricKey.LiquidityRunway),
    emergencyFundMonths: get(MetricKey.EmergencyFundMonths),
    netWorth,
  };
}

const clone = (s: FinancialState): FinancialState => ({
  ...s,
  debts: s.debts.map((d) => ({ ...d })),
});

export function project(state: FinancialState, params: ScenarioParams): SimulationResult {
  const before = snapshotOf(state);
  const after = clone(state);
  const specifics: SimulationResult['specifics'] = {};

  switch (params.type) {
    case 'abono_extra': {
      const debt = mustDebt(state, params.debtId);
      const sim = amortization.simulateExtraPayment(
        {
          principal: debt.balance,
          interestRate: debt.ratePct,
          rateBasis: debt.rateBasis,
          termMonths: debt.remainingMonths,
          startDate: new Date(),
        },
        params.extraMonthly,
      );
      // El abono sale del flujo mensual (no cambia la cuota mínima → DTI igual).
      after.expense += params.extraMonthly;
      specifics.interestSaved = sim.interestSaved;
      specifics.monthsSaved = sim.monthsSaved;
      specifics.newPayoffDate = sim.withExtra.payoffDate;
      specifics.extraMonthly = params.extraMonthly;
      break;
    }
    case 'nueva_deuda': {
      const monthlyRate = toMonthlyEffectiveRate(params.ratePct, params.rateBasis);
      const cuota = amortization.computeMonthlyPayment(params.amount, monthlyRate, params.termMonths);
      const schedule = amortization.buildSchedule({
        principal: params.amount,
        interestRate: params.ratePct,
        rateBasis: params.rateBasis,
        termMonths: params.termMonths,
        startDate: new Date(),
      });
      after.debts.push({
        id: 'hipotetica',
        ref: 'deuda hipotética',
        type: 'nueva',
        balance: params.amount,
        ratePct: params.ratePct,
        rateBasis: params.rateBasis,
        monthlyPayment: cuota,
        remainingMonths: params.termMonths,
      });
      after.debtPayments += cuota;
      if (params.createsAsset !== false) after.assetsOnly += params.amount; // p. ej. el vehículo
      specifics.monthlyPayment = cuota;
      specifics.totalInterest = schedule.totalInterest;
      specifics.payoffDate = schedule.payoffDate;
      break;
    }
    case 'reducir_gastos': {
      after.expense = Math.max(0, after.expense - params.monthlyAmount);
      specifics.freedMonthly = params.monthlyAmount;
      specifics.freedYearly = params.monthlyAmount * 12;
      break;
    }
    case 'cambio_ingreso': {
      // "¿Qué pasa si mi ingreso pasa a X?" — se ajustan real y fijo (la regla
      // max() de DEC-0003 aplica igual sobre el estado hipotético).
      after.income = params.newMonthlyIncome;
      after.fixedIncome = params.newMonthlyIncome;
      specifics.incomeDelta = params.newMonthlyIncome - state.income;
      break;
    }
    case 'estrategia_deudas': {
      const portfolio: PortfolioDebt[] = state.debts.map((d) => ({
        id: d.ref,
        name: d.ref,
        balance: d.balance,
        monthlyRate: toMonthlyEffectiveRate(d.ratePct, d.rateBasis),
        minPayment: d.monthlyPayment,
      }));
      const cmp = compareStrategies(portfolio, params.extraBudget);
      specifics.avalancheMonths = cmp.avalanche.months;
      specifics.avalancheInterest = cmp.avalanche.totalInterest;
      specifics.snowballMonths = cmp.snowball.months;
      specifics.snowballInterest = cmp.snowball.totalInterest;
      specifics.recommended = cmp.recommended;
      specifics.interestDifference = Math.abs(cmp.avalanche.totalInterest - cmp.snowball.totalInterest);
      // El estado no cambia (mismos pagos): before === after en métricas.
      break;
    }
    case 'vender_activo': {
      after.assetsOnly = Math.max(0, after.assetsOnly - params.assetValue);
      let cash = params.salePrice;
      if (params.applyToDebtId) {
        const debt = after.debts.find((d) => d.id === params.applyToDebtId);
        if (debt) {
          const applied = Math.min(cash, debt.balance);
          debt.balance -= applied;
          cash -= applied;
          specifics.appliedToDebt = applied;
          if (debt.balance === 0) {
            after.debtPayments -= 0; // la cuota del mes ya corrió; la mínima desaparece a futuro
            debt.monthlyPayment = 0;
          }
        }
      }
      after.liquidBalance += cash;
      specifics.cashReceived = params.salePrice;
      break;
    }
    case 'refinanciar': {
      const debt = mustDebt(state, params.debtId);
      const current = amortization.buildSchedule({
        principal: debt.balance,
        interestRate: debt.ratePct,
        rateBasis: debt.rateBasis,
        termMonths: debt.remainingMonths,
        startDate: new Date(),
      });
      const proposed = amortization.buildSchedule({
        principal: debt.balance,
        interestRate: params.newRatePct,
        rateBasis: params.newRateBasis,
        termMonths: params.newTermMonths,
        startDate: new Date(),
      });
      const target = after.debts.find((d) => d.id === params.debtId)!;
      target.ratePct = params.newRatePct;
      target.rateBasis = params.newRateBasis;
      target.remainingMonths = params.newTermMonths;
      target.monthlyPayment = proposed.monthlyPayment;
      specifics.currentPayment = current.monthlyPayment;
      specifics.newPayment = proposed.monthlyPayment;
      specifics.paymentDelta = proposed.monthlyPayment - current.monthlyPayment;
      specifics.interestDelta = proposed.totalInterest - current.totalInterest;
      specifics.newPayoffDate = proposed.payoffDate;
      break;
    }
  }

  const afterSnap = snapshotOf(after);
  return {
    type: params.type,
    before,
    after: afterSnap,
    delta: {
      score: afterSnap.score - before.score,
      dti: Math.round((afterSnap.dti - before.dti) * 10_000) / 10_000,
      cashflow: Math.round((afterSnap.cashflow - before.cashflow) * 100) / 100,
      netWorth: Math.round((afterSnap.netWorth - before.netWorth) * 100) / 100,
    },
    specifics,
  };
}

function mustDebt(state: FinancialState, debtId: string): SimDebt {
  const debt = state.debts.find((d) => d.id === debtId);
  if (!debt) throw new Error('Deuda no encontrada para simular');
  return debt;
}
