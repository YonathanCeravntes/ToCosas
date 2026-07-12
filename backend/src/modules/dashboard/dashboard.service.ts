import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { computeNetWorth } from '../accounts/networth.util';
import { financialPeriod } from '../budget/financial-period.util';
import { SpendableService } from '../budget/spendable.service';
import { MetricKey } from '../financial-engine/engine.constants';
import { EMERGENCY_FUND_MILESTONES } from '../financial-engine/metrics/emergency-fund.constants';
import { monthStart } from '../financial-engine/metrics/series.util';
import { DEBT_RATIO_CUTS } from '../health/score.util';

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
  constructor(
    private readonly prisma: PrismaService,
    // FIN-020 (§32): "Te queda" viene de la MISMA fuente que Presupuesto.
    private readonly spendable: SpendableService,
  ) {}

  async home(userId: string) {
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    // FIN-016: el Inicio respeta el ciclo financiero del usuario.
    const period = financialPeriod(new Date(), settings?.cycleStartDay ?? 1);

    const [accounts, assets, debts, fixedItems, periodTxs, recent, teQueda, fundReading] = await Promise.all([
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
      this.spendable.compute(userId),
      // FIN-021 (§32): la cobertura del fondo se LEE del Motor (mes calendario,
      // invariante FIN-016) — la misma lectura persistida que consume Salud.
      this.prisma.metricReading.findFirst({
        where: {
          userId,
          period: 'month',
          capturedAt: monthStart(new Date()),
          metricKey: MetricKey.EmergencyFundMonths,
        },
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
    const estimatedCashflow = round2(incomeTotal - expenseTotal - debtPayments);

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
      // FIN-020: `estimatedCashflow` (proyección estructural) se conserva en el
      // contrato, pero el hero del Inicio pasa a mostrar `teQueda` (§32, Alt A).
      estimatedCashflow,
      teQueda,
      // FIN-017 (DEC-0017 §5.1, ARQ-0017 §4.7.3): interpretación server-side con
      // cifras PROPIAS del home — sin llamadas al Score (ruta (a)).
      interpretation: {
        // §4.1-ter: recalibrada para Alt A — base = ingresos REALES recibidos.
        cashflow: interpretCashflow(teQueda.amount, teQueda.receivedIncome),
        debt: interpretDebt(round2(debtPayments), round2(incomeTotal)),
        // FIN-021: habla del FONDO (lectura oficial del Motor), ya no del
        // ahorro total con fórmula propia — §32 por construcción.
        savings: interpretEmergencyFund(fundReading ? Number(fundReading.value) : null),
      },
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

export type InterpretationLevel = 'verde' | 'amarillo' | 'rojo';
export interface Interpretation {
  level: InterpretationLevel;
  text: string;
}

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

/**
 * FIN-017 §4.7.3 — reglas transversales: montos en pesos sin decimales, cero
 * jerga, sin referencias a calendario/ciclo/DTI en el texto visible, y si falta
 * el dato la línea SE OMITE (null) — nunca un texto que genere una pregunta.
 *
 * FIN-020 §4.1-ter: recalibrada para Alt A. La base es el ingreso REALMENTE
 * recibido y el monto ya descuenta compromisos pendientes, así que un valor
 * negativo NO implica sobregasto — el rojo no puede culpar. El corte del 10%
 * se mantiene (holgura relativa, independiente de la composición de la base);
 * compromiso §13: revisarlo con datos reales tras la RC integral.
 */
function interpretCashflow(teQueda: number, receivedIncome: number): Interpretation | null {
  if (receivedIncome <= 0) return null;
  if (teQueda < 0) {
    return {
      level: 'rojo',
      text: 'Lo que viene comprometido supera lo que te queda — mira qué puedes mover',
    };
  }
  if (teQueda < receivedIncome * 0.1) {
    return { level: 'amarillo', text: 'Vas justa: después de apartar lo que viene, queda poco' };
  }
  // FIN-018 D1-A (DEC-018): en verde, información NUEVA en vez de repetir el monto
  // del hero — proporción en el mismo formato "$ de cada $100" de la interpretación
  // de deuda (familia coherente, §29.2).
  const free = Math.round((teQueda / receivedIncome) * 100);
  return {
    level: 'verde',
    text: `De cada $100 que te entraron, $${free} quedan libres después de apartar lo que viene`,
  };
}

/**
 * FIN-017 ruta (a) (DEC-0017 §5.1): cuotas PAGADAS del ciclo / ingreso DEL CICLO —
 * las mismas cifras que la tarjeta muestra. Cortes compartidos con el indicador de
 * endeudamiento de FIN-004 (DEBT_RATIO_CUTS, constante de compilación — cero
 * llamadas al Score). Sin pagos aún en el ciclo, la línea se omite (§29.1).
 */
function interpretDebt(debtPayments: number, incomeTotal: number): Interpretation | null {
  if (incomeTotal <= 0 || debtPayments <= 0) return null;
  const ratio = debtPayments / incomeTotal;
  const n = Math.round(ratio * 100);
  const base = `De cada $100 que te entraron, $${n} se fueron en cuotas`;
  if (ratio < DEBT_RATIO_CUTS.verde) return { level: 'verde', text: `${base} — vas bien` };
  if (ratio <= DEBT_RATIO_CUTS.amarillo) {
    return { level: 'amarillo', text: `${base} — ya pesan bastante` };
  }
  return { level: 'rojo', text: `${base} — se están comiendo tu ingreso` };
}

/**
 * FIN-021 (§32): interpreta la lectura OFICIAL del Motor (EmergencyFundMonths —
 * la misma que Salud y los logros), narrada con los hitos únicos (DEC-0021 Alt C:
 * colchón inicial / fondo completo). Sin lectura persistida (gasto esencial 0 o
 * Motor sin correr aún) la línea se omite (§29.1).
 */
function interpretEmergencyFund(months: number | null): Interpretation | null {
  if (months === null) return null;
  const { colchonInicial, fondoCompleto } = EMERGENCY_FUND_MILESTONES;
  const n = Math.round(months * 10) / 10;
  if (months >= fondoCompleto.months) {
    return { level: 'verde', text: `Tu ${fondoCompleto.label} está logrado: cubre ~${n} meses de lo esencial` };
  }
  if (months >= colchonInicial.months) {
    return {
      level: 'amarillo',
      text: `Ya tienes tu ${colchonInicial.label} (~${n} meses de lo esencial) — vas hacia el ${fondoCompleto.label} de ${fondoCompleto.months}`,
    };
  }
  if (months > 0) {
    return {
      level: 'rojo',
      text: `Tu fondo cubre ~${n} meses de lo esencial — tu ${colchonInicial.label} son ${colchonInicial.months}, cada aporte cuenta`,
    };
  }
  return {
    level: 'rojo',
    text: 'Aún no tienes fondo de emergencia — en Cuentas eliges qué cuenta te respalda',
  };
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
