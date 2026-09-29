import { Injectable, Logger, Optional } from '@nestjs/common';
import { FixedExpenseService } from './fixed-expense.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DebtOutlayService } from '../debts/debt-outlay.service';
import { NetIncomeService } from '../income/net-income.service';
import { financialPeriod } from './financial-period.util';

const round2 = (n: number) => Math.round(n * 100) / 100;
const DAY_MS = 24 * 3600 * 1000;

export interface PendingCommitment {
  name: string;
  amount: number;
  kind: 'fijo' | 'cuota';
  /** ISO de la fecha estimada dentro del ciclo (null si el fijo no tiene día). */
  date: string | null;
  /** true si su fecha ya pasó (etiqueta neutra en UI — §4.1-bis: no afirmamos pago). */
  datePassed: boolean;
}

export interface TeQueda {
  /** LA definición oficial (§32 / ARQ-0020 P1 Alt A + §4.1-bis). */
  amount: number;
  /** ≈ amount / días restantes (null si amount ≤ 0). */
  perDay: number | null;
  daysLeft: number;
  /** Último día visible del ciclo (ISO). */
  until: string;
  /** Total comprometido pendiente del ciclo. */
  protectedTotal: number;
  pendingCommitments: PendingCommitment[];
  /** Ingresos realmente recibidos en el ciclo (transacciones de ingreso). */
  receivedIncome: number;
  /** BT-004 · Base de ingreso usada en el cálculo = max(take-home fijo, recibido).
   *  Es el denominador de la interpretación §4.1-ter (misma base que el Score). */
  incomeBase: number;
}

/**
 * FIN-020 · Fuente ÚNICA de "Te queda" (GOBERNANZA §32, ARQ-0020 P1/P2).
 *
 * Definición oficial (vigente desde la decisión del Fundador del 2026-07-14, BT-004):
 *   teQueda = BASE de ingreso del ciclo
 *           − gastos y pagos REALES del ciclo
 *           − compromisos PENDIENTES del ciclo
 * donde:
 *   · BASE de ingreso = max( ingreso neto disponible del MES , ingresos
 *     realmente RECIBIDOS ). El ingreso neto disponible del mes = take-home del
 *     ingreso FIJO (netFixedTotal + deducciones auto-pagadas, que siguen como
 *     compromiso) MÁS el ingreso VARIABLE estimado — es el "ingreso neto
 *     disponible" que la usuaria configura para planificar (decisión del
 *     Fundador 2026-07-14, BT-004: "es ingreso neto sumar salario y variable").
 *     El `max` con lo recibido evita el doble conteo cuando ese ingreso además
 *     se registra como movimiento.
 *   · compromisos pendientes = TODOS los fijos de gasto activos (§4.1-bis),
 *     las deducciones auto-pagadas (DEC-0027 P2) y, por cada deuda activa, UNA
 *     cuota por ciclo (su desembolso mensual real, FIN-023) menos lo ya pagado a
 *     esa deuda en el ciclo — venza el día que venza (DEC-0042, Fundador
 *     2026-09-28). Antes solo contaban las cuotas con vencimiento dentro del
 *     ciclo, lo que contradecía al pilar de Endeudamiento (mensual) y dejaba
 *     "libre" un ingreso que se va en cuotas de los primeros días del mes.
 *
 * CAMBIO BT-004 (decisión del Fundador, supersede el "Alt A / solo lo recibido"
 * de FIN-020 para el ingreso fijo): un ingreso fijo recurrente es un flujo
 * predecible y es el dato que la usuaria configura para planificar su mes; por
 * tanto forma parte del cálculo principal aunque aún no se haya "recibido". Los
 * ingresos VARIABLES siguen contando solo cuando se reciben (no son certeza).
 *
 * Este servicio es la ÚNICA implementación del concepto: Presupuesto e Inicio
 * lo inyectan — cualquier otra fórmula de "te queda" viola §32.
 */
@Injectable()
export class SpendableService {
  constructor(
    private readonly prisma: PrismaService,
    // FIN-023 (§32): la cuota comprometida es el desembolso REAL (cuota +
    // seguros/cargos aparte) — fuente única, nunca monthlyPayment a secas.
    private readonly debtOutlay: DebtOutlayService,
    // FIN-027 (DEC-0027 P2): las deducciones que la usuaria paga ELLA (no
    // retenidas en la fuente) son compromiso del ciclo — se inyectan, nunca
    // se recalculan aquí.
    private readonly netIncome: NetIncomeService,
    // FIN-047: antes de calcular, registra los gastos fijos que ya llegaron a su día.
    @Optional() private readonly fixedExpenses?: FixedExpenseService,
  ) {}

  private readonly logger = new Logger(SpendableService.name);
  private readonly lastMaterialized = new Map<string, number>();

  /** Registro perezoso de fijos (como mucho cada 5 min por usuario; solo con la fecha REAL). */
  private async materializeFixed(userId: string, now: Date): Promise<void> {
    if (!this.fixedExpenses || Math.abs(now.getTime() - Date.now()) > 60_000) return;
    const last = this.lastMaterialized.get(userId) ?? 0;
    if (Date.now() - last < 5 * 60_000) return;
    this.lastMaterialized.set(userId, Date.now());
    try {
      await this.fixedExpenses.materialize(userId, now);
    } catch (e) {
      this.logger.warn(`Registro automático de fijos falló: ${(e as Error).message}`);
    }
  }

  async compute(userId: string, now = new Date()): Promise<TeQueda> {
    await this.materializeFixed(userId, now);
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    const period = financialPeriod(now, settings?.cycleStartDay ?? 1);
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const [txByKind, fixedItems, debts, outlays, income, paidByDebt, paidByFixed] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['kind'],
        where: {
          userId,
          deletedAt: null,
          status: 'confirmada',
          occurredAt: { gte: period.start, lt: period.end },
        },
        _sum: { amount: true },
      }),
      this.prisma.fixedItem.findMany({
        where: { userId, deletedAt: null, isActive: true, kind: 'gasto' },
      }),
      this.prisma.debt.findMany({
        where: { userId, deletedAt: null, status: 'activa' },
      }),
      this.debtOutlay.outlaysByUser(userId),
      this.netIncome.compute(userId),
      // DEC-0042: lo ya pagado a cada deuda en el ciclo descuenta su cuota comprometida.
      this.prisma.transaction.groupBy({
        by: ['debtId'],
        where: {
          userId,
          deletedAt: null,
          status: 'confirmada',
          kind: 'pago_deuda',
          debtId: { not: null },
          occurredAt: { gte: period.start, lt: period.end },
        },
        _sum: { amount: true },
      }),
      // FIN-047: lo ya registrado de cada gasto fijo en el ciclo (solo o cruzado a mano).
      this.prisma.transaction.groupBy({
        by: ['fixedItemId'],
        where: {
          userId,
          deletedAt: null,
          status: 'confirmada',
          kind: 'gasto',
          fixedItemId: { not: null },
          occurredAt: { gte: period.start, lt: period.end },
        },
        _sum: { amount: true },
      }),
    ]);
    const paidByFixedItem = new Map(paidByFixed.map((p) => [p.fixedItemId as string, Number(p._sum.amount ?? 0)]));
    const paidThisCycle = new Map(paidByDebt.map((p) => [p.debtId as string, Number(p._sum.amount ?? 0)]));

    const sumKind = (k: string) =>
      Number(txByKind.find((t) => t.kind === k)?._sum.amount ?? 0);
    const receivedIncome = round2(sumKind('ingreso'));
    // BT-004 (decisión del Fundador 2026-07-14): la base es el INGRESO NETO
    // DISPONIBLE DEL MES = fijo neto + variable estimado ("sumar salario y
    // variable"). Take-home = netFixedTotal + deducciones auto-pagadas (que se
    // restan luego como compromiso) + variable estimado. `max` con lo recibido
    // evita el doble conteo si además se registra como movimiento.
    const monthlyTakeHome = round2(
      income.netFixedTotal + income.selfPaidDeductionsTotal + income.grossVariableEstimate,
    );
    const incomeBase = Math.max(monthlyTakeHome, receivedIncome);
    const realOut = round2(sumKind('gasto') + sumKind('pago_deuda'));

    const commitments: PendingCommitment[] = [];

    // Fijos: comprometidos hasta el cierre del ciclo, se pague o no (§4.1-bis ii).
    for (const f of fixedItems) {
      let date: Date | null = null;
      if (f.dayOfMonth) {
        // Su ocurrencia dentro del ciclo actual, anclada al día declarado.
        const inStartMonth = new Date(Date.UTC(period.start.getUTCFullYear(), period.start.getUTCMonth(), Math.min(f.dayOfMonth, 28)));
        date = inStartMonth >= period.start ? inStartMonth : new Date(Date.UTC(period.start.getUTCFullYear(), period.start.getUTCMonth() + 1, Math.min(f.dayOfMonth, 28)));
        if (date >= period.end) date = new Date(period.end.getTime() - DAY_MS);
      }
      // FIN-047: si ya se registró (solo o a mano) sale de lo protegido y entra como gasto real.
      const fixedPending = round2(Math.max(0, Number(f.amount) - (paidByFixedItem.get(f.id) ?? 0)));
      if (fixedPending <= 0) continue;
      commitments.push({
        name: f.name,
        amount: fixedPending,
        kind: 'fijo',
        date: date ? date.toISOString() : null,
        datePassed: date ? date < startOfToday : false,
      });
    }

    // Deducciones auto-pagadas (FIN-027, DEC-0027 P2): una deducción NO
    // retenida en la fuente sale del bolsillo de la usuaria — es un compromiso
    // del ciclo, igual que un fijo de gasto. Se ancla al día de SU fuente.
    for (const d of income.deductions) {
      if (d.withheldAtSource) continue;
      let date: Date | null = null;
      if (d.sourceDayOfMonth) {
        const inStartMonth = new Date(Date.UTC(period.start.getUTCFullYear(), period.start.getUTCMonth(), Math.min(d.sourceDayOfMonth, 28)));
        date = inStartMonth >= period.start ? inStartMonth : new Date(Date.UTC(period.start.getUTCFullYear(), period.start.getUTCMonth() + 1, Math.min(d.sourceDayOfMonth, 28)));
        if (date >= period.end) date = new Date(period.end.getTime() - DAY_MS);
      }
      commitments.push({
        name: d.name,
        amount: d.amount,
        kind: 'fijo',
        date: date ? date.toISOString() : null,
        datePassed: date ? date < startOfToday : false,
      });
    }

    // Cuotas (DEC-0042): UNA por deuda por ciclo — el desembolso real de esa deuda
    // (FIN-023, misma autoridad que el pilar de Endeudamiento) menos lo ya pagado a
    // ella en el ciclo. No importa si vence el 30 o el 2 del mes siguiente: la plata
    // de este ciclo la cubre. Al registrar el pago, el compromiso desaparece y entra
    // como pago real: "Te queda" no cambia (§32, coherencia exigida por el Fundador).
    for (const d of debts) {
      const outlay = outlays.byDebt.get(d.id)?.outlay ?? Number(d.monthlyPayment ?? 0);
      const pending = round2(Math.max(0, outlay - (paidThisCycle.get(d.id) ?? 0)));
      if (pending <= 0) continue;
      const due = d.nextDueDate;
      commitments.push({
        name: d.name,
        amount: pending,
        kind: 'cuota',
        date: due ? due.toISOString() : null,
        datePassed: due ? due < startOfToday : false,
      });
    }

    commitments.sort((a, b) => {
      if (a.date === null) return 1;
      if (b.date === null) return -1;
      return a.date < b.date ? -1 : 1;
    });

    const protectedTotal = round2(commitments.reduce((acc, c) => acc + c.amount, 0));
    const amount = round2(incomeBase - realOut - protectedTotal);
    const daysLeft = Math.max(1, Math.ceil((period.end.getTime() - startOfToday.getTime()) / DAY_MS));

    return {
      amount,
      perDay: amount > 0 ? round2(amount / daysLeft) : null,
      daysLeft,
      until: new Date(period.end.getTime() - DAY_MS).toISOString(),
      protectedTotal,
      pendingCommitments: commitments,
      receivedIncome,
      incomeBase,
    };
  }
}
