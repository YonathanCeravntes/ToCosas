import { Injectable } from '@nestjs/common';
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
 *   · BASE de ingreso = max( take-home del ingreso FIJO esperado , ingresos
 *     realmente RECIBIDOS ). El take-home fijo = netFixedTotal + deducciones
 *     auto-pagadas (que siguen contándose como compromiso, ver abajo). El `max`
 *     evita el doble conteo cuando el ingreso fijo además se registra como
 *     movimiento, y deja la base IDÉNTICA al `incomeRef` del Score
 *     (`core-metrics`, §32 — Score y "Te queda" sobre la misma base).
 *   · compromisos pendientes = TODOS los fijos de gasto activos (§4.1-bis),
 *     las deducciones auto-pagadas (DEC-0027 P2) y las cuotas de deuda con
 *     nextDueDate dentro de lo que RESTA del ciclo.
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
  ) {}

  async compute(userId: string, now = new Date()): Promise<TeQueda> {
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    const period = financialPeriod(now, settings?.cycleStartDay ?? 1);
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const [txByKind, fixedItems, debts, outlays, income] = await Promise.all([
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
        where: { userId, deletedAt: null, status: 'activa', nextDueDate: { not: null } },
      }),
      this.debtOutlay.outlaysByUser(userId),
      this.netIncome.compute(userId),
    ]);

    const sumKind = (k: string) =>
      Number(txByKind.find((t) => t.kind === k)?._sum.amount ?? 0);
    const receivedIncome = round2(sumKind('ingreso'));
    // BT-004 (decisión del Fundador 2026-07-14): el ingreso fijo declarado forma
    // parte de la base. Take-home fijo = neto + deducciones auto-pagadas (que se
    // restan luego como compromiso). `max` con lo recibido evita doble conteo y
    // deja la base igual a la del Score (`incomeRef`).
    const fixedTakeHome = round2(income.netFixedTotal + income.selfPaidDeductionsTotal);
    const incomeBase = Math.max(fixedTakeHome, receivedIncome);
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
      commitments.push({
        name: f.name,
        amount: Number(f.amount),
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

    // Cuotas: pendientes solo si su próxima fecha cae en lo que RESTA del ciclo.
    // El monto es el DESEMBOLSO real de esa deuda (FIN-023, fuente única).
    for (const d of debts) {
      const due = d.nextDueDate!;
      if (due >= startOfToday && due < period.end) {
        commitments.push({
          name: d.name,
          amount: outlays.byDebt.get(d.id)?.outlay ?? Number(d.monthlyPayment ?? 0),
          kind: 'cuota',
          date: due.toISOString(),
          datePassed: false,
        });
      }
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
