import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { TxKindDto } from '../transactions/dto/transaction.dto';
import { financialPeriod } from './financial-period.util';
import { occurrenceInCycle } from './fixed-expense.util';

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
        },
        { source: 'system', fixedItemId: f.id },
      );
      created += 1;
    }
    return created;
  }

  /** Todos los usuarios con gastos fijos (recorrido diario). */
  async materializeAll(now = new Date()): Promise<number> {
    const users = await this.prisma.fixedItem.findMany({
      where: { deletedAt: null, isActive: true, kind: 'gasto', user: { deletedAt: null } },
      distinct: ['userId'],
      select: { userId: true },
    });
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
