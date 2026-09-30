import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { shouldApplyIncoming, splitChanges } from './merge.util';
import { PushDto, PushTransaction } from './dto/sync.dto';

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: TransactionsService,
  ) {}

  /**
   * Pull delta: devuelve todos los cambios (upserted/deleted) posteriores a
   * `since` para el usuario. Sin `since` → sincronización completa.
   */
  async pull(userId: string, since?: string) {
    const gt = since ? new Date(since) : new Date(0);
    const where = { userId, updatedAt: { gt } };
    const order = { orderBy: { updatedAt: 'asc' as const } };

    const [transactions, debts, entities, categories, reminders] = await Promise.all([
      this.prisma.transaction.findMany({ where, ...order }),
      this.prisma.debt.findMany({ where, ...order }),
      this.prisma.financialEntity.findMany({ where, ...order }),
      this.prisma.category.findMany({ where, ...order }),
      this.prisma.reminder.findMany({ where, ...order }),
    ]);

    return {
      serverTime: new Date().toISOString(),
      changes: {
        transactions: splitChanges(transactions),
        debts: splitChanges(debts),
        entities: splitChanges(entities),
        categories: splitChanges(categories),
        reminders: splitChanges(reminders),
      },
    };
  }

  /**
   * Push: aplica los cambios locales de transacciones.
   * - created: idempotente por clientUuid (reusa TransactionsService, que
   *   descuenta saldo de deuda de forma atómica y no duplica).
   * - updated: last-write-wins por updatedAt.
   * - deleted: soft-delete.
   * Devuelve el mapeo clientUuid → id del servidor.
   */
  async push(userId: string, dto: PushDto) {
    const idMap: Record<string, string> = {};

    for (const t of dto.created ?? []) {
      const tx = await this.transactions.create(userId, t, {
        source: 'app',
      });
      if (t.clientUuid) idMap[t.clientUuid] = tx.id;
    }

    for (const t of dto.updated ?? []) {
      await this.applyUpdate(userId, t);
    }

    for (const id of dto.deleted ?? []) {
      await this.prisma.transaction.updateMany({
        where: { id, userId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    }

    return { serverTime: new Date().toISOString(), idMap };
  }

  private async applyUpdate(userId: string, t: PushTransaction): Promise<void> {
    if (!t.id) return;
    const existing = await this.prisma.transaction.findFirst({
      where: { id: t.id, userId },
    });
    if (!existing) return;
    const incomingUpdatedAt = t.updatedAt ? new Date(t.updatedAt) : undefined;
    if (!shouldApplyIncoming(existing.updatedAt, incomingUpdatedAt)) return;

    await this.prisma.transaction.update({
      where: { id: t.id },
      data: {
        amount: t.amount,
        note: t.note ?? null,
        occurredAt: t.occurredAt ? new Date(t.occurredAt) : undefined,
        categoryId: t.categoryId ?? null,
      },
    });
  }
}
