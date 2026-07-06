import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OutboxService } from '../events/outbox.service';
import { DomainEventType } from '../events/domain-events';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * Crea una transacción. Si es pago de deuda, descuenta el saldo de la deuda
   * de forma atómica (misma transacción de base de datos). Idempotente por
   * clientUuid: si ya existe una con ese clientUuid para el usuario, la devuelve.
   */
  async create(
    userId: string,
    dto: CreateTransactionDto,
    meta?: {
      source?: 'app' | 'whatsapp' | 'telegram' | 'ocr' | 'import' | 'system';
      rawMessage?: string;
      waMessageId?: string;
      parseConfidence?: number;
    },
  ) {
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
        // FIN-012 (DEC-0012 §4.3, cambio obligatorio #2): una sola sentencia
        // atómica condicional — cierra la condición de carrera del antiguo
        // findFirst + update calculado en memoria ("última escritura gana").
        // El clamp a 0 y la marca 'pagada' pasan a la BD: mismo comportamiento
        // funcional de siempre, ahora sin ventana entre lectura y escritura.
        const rows = await tx.$queryRaw<{ id: string }[]>`
          UPDATE debts
             SET current_balance = GREATEST(current_balance - ${dto.amount}, 0),
                 status = CASE
                   WHEN current_balance - ${dto.amount} <= 0.005 THEN 'pagada'::"DebtStatus"
                   ELSE status
                 END,
                 updated_at = now()
           WHERE id = ${dto.debtId}::uuid
             AND user_id = ${userId}::uuid
             AND deleted_at IS NULL
          RETURNING id`;
        if (rows.length === 0) throw new NotFoundException('Deuda no encontrada');
      }

      const created = await tx.transaction.create({
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
          source: meta?.source ?? 'app',
          rawMessage: meta?.rawMessage ?? null,
          waMessageId: meta?.waMessageId ?? null,
          parseConfidence: meta?.parseConfidence ?? null,
          status: 'confirmada',
        },
      });

      // Evento de dominio en la MISMA transacción (patrón outbox, FIN-002).
      await this.outbox.enqueue(tx, {
        aggregateType: 'transaction',
        aggregateId: created.id,
        eventType: DomainEventType.TransactionCreated,
        payload: { userId, kind: created.kind, amount: Number(created.amount) },
      });
      if (dto.kind === 'pago_deuda' && dto.debtId) {
        await this.outbox.enqueue(tx, {
          aggregateType: 'debt',
          aggregateId: dto.debtId,
          eventType: DomainEventType.DebtUpdated,
          payload: { userId, reason: 'payment' },
        });
      }
      return created;
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
      include: { category: true },
    });

    let income = 0;
    let expense = 0;
    let debtPayments = 0;
    // Acumulado de gasto por categoría (para el desglose visual del dashboard).
    const byCat = new Map<string, { name: string; icon: string; color: string; amount: number }>();

    for (const t of txs) {
      const amt = Number(t.amount);
      if (t.kind === 'ingreso') income += amt;
      else if (t.kind === 'gasto') {
        expense += amt;
        const key = t.categoryId ?? 'sin';
        const cur = byCat.get(key) ?? {
          name: t.category?.name ?? 'Sin categoría',
          icon: t.category?.icon ?? '📦',
          color: t.category?.color ?? '#B0B0B0',
          amount: 0,
        };
        cur.amount += amt;
        byCat.set(key, cur);
      } else if (t.kind === 'pago_deuda') debtPayments += amt;
    }

    const round = (n: number) => Math.round(n * 100) / 100;
    const byCategory = [...byCat.values()]
      .map((c) => ({
        ...c,
        amount: round(c.amount),
        percent: expense > 0 ? Math.round((c.amount / expense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      period: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`,
      income: round(income),
      expense: round(expense),
      debtPayments: round(debtPayments),
      estimatedCashflow: round(income - expense - debtPayments),
      byCategory,
    };
  }
}
