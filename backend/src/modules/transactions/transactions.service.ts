import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/transaction.dto';

export interface TransactionQuery {
  kind?: string;
  from?: string;
  to?: string;
  debtId?: string;
  categoryId?: string;
  limit?: number;
}

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea una transacción. Si es pago de deuda, descuenta el saldo de la deuda
   * de forma atómica (misma transacción de base de datos). Idempotente por
   * clientUuid: si ya existe una con ese clientUuid para el usuario, la devuelve.
   */
  async create(userId: string, dto: CreateTransactionDto) {
    if (dto.clientUuid) {
      const existing = await this.prisma.transaction.findUnique({
        where: { userId_clientUuid: { userId, clientUuid: dto.clientUuid } },
      });
      if (existing) return existing;
    }

    if (dto.kind === 'pago_deuda' && !dto.debtId) {
      throw new BadRequestException('Un pago de deuda requiere debtId');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.kind === 'pago_deuda' && dto.debtId) {
        const debt = await tx.debt.findFirst({
          where: { id: dto.debtId, userId, deletedAt: null },
        });
        if (!debt) throw new NotFoundException('Deuda no encontrada');

        const newBalance = Number(debt.currentBalance) - dto.amount;
        const clamped = newBalance < 0 ? 0 : newBalance;
        await tx.debt.update({
          where: { id: debt.id },
          data: {
            currentBalance: clamped,
            status: clamped === 0 ? 'pagada' : debt.status,
          },
        });
      }

      return tx.transaction.create({
        data: {
          userId,
          kind: dto.kind,
          amount: dto.amount,
          currency: dto.currency ?? 'COP',
          occurredAt: new Date(dto.occurredAt),
          categoryId: dto.categoryId ?? null,
          entityId: dto.entityId ?? null,
          debtId: dto.debtId ?? null,
          note: dto.note ?? null,
          tags: dto.tags ?? [],
          clientUuid: dto.clientUuid ?? null,
          source: 'app',
          status: 'confirmada',
        },
      });
    });
  }

  async findAll(userId: string, q: TransactionQuery) {
    const where: Prisma.TransactionWhereInput = {
      userId,
      deletedAt: null,
      ...(q.kind ? { kind: q.kind as Prisma.EnumTxKindFilter } : {}),
      ...(q.debtId ? { debtId: q.debtId } : {}),
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.from || q.to
        ? {
            occurredAt: {
              ...(q.from ? { gte: new Date(q.from) } : {}),
              ...(q.to ? { lte: new Date(q.to) } : {}),
            },
          }
        : {}),
    };
    return this.prisma.transaction.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: Math.min(q.limit ?? 50, 200),
    });
  }

  async findOne(userId: string, id: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!tx) throw new NotFoundException('Transacción no encontrada');
    return tx;
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    await this.findOne(userId, id);
    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...dto,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  /** Resumen del mes: ingresos, gastos y flujo estimado. */
  async monthlyDashboard(userId: string, month?: string) {
    const ref = month ? new Date(`${month}-01T00:00:00Z`) : new Date();
    const start = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1));
    const end = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 1));

    const txs = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        status: 'confirmada',
        occurredAt: { gte: start, lt: end },
      },
    });

    let income = 0;
    let expense = 0;
    let debtPayments = 0;
    for (const t of txs) {
      const amt = Number(t.amount);
      if (t.kind === 'ingreso') income += amt;
      else if (t.kind === 'gasto') expense += amt;
      else if (t.kind === 'pago_deuda') debtPayments += amt;
    }
    const round = (n: number) => Math.round(n * 100) / 100;
    return {
      period: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`,
      income: round(income),
      expense: round(expense),
      debtPayments: round(debtPayments),
      estimatedCashflow: round(income - expense - debtPayments),
    };
  }
}
