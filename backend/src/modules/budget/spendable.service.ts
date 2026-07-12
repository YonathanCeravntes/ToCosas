import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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
  /** Ingresos realmente recibidos en el ciclo (base de la interpretación §4.1-ter). */
  receivedIncome: number;
}

/**
 * FIN-020 · Fuente ÚNICA de "Te queda" (GOBERNANZA §32, ARQ-0020 P1/P2).
 *
 * Definición oficial (Alt A — "nunca mentir hacia arriba"):
 *   teQueda = ingresos REALES del ciclo
 *           − gastos y pagos REALES del ciclo
 *           − compromisos PENDIENTES del ciclo
 * donde los compromisos pendientes son:
 *   · TODOS los fijos de gasto activos, se haya pasado o no su fecha
 *     (§4.1-bis: la política adoptada solo puede sesgar hacia abajo), y
 *   · las cuotas de deuda con nextDueDate dentro de lo que RESTA del ciclo
 *     (su pago SÍ es observable — FIN-018 avanza la fecha al pagar).
 * Los ingresos futuros (fijos aún no recibidos) NO se cuentan.
 *
 * Este servicio es la ÚNICA implementación del concepto: Presupuesto e Inicio
 * lo inyectan — cualquier otra fórmula de "te queda" viola §32.
 */
@Injectable()
export class SpendableService {
  constructor(private readonly prisma: PrismaService) {}

  async compute(userId: string, now = new Date()): Promise<TeQueda> {
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    const period = financialPeriod(now, settings?.cycleStartDay ?? 1);
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const [txByKind, fixedItems, debts] = await Promise.all([
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
    ]);

    const sumKind = (k: string) =>
      Number(txByKind.find((t) => t.kind === k)?._sum.amount ?? 0);
    const receivedIncome = round2(sumKind('ingreso'));
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

    // Cuotas: pendientes solo si su próxima fecha cae en lo que RESTA del ciclo.
    for (const d of debts) {
      const due = d.nextDueDate!;
      if (due >= startOfToday && due < period.end) {
        commitments.push({
          name: d.name,
          amount: Number(d.monthlyPayment ?? 0),
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
    const amount = round2(receivedIncome - realOut - protectedTotal);
    const daysLeft = Math.max(1, Math.ceil((period.end.getTime() - startOfToday.getTime()) / DAY_MS));

    return {
      amount,
      perDay: amount > 0 ? round2(amount / daysLeft) : null,
      daysLeft,
      until: new Date(period.end.getTime() - DAY_MS).toISOString(),
      protectedTotal,
      pendingCommitments: commitments,
      receivedIncome,
    };
  }
}
