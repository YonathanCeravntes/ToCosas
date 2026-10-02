import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { computeNetWorth } from '../accounts/networth.util';
import { financialPeriod } from '../budget/financial-period.util';
import { SpendableService } from '../budget/spendable.service';
import { NetIncomeService } from '../income/net-income.service';
import { MetricKey } from '../financial-engine/engine.constants';
import { EMERGENCY_FUND_MILESTONES } from '../financial-engine/metrics/emergency-fund.constants';
import { monthStart } from '../financial-engine/metrics/series.util';
import { DEBT_RATIO_CUTS } from '../health/score.util';
import { totalLiabilities } from '../debts/debt-balance.util';
import { DebtOutlayService } from '../debts/debt-outlay.service';
import { isSalaryCategory } from '../budget/income-split.util';

const round2 = (n: number) => Math.round(n * 100) / 100;
const DAY_MS = 24 * 3600 * 1000;

/** FIN-057 · Una fuente de "Cómo te llega la plata". */
export interface IncomeSource {
  /** 'salario' para la parte fija; el id de la categoría para lo extra; 'sin' sin categoría. */
  id: string;
  name: string;
  icon: string;
  color: string;
  kind: 'fijo' | 'variable';
  amount: number;
  percent: number;
  /** Movimientos de ingreso del ciclo en esta fuente (14 carreras). */
  count: number;
  /** Lo mismo en el ciclo anterior (para "el ciclo pasado $190.000"). */
  previous: number;
}

export interface CategoryBucket {
  /** FIN-056: id de la categoría (null = sin categoría), para abrir sus movimientos. */
  id: string | null;
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
    // FIN-027 (§32): "Ingresos fijos" es el ingreso NETO de la fuente única.
    private readonly netIncome: NetIncomeService,
    // FIN-057 (§32): la cuota comprometida del mes es el desembolso real (misma autoridad
    // que "Te queda" y el pilar de Endeudamiento), nunca monthlyPayment a secas.
    private readonly debtOutlay: DebtOutlayService,
  ) {}

  async home(userId: string) {
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    // FIN-016: el Inicio respeta el ciclo financiero del usuario.
    const period = financialPeriod(new Date(), settings?.cycleStartDay ?? 1);
    const previous = financialPeriod(new Date(period.start.getTime() - DAY_MS), settings?.cycleStartDay ?? 1);

    const [accounts, assets, debts, fixedItems, periodTxs, recent, teQueda, fundReading, income, outlays, prevIncome] = await Promise.all([
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
      this.netIncome.compute(userId),
      this.debtOutlay.outlaysByUser(userId),
      // FIN-057: ingresos del ciclo ANTERIOR por categoría ("el ciclo pasado $190.000").
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          deletedAt: null,
          status: 'confirmada',
          kind: 'ingreso',
          occurredAt: { gte: previous.start, lt: previous.end },
        },
        _sum: { amount: true },
      }),
    ]);

    // Patrimonio (util pura de FIN-002, misma fuente que /net-worth).
    const liabilities = await totalLiabilities(this.prisma, debts);
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

    // FIN-057 (§32): las cifras de ingreso de Inicio son las MISMAS partes con las que
    // "Te queda" armó su base (salario con salario, extra con extra); antes "fijo" era lo
    // declarado y "variable" TODO lo registrado, y un salario registrado se contaba doble.
    const fixedIncome = teQueda.incomeFixedBase ?? income.netFixedTotal;
    // FIN-047: los gastos fijos se REGISTRAN solos el día que tocan; "fijos del mes" es lo
    // que ya se registró de ellos (antes se sumaba lo declarado aunque no hubiera llegado
    // su día, y registrarlo a mano lo contaba doble).
    let fixedExpense = 0;

    const incomeByCat = new Map<string, CategoryBucket>();
    const incomeCount = new Map<string, number>();
    const expenseByCat = new Map<string, CategoryBucket>();
    let receivedIncome = 0;
    let variableExpense = 0;
    let debtPayments = 0;
    const paidByDebt = new Map<string, number>();

    for (const t of periodTxs) {
      const amt = Number(t.amount);
      if (t.kind === 'ingreso') {
        receivedIncome += amt;
        bucket(incomeByCat, t, amt);
        const key = t.categoryId ?? 'sin';
        incomeCount.set(key, (incomeCount.get(key) ?? 0) + 1);
      } else if (t.kind === 'gasto') {
        if (t.fixedItemId) fixedExpense += amt;
        else variableExpense += amt;
        bucket(expenseByCat, t, amt);
      } else if (t.kind === 'pago_deuda') {
        debtPayments += amt;
        if (t.debtId) paidByDebt.set(t.debtId, (paidByDebt.get(t.debtId) ?? 0) + amt);
      }
    }

    const variableIncome = teQueda.incomeVariableBase ?? receivedIncome;
    const incomeTotal = teQueda.incomeBase ?? fixedIncome + variableIncome;
    const expenseTotal = fixedExpense + variableExpense;
    // FIN-057 (decisión 2 del Fundador): el porcentaje de "En qué se te va" se calcula sobre
    // gastos + pagos de deudas — lo que de verdad salió del bolsillo en el ciclo.
    const outflowTotal = round2(expenseTotal + debtPayments);
    const estimatedCashflow = round2(incomeTotal - expenseTotal - debtPayments);

    // FIN-057 (boceto A): la fila "Cuotas de deudas" de Inicio — lo pagado en el ciclo y, en
    // pequeño, lo que falta de la cuota comprometida del mes (misma autoridad que "Te queda").
    const committed = round2(
      debts.reduce((acc, d) => acc + (outlays.byDebt.get(d.id)?.outlay ?? Number(d.monthlyPayment ?? 0)), 0),
    );
    const nextDue = debts
      .map((d) => d.nextDueDate)
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    const byDebt = debts
      .map((d) => ({
        debtId: d.id,
        name: d.name,
        paid: round2(paidByDebt.get(d.id) ?? 0),
        committed: round2(outlays.byDebt.get(d.id)?.outlay ?? Number(d.monthlyPayment ?? 0)),
      }))
      .sort((a, b) => b.paid - a.paid || b.committed - a.committed);
    // Pagos del ciclo a deudas ya cerradas o borradas siguen contando (van en "paid").
    const debtSection = {
      paid: round2(debtPayments),
      committed,
      remaining: round2(Math.max(0, committed - debtPayments)),
      percent: outflowTotal > 0 ? Math.round((debtPayments / outflowTotal) * 100) : 0,
      nextDueDate: nextDue ? nextDue.toISOString() : null,
      byDebt,
    };

    // FIN-057 (boceto B): "Cómo te llega la plata" — una fila por fuente. La parte fija es la
    // MISMA de "Te queda" (max del salario declarado y el recibido); lo extra, por categoría.
    const categoryNames = new Map([...incomeByCat.values()].filter((c) => c.id).map((c) => [c.id as string, c.name]));
    const unknownPrevIds = prevIncome.map((g) => g.categoryId).filter((id): id is string => !!id && !categoryNames.has(id));
    if (unknownPrevIds.length) {
      const cats = await this.prisma.category.findMany({ where: { id: { in: unknownPrevIds } }, select: { id: true, name: true } });
      for (const c of cats) categoryNames.set(c.id, c.name);
    }
    const sources = buildIncomeSources({
      fixedBase: fixedIncome,
      byCat: incomeByCat,
      counts: incomeCount,
      previous: prevIncome.map((g) => ({ categoryId: g.categoryId, amount: Number(g._sum.amount ?? 0) })),
      previousCategories: categoryNames,
    });

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
        byCategory: toSorted(incomeByCat, receivedIncome),
        /** FIN-057: fuentes de "Cómo te llega la plata" (salario + extra por categoría). */
        sources,
      },
      expense: {
        fixed: round2(fixedExpense),
        variable: round2(variableExpense),
        total: round2(expenseTotal),
        /** FIN-057: gastos + pagos de deudas, la base del porcentaje de "En qué se te va". */
        totalWithDebt: outflowTotal,
        byCategory: toSorted(expenseByCat, outflowTotal),
      },
      /** FIN-057 (boceto A): la fila de deudas de "En qué se te va". */
      debt: debtSection,
      debtPayments: round2(debtPayments),
      // FIN-020: `estimatedCashflow` (proyección estructural) se conserva en el
      // contrato, pero el hero del Inicio pasa a mostrar `teQueda` (§32, Alt A).
      estimatedCashflow,
      teQueda,
      // FIN-017 (DEC-0017 §5.1, ARQ-0017 §4.7.3): interpretación server-side con
      // cifras PROPIAS del home — sin llamadas al Score (ruta (a)).
      interpretation: {
        // §4.1-ter: recalibrada para Alt A — base = ingresos REALES recibidos.
        cashflow: interpretCashflow(teQueda.amount, teQueda.incomeBase),
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
        categoryId: t.categoryId,
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
// BT-004: el denominador es la BASE de ingreso (max take-home fijo / recibido),
// la misma con la que se calculó teQueda — así "$ de cada $100" es coherente
// (antes dividía por lo recibido, que con ingreso declarado daba proporciones
// absurdas como "$283 de cada $100").
function interpretCashflow(teQueda: number, incomeBase: number): Interpretation | null {
  if (!incomeBase || incomeBase <= 0) return null;
  if (teQueda < 0) {
    return {
      level: 'rojo',
      text: 'Lo que viene comprometido supera lo que te queda — mira qué puedes mover',
    };
  }
  if (teQueda < incomeBase * 0.1) {
    return { level: 'amarillo', text: 'Vas justa: después de apartar lo que viene, queda poco' };
  }
  // FIN-018 D1-A (DEC-018): en verde, información NUEVA en vez de repetir el monto
  // del hero — proporción en el mismo formato "$ de cada $100" de la interpretación
  // de deuda (familia coherente, §29.2).
  const free = Math.round((teQueda / incomeBase) * 100);
  return {
    level: 'verde',
    text: `De cada $100 de tu ingreso, $${free} quedan libres después de apartar lo que viene`,
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
    id: t.categoryId,
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

const SALARY_ROW = { id: 'salario', name: 'Salario', icon: '💰', color: '#219653' };

/**
 * FIN-057 · Arma las fuentes de "Cómo te llega la plata" con la MISMA separación de
 * `income-split.util.ts` (§32): la parte fija (salario declarado vs recibido en Salario o
 * sin categoría, el mayor) es una sola fila; cuando lo recibido manda y hay ingresos sin
 * categoría, estos salen como fila propia ("Sin categoría · toca para organizarlos"). Lo
 * extra es una fila por categoría. El porcentaje es sobre la suma de las filas.
 */
export function buildIncomeSources(args: {
  fixedBase: number;
  byCat: Map<string, CategoryBucket>;
  counts: Map<string, number>;
  previous: Array<{ categoryId: string | null; amount: number }>;
  previousCategories: Map<string, string>;
}): IncomeSource[] {
  const rows: IncomeSource[] = [];
  let salaryCat = 0;
  let salaryCount = 0;
  let uncategorized: CategoryBucket | null = null;
  const extra: CategoryBucket[] = [];
  for (const c of args.byCat.values()) {
    if (c.id === null) uncategorized = c;
    else if (isSalaryCategory(c.name)) {
      salaryCat += c.amount;
      salaryCount += args.counts.get(c.id) ?? 0;
    } else extra.push(c);
  }
  const uncategorizedAmount = uncategorized?.amount ?? 0;
  const salaryBucket = salaryCat + uncategorizedAmount;

  // Ciclo anterior con la misma regla.
  let prevSalary = 0;
  const prevByCat = new Map<string, number>();
  for (const p of args.previous) {
    if (!p.categoryId || isSalaryCategory(args.previousCategories.get(p.categoryId))) prevSalary += p.amount;
    else prevByCat.set(p.categoryId, p.amount);
  }

  if (args.fixedBase > 0) {
    if (args.fixedBase > salaryBucket || !uncategorized) {
      // Lo declarado manda (o no hay nada sin categoría): una sola fila de salario.
      rows.push({ ...SALARY_ROW, kind: 'fijo', amount: round2(args.fixedBase), percent: 0, count: salaryCount + (uncategorized ? args.counts.get('sin') ?? 0 : 0), previous: round2(Math.max(args.fixedBase, prevSalary)) });
    } else {
      // Lo recibido manda y parte vino sin categoría: se muestra aparte para que se organice.
      if (salaryCat > 0) rows.push({ ...SALARY_ROW, kind: 'fijo', amount: round2(salaryCat), percent: 0, count: salaryCount, previous: round2(prevSalary) });
      rows.push({
        id: 'sin',
        name: 'Sin categoría',
        icon: '📦',
        color: '#B0B0B0',
        kind: 'variable',
        amount: round2(uncategorizedAmount),
        percent: 0,
        count: args.counts.get('sin') ?? 0,
        previous: 0,
      });
    }
  }
  for (const c of extra) {
    rows.push({
      id: c.id as string,
      name: c.name,
      icon: c.icon,
      color: c.color,
      kind: 'variable',
      amount: round2(c.amount),
      percent: 0,
      count: args.counts.get(c.id as string) ?? 0,
      previous: round2(prevByCat.get(c.id as string) ?? 0),
    });
  }
  const total = rows.reduce((a, r) => a + r.amount, 0);
  return rows
    .map((r) => ({ ...r, percent: total > 0 ? Math.round((r.amount / total) * 100) : 0 }))
    .sort((a, b) => (a.kind === b.kind ? b.amount - a.amount : a.kind === 'fijo' ? -1 : 1));
}
