import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { TxKindDto } from '../transactions/dto/transaction.dto';
import { financialPeriod } from './financial-period.util';
import { occurrenceInCycle } from './fixed-expense.util';
import { DebtOutlayService } from '../debts/debt-outlay.service';
import { descriptorFor } from '../debts/product-type.descriptor';

const DAY_MS = 86_400_000;

/**
 * FIN-047 · Registra SOLO los gastos fijos el día que tocan (movimiento "automático",
 * `source = system`, enlazado al fijo). Idempotente: si en el ciclo ya hay un movimiento
 * de ese fijo —incluso uno que la persona borró— no vuelve a crearlo. Un fijo creado
 * después de su día de este ciclo empieza a registrarse el ciclo siguiente (este mes
 * queda apartado en "Te queda" como siempre).
 */
@Injectable()
export class FixedExpenseService {
  private readonly logger = new Logger(FixedExpenseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: TransactionsService,
    @Optional() private readonly debtOutlay?: DebtOutlayService,
  ) {}

  async materialize(userId: string, now = new Date()): Promise<number> {
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    const period = financialPeriod(now, settings?.cycleStartDay ?? 1);
    const items = await this.prisma.fixedItem.findMany({
      where: { userId, deletedAt: null, isActive: true, kind: 'gasto' },
    });
    let created = 0;
    for (const f of items) {
      const occ = occurrenceInCycle(f.dayOfMonth, period);
      if (occ.getTime() > now.getTime()) continue; // aún no llega su día
      if (f.createdAt.getTime() > occ.getTime() + DAY_MS) continue; // se creó después de su día
      if (f.startDate && f.startDate.getTime() > occ.getTime()) continue;
      if (f.endDate && f.endDate.getTime() < occ.getTime()) continue;
      const existing = await this.prisma.transaction.findFirst({
        where: { userId, fixedItemId: f.id, occurredAt: { gte: period.start, lt: period.end } },
        select: { id: true },
      });
      if (existing) continue;
      await this.transactions.create(
        userId,
        {
          kind: TxKindDto.gasto,
          amount: Number(f.amount),
          occurredAt: new Date(occ.getTime() + 12 * 3_600_000).toISOString(),
          categoryId: f.categoryId ?? undefined,
          note: f.name,
          // FIN-059: el fijo de la casa se registra como gasto de la casa.
          household: !!f.householdId,
        },
        { source: 'system', fixedItemId: f.id },
      );
      created += 1;
    }
    return created + (await this.materializePayroll(userId, period, now));
  }

  /**
   * FIN-062 (Fundador 2026-10-04) · Una deuda que se paga por NÓMINA (libranza) se
   * descuenta sí o sí: su cuota se registra sola el día de pago, como un gasto fijo, y así
   * cuenta en Gastos y nunca sale como pendiente. Idempotente: si en el ciclo ya hay un pago
   * de esa deuda (de la persona, o uno automático aunque lo haya anulado) no se crea otro.
   */
  private async materializePayroll(userId: string, period: { start: Date; end: Date }, now: Date): Promise<number> {
    const debts = (await this.prisma.debt.findMany({ where: { userId, deletedAt: null, status: 'activa' } })).filter(
      (d) => descriptorFor(d.debtType).paymentSource === 'nomina',
    );
    if (debts.length === 0) return 0;
    const outlays = this.debtOutlay ? await this.debtOutlay.outlaysByUser(userId) : null;
    let created = 0;
    for (const d of debts) {
      const day = d.paymentDay ?? d.nextDueDate?.getUTCDate() ?? null;
      const occ = occurrenceInCycle(day, period);
      if (occ.getTime() > now.getTime()) continue; // aún no llega el día de pago
      if (d.createdAt.getTime() > occ.getTime() + DAY_MS) continue; // se creó después de su día
      const amount = outlays?.byDebt.get(d.id)?.basePayment ?? Number(d.monthlyPayment ?? 0);
      if (!(amount > 0)) continue;
      const existing = await this.prisma.transaction.findFirst({
        where: {
          userId,
          debtId: d.id,
          kind: 'pago_deuda',
          occurredAt: { gte: period.start, lt: period.end },
          OR: [{ deletedAt: null }, { source: 'system' }],
        },
        select: { id: true },
      });
      if (existing) continue;
      await this.transactions.create(
        userId,
        {
          kind: TxKindDto.pago_deuda,
          amount,
          occurredAt: new Date(occ.getTime() + 12 * 3_600_000).toISOString(),
          debtId: d.id,
          note: `Cuota ${d.name} (descuento de nómina)`,
        },
        { source: 'system' },
      );
      created += 1;
    }
    return created;
  }

  /** Todos los usuarios con gastos fijos (recorrido diario). */
  async materializeAll(now = new Date()): Promise<number> {
    const [fixedUsers, payrollUsers] = await Promise.all([
      this.prisma.fixedItem.findMany({
        where: { deletedAt: null, isActive: true, kind: 'gasto', user: { deletedAt: null } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      // FIN-062: también quien tiene una libranza (descuento de nómina).
      this.prisma.debt.findMany({
        where: { deletedAt: null, status: 'activa', debtType: 'libranza', user: { deletedAt: null } },
        distinct: ['userId'],
        select: { userId: true },
      }),
    ]);
    const users = [...new Set([...fixedUsers, ...payrollUsers].map((u) => u.userId))].map((userId) => ({ userId }));
    let total = 0;
    for (const { userId } of users) {
      try {
        total += await this.materialize(userId, now);
      } catch (e) {
        this.logger.warn(`Registro de fijos falló para un usuario: ${(e as Error).message}`);
      }
    }
    if (total) this.logger.log(`Gastos fijos registrados solos: ${total}`);
    return total;
  }
}
