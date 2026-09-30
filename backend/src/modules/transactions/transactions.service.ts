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
import { DEBT_LOCKED_FIELDS, diffTransaction } from './transaction-events.util';
import { applyCardPayment, isCardDebt, revertCardPayment } from '../debts/card-payment.util';
import { matchFixed } from '../budget/fixed-expense.util';
import { merchantKey } from './merchant-key.util';
import { financialPeriod } from '../budget/financial-period.util';

/**
 * FIN-028 (DEC-0028 §5.2) · Filtro compartido de movimientos ACTIVOS — un solo
 * lugar para "no anulado" (la anulación ES `deletedAt`, DEC §5.1). Aplica SOLO a
 * consultas del modelo `Transaction`; NO se toca el `deletedAt: null` de otros
 * modelos (accounts/debts/…). Consumidores mapeados consulta por consulta.
 */
export const ACTIVE_TX_FILTER = { deletedAt: null } as const;

export interface TransactionQuery {
  kind?: string;
  from?: string;
  to?: string;
  debtId?: string;
  categoryId?: string;
  limit?: number;
  /** Búsqueda libre en la nota (historial, FIN-038). */
  q?: string;
  /** Cursor: solo movimientos con occurredAt anterior a este instante (paginación). */
  before?: string;
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
      /** FIN-047: el movimiento ES este gasto fijo (registro automático). */
      fixedItemId?: string;
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

    // FIN-046 Fase 4: sin categoría, se usa la que la persona ya le dio a ese comercio.
    const chosenCategory = dto.categoryId;
    if (!dto.categoryId && dto.note && (dto.kind === 'gasto' || dto.kind === 'ingreso')) {
      const learned = await this.suggestCategory(userId, dto.note, dto.kind);
      if (learned) dto = { ...dto, categoryId: learned.id };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // FIN-043 (BT-018): en una TARJETA el saldo vive en las cuotas de sus compras;
      // el pago se aplica a ellas (más antigua primero) y NO al current_balance (que es 0).
      const card = dto.kind === 'pago_deuda' && dto.debtId ? await isCardDebt(tx, userId, dto.debtId) : false;
      if (dto.kind === 'pago_deuda' && dto.debtId && !card) {
        // FIN-012 (DEC-0012 §4.3, cambio obligatorio #2): una sola sentencia
        // atómica condicional — cierra la condición de carrera del antiguo
        // findFirst + update calculado en memoria ("última escritura gana").
        // El clamp a 0 y la marca 'pagada' pasan a la BD: mismo comportamiento
        // funcional de siempre, ahora sin ventana entre lectura y escritura.
        //
        // FIN-018 (incidencia elevada por el CPSAO): el pago también AVANZA
        // next_due_date — hasta la PRÓXIMA ocurrencia futura conservando el día
        // ancla (avanzar solo +1 mes desde una fecha ya vencida seguiría
        // vencida). Si la deuda queda saldada, la fecha se limpia.
        const rows = await tx.$queryRaw<{ id: string }[]>`
          UPDATE debts
             SET current_balance = GREATEST(current_balance - ${dto.amount}, 0),
                 status = CASE
                   WHEN current_balance - ${dto.amount} <= 0.005 THEN 'pagada'::"DebtStatus"
                   ELSE status
                 END,
                 next_due_date = CASE
                   WHEN current_balance - ${dto.amount} <= 0.005 THEN NULL
                   WHEN next_due_date IS NULL THEN NULL
                   ELSE (next_due_date + make_interval(months =>
                     GREATEST(1,
                       (EXTRACT(YEAR FROM age(now(), next_due_date)) * 12
                        + EXTRACT(MONTH FROM age(now(), next_due_date)))::int + 1)))::date
                 END,
                 updated_at = now()
           WHERE id = ${dto.debtId}::uuid
             AND user_id = ${userId}::uuid
             AND deleted_at IS NULL
          RETURNING id`;
        if (rows.length === 0) throw new NotFoundException('Deuda no encontrada');
      }

      // FIN-047 (Fundador, 2026-09-29): un gasto registrado a mano que ES un gasto fijo
      // (su nombre en la nota o la categoría, monto parecido) se CRUZA con el fijo: queda
      // enlazado y, si ya se había registrado solo este ciclo, ese automático se retira.
      let fixedItemId: string | null = meta?.fixedItemId ?? null;
      // FIN-049: en Registrar se eligió "Cada mes" → el enlace viene explícito (solo un fijo propio).
      if (!fixedItemId && dto.fixedItemId && dto.kind === 'gasto') {
        const own = await tx.fixedItem.findFirst({ where: { id: dto.fixedItemId, userId, deletedAt: null, kind: 'gasto' } });
        if (!own) throw new NotFoundException('Gasto fijo no encontrado');
        fixedItemId = own.id;
        const settings = await tx.userSettings.findUnique({ where: { userId } });
        const period = financialPeriod(new Date(dto.occurredAt), settings?.cycleStartDay ?? 1);
        await tx.transaction.updateMany({
          where: { userId, fixedItemId: own.id, source: 'system', deletedAt: null, occurredAt: { gte: period.start, lt: period.end } },
          data: { deletedAt: new Date() },
        });
      }
      if (!fixedItemId && dto.kind === 'gasto') {
        const items = await tx.fixedItem.findMany({ where: { userId, deletedAt: null, isActive: true, kind: 'gasto' } });
        if (items.length > 0) {
          const cat = dto.categoryId
            ? await tx.category.findUnique({ where: { id: dto.categoryId }, select: { name: true } })
            : null;
          // FIN-048: las palabras del TIPO de fijo también cruzan ("la luz" → Servicios públicos).
          const typeIds = [...new Set(items.map((i) => i.categoryId).filter((x): x is string => !!x))];
          const types = typeIds.length
            ? await tx.category.findMany({ where: { id: { in: typeIds } }, select: { id: true, keywords: true } })
            : [];
          const kw = new Map(types.map((t) => [t.id, t.keywords]));
          const match = matchFixed(
            items.map((i) => ({ id: i.id, name: i.name, amount: Number(i.amount), aliases: i.categoryId ? kw.get(i.categoryId) ?? [] : [] })),
            `${dto.note ?? ''} ${cat?.name ?? ''}`,
            dto.amount,
          );
          if (match) {
            fixedItemId = match.id;
            const settings = await tx.userSettings.findUnique({ where: { userId } });
            const period = financialPeriod(new Date(dto.occurredAt), settings?.cycleStartDay ?? 1);
            await tx.transaction.updateMany({
              where: { userId, fixedItemId: match.id, source: 'system', deletedAt: null, occurredAt: { gte: period.start, lt: period.end } },
              data: { deletedAt: new Date() },
            });
          }
        }
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
          fixedItemId,
          status: 'confirmada',
        },
      });

      if (card && dto.debtId) {
        await applyCardPayment(tx, dto.debtId, dto.amount, created.id, new Date(dto.occurredAt));
      }

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

    // Lo que la persona elige (no lo automático) enseña la categoría de ese comercio.
    if (chosenCategory && dto.note && meta?.source !== 'system') {
      await this.learnCategory(userId, dto.note, chosenCategory).catch(() => undefined);
    }
    return result;
  }

  /**
   * FIN-046 Fase 4 · Categoría aprendida para la nota (por comercio), si la hay y sigue
   * vigente. La usan el registro sin categoría y el bot (antes de sus palabras clave).
   */
  async suggestCategory(userId: string, note: string, kind: 'gasto' | 'ingreso') {
    const key = merchantKey(note);
    if (!key) return null;
    const hint = await this.prisma.categoryHint.findUnique({
      where: { userId_key: { userId, key } },
      include: { category: true },
    });
    const c = hint?.category;
    if (!c || c.deletedAt || c.kind !== kind || (c.userId && c.userId !== userId)) return null;
    return c;
  }

  /** Recuerda (o corrige) la categoría de un comercio. La última elección manda. */
  async learnCategory(userId: string, note: string, categoryId: string): Promise<void> {
    const key = merchantKey(note);
    if (!key) return;
    const cat = await this.prisma.category.findUnique({ where: { id: categoryId }, select: { name: true } });
    // "Comida" en la categoría Comida no enseña nada.
    if (!cat || merchantKey(cat.name) === key) return;
    const prev = await this.prisma.categoryHint.findUnique({ where: { userId_key: { userId, key } } });
    if (!prev) {
      await this.prisma.categoryHint.create({ data: { userId, key, categoryId } });
    } else {
      await this.prisma.categoryHint.update({
        where: { id: prev.id },
        data: prev.categoryId === categoryId ? { hits: { increment: 1 } } : { categoryId, hits: 1 },
      });
    }
  }

  async findAll(userId: string, q: TransactionQuery) {
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...ACTIVE_TX_FILTER,
      ...(q.kind ? { kind: q.kind as Prisma.EnumTxKindFilter } : {}),
      ...(q.debtId ? { debtId: q.debtId } : {}),
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.q?.trim() ? { note: { contains: q.q.trim(), mode: 'insensitive' } } : {}),
      ...(q.from || q.to || q.before
        ? {
            occurredAt: {
              ...(q.from ? { gte: new Date(q.from) } : {}),
              ...(q.to ? { lte: new Date(q.to) } : {}),
              ...(q.before ? { lt: new Date(q.before) } : {}),
            },
          }
        : {}),
    };
    // FIN-038 (historial): la fila viaja con su categoría y el nombre de la deuda
    // para que la pantalla no dispare N requests. Solo lectura — §32 intacto.
    return this.prisma.transaction.findMany({
      where,
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(Number(q.limit) || 50, 200),
      include: {
        category: { select: { name: true, icon: true, color: true } },
        debt: { select: { name: true } },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: { id, userId, ...ACTIVE_TX_FILTER },
    });
    if (!tx) throw new NotFoundException('Transacción no encontrada');
    return tx;
  }

  /**
   * FIN-028 (DEC-0028 P1/P2/P5/P6) · Edición del movimiento. La mutación NO
   * contiene lógica financiera (DEC-028-006): solo cambia el registro y emite
   * `TransactionUpdated` con el diff estructural; el Motor recalcula lo derivado
   * desde su listener (patrón FIN-002). Guardarraíl P6: en un pago de deuda,
   * monto/fecha/tipo/deuda NO se editan en sitio (dejarían el saldo mentiroso) —
   * el usuario debe anular y recrear.
   */
  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const prev = await this.findOne(userId, id);

    const next: Record<string, unknown> = {
      ...dto,
      ...(dto.occurredAt ? { occurredAt: new Date(dto.occurredAt) } : {}),
    };
    const diff = diffTransaction(prev as unknown as Record<string, unknown>, next);

    if (prev.kind === 'pago_deuda') {
      const locked = diff.changedFields.filter((f) => (DEBT_LOCKED_FIELDS as readonly string[]).includes(f));
      if (locked.length > 0) {
        throw new BadRequestException(
          'En un pago de deuda no se puede editar el monto, la fecha ni el tipo en sitio: anúlalo y regístralo de nuevo para que el saldo de la deuda quede correcto.',
        );
      }
    }

    // Nada cambió realmente: no se toca la BD ni se emite evento (idempotente).
    if (diff.changedFields.length === 0) return prev;

    // FIN-046 Fase 4: corregir la categoría enseña a Millo para la próxima vez.
    const note = (dto.note ?? prev.note) as string | null;
    if (dto.categoryId && diff.changedFields.includes('categoryId') && note) {
      await this.learnCategory(userId, note, dto.categoryId).catch(() => undefined);
    }

    return this.outbox.withEvent(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          ...dto,
          occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
        },
      });
      return {
        result: updated,
        event: {
          aggregateType: 'transaction',
          aggregateId: id,
          eventType: DomainEventType.TransactionUpdated,
          payload: {
            userId,
            source: prev.source,
            changedFields: diff.changedFields,
            before: diff.before,
            after: diff.after,
          },
        },
      };
    });
  }

  /**
   * FIN-028 (DEC-0028 §5.1) · Anular = `deletedAt` (único mecanismo; no hay
   * estado `anulada`). Emite `TransactionDeleted` → el Motor recalcula. Si el
   * movimiento anulado era un pago de deuda, REVIERTE el saldo de esa deuda de
   * forma atómica (inverso del `create`; sin esto la deuda quedaría mentirosa)
   * y avisa al Motor con `DebtUpdated`.
   */
  async remove(userId: string, id: string) {
    const prev = await this.findOne(userId, id);
    // Anulación + (si es pago de deuda) reverso del saldo + eventos, TODO en una
    // sola transacción de BD — mismo patrón atómico que `create`.
    await this.prisma.$transaction(async (tx) => {
      await tx.transaction.update({ where: { id }, data: { deletedAt: new Date() } });

      const card = prev.kind === 'pago_deuda' && prev.debtId ? await isCardDebt(tx, userId, prev.debtId) : false;
      if (card && prev.debtId) {
        // FIN-043: en tarjetas se des-pagan exactamente las cuotas que este pago cubrió.
        await revertCardPayment(tx, prev.debtId, id);
      } else if (prev.kind === 'pago_deuda' && prev.debtId) {
        // Reverso del descuento del pago: devuelve el saldo y reactiva la deuda
        // si había quedado 'pagada'. (La reconstrucción exacta de next_due_date
        // no se intenta — limitación declarada en IMP-0028: no inventamos la
        // fecha previa; el próximo pago la vuelve a anclar vía FIN-018.)
        await tx.$executeRaw`
          UPDATE debts
             SET current_balance = current_balance + ${prev.amount},
                 status = CASE WHEN status = 'pagada'::"DebtStatus" THEN 'activa'::"DebtStatus" ELSE status END,
                 updated_at = now()
           WHERE id = ${prev.debtId}::uuid AND user_id = ${userId}::uuid`;
      }

      await this.outbox.enqueue(tx, {
        aggregateType: 'transaction',
        aggregateId: id,
        eventType: DomainEventType.TransactionDeleted,
        payload: { userId, source: prev.source, kind: prev.kind, amount: Number(prev.amount) },
      });
      if (prev.kind === 'pago_deuda' && prev.debtId) {
        await this.outbox.enqueue(tx, {
          aggregateType: 'debt',
          aggregateId: prev.debtId,
          eventType: DomainEventType.DebtUpdated,
          payload: { userId, reason: 'payment_voided' },
        });
      }
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
