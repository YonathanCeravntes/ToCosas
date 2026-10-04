import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OutboxService } from '../events/outbox.service';
import { DomainEventType } from '../events/domain-events';
import { AmortizationService } from '../finance/amortization/amortization.service';
import { toMonthlyEffectiveRate } from '../finance/amortization/interest.util';
import { descriptorFor } from './product-type.descriptor';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface CardSummary {
  creditLimit: number | null;
  /** Σ cuotas pendientes de las compras vivas — DERIVADO, no almacenado (§32). */
  usedAmount: number;
  /** creditLimit − usedAmount (null si la tarjeta no declaró cupo). */
  availableCredit: number | null;
  purchases: Array<{
    id: string;
    amount: number;
    occurredAt: string;
    installmentsCount: number;
    withInterest: boolean;
    isCashAdvance: boolean;
    categoryId: string | null;
    note: string | null;
    pendingBalance: number;
    paidInstallments: number;
    /** true si ya se puede anular limpio (ninguna cuota pagada — §4.5). */
    canVoid: boolean;
  }>;
}

/**
 * FIN-031 (DEC-0031) · Compra con tarjeta de crédito — la espina del SO
 * Financiero. `usedAmount`/`availableCredit` se DERIVAN (§32, cero columna que
 * se desincronice). "Lo comprometido" mensual de la tarjeta NO vive aquí: es
 * `DebtOutlayService` quien lo computa desde las cuotas (única autoridad,
 * DEC-0031 §3.1) — este servicio administra el ciclo de vida de la compra.
 *
 * Modelo (evita el doble conteo): una compra a crédito NO es salida de caja hoy
 * — la caja sale por las CUOTAS. Por eso la compra NO crea un gasto en efectivo;
 * es su propia acción de primera clase y su origen trazable (G/§42).
 */
@Injectable()
export class CardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly amortization: AmortizationService,
  ) {}

  async registerPurchase(
    userId: string,
    dto: {
      debtId: string; amount: number; occurredAt?: string; installments: number; withInterest?: boolean; note?: string;
      categoryId?: string; isCashAdvance?: boolean;
    },
  ) {
    const card = await this.ensureCardOwned(userId, dto.debtId);
    const n = Math.max(1, Math.floor(dto.installments));
    if (dto.amount <= 0) throw new BadRequestException('El monto de la compra debe ser mayor a 0');

    const occurred = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    // FIN-061 F2: un avance en efectivo cobra interés desde el día uno.
    const withInterest = dto.isCashAdvance ? true : dto.withInterest ?? false;
    // El plan de cuotas: sin interés = monto/N; con interés = amortización del
    // crédito (misma función pura de FIN-012 — cero fórmula nueva, §32).
    const perInstallment = withInterest
      ? this.amortization.computeMonthlyPayment(dto.amount, toMonthlyEffectiveRate(Number(card.interestRate), card.rateBasis), n)
      : round2(dto.amount / n);

    const purchase = await this.prisma.$transaction(async (tx) => {
      const p = await tx.cardPurchase.create({
        data: {
          debtId: card.id,
          amount: dto.amount,
          occurredAt: occurred,
          installmentsCount: n,
          withInterest,
          note: dto.note ?? null,
          categoryId: dto.categoryId ?? null,
          isCashAdvance: dto.isCashAdvance ?? false,
        },
      });
      await tx.cardInstallment.createMany({
        data: Array.from({ length: n }, (_, i) => ({
          cardPurchaseId: p.id,
          periodNo: i + 1,
          // Primera cuota ~1 mes después de la compra, mensual, día anclado.
          dueDate: new Date(Date.UTC(occurred.getUTCFullYear(), occurred.getUTCMonth() + i + 1, Math.min(occurred.getUTCDate(), 28))),
          amount: perInstallment,
        })),
      });
      // Causalidad (G/§42): la compra despierta al Motor para recomputar con la
      // nueva cuota comprometida — que fluye por DebtOutlayService (§32).
      await this.outbox.enqueue(tx, {
        aggregateType: 'debt',
        aggregateId: card.id,
        eventType: DomainEventType.DebtUpdated,
        payload: { userId, reason: 'card_purchase', purchaseId: p.id },
      });
      return p;
    });

    const summary = await this.summary(userId, card.id);
    return {
      purchase,
      perInstallment,
      installments: n,
      // Acuse explícito (FIN-029 §5.1): qué quedó y dónde.
      acknowledgment: `Registré tu compra de ${money(dto.amount)} en ${card.name} — ${n} cuota${n === 1 ? '' : 's'} de ${money(perInstallment)}. Cupo disponible: ${summary.availableCredit != null ? money(summary.availableCredit) : 'sin cupo declarado'}.`,
      summary,
    };
  }

  /**
   * FIN-031 (DEC-0031 §3.1) · Política de reversión con dependientes (§4.5):
   *  - sin cuotas pagadas → anulación LIMPIA (la cascada se revierte);
   *  - con ≥1 cuota pagada → BLOQUEADA + ruta de corrección (nunca falsear el
   *    historial de una compra que ya movió plata real — §42 "explicable").
   */
  async voidPurchase(userId: string, purchaseId: string) {
    const purchase = await this.prisma.cardPurchase.findFirst({
      where: { id: purchaseId, deletedAt: null, debt: { userId, deletedAt: null } },
      include: { installments: { where: { deletedAt: null } } },
    });
    if (!purchase) throw new NotFoundException('Compra no encontrada');

    const paid = purchase.installments.filter((i) => i.paidAt != null).length;
    if (paid > 0) {
      throw new ConflictException(
        'Esta compra ya tiene pagos aplicados, no puedo borrarla sin falsear tu historial. Puedes corregir el saldo con un ajuste, o anular esos pagos primero.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.cardInstallment.updateMany({ where: { cardPurchaseId: purchase.id }, data: { deletedAt: now } });
      await tx.cardPurchase.update({ where: { id: purchase.id }, data: { deletedAt: now } });
      await this.outbox.enqueue(tx, {
        aggregateType: 'debt',
        aggregateId: purchase.debtId,
        eventType: DomainEventType.DebtUpdated,
        payload: { userId, reason: 'card_purchase_voided', purchaseId: purchase.id },
      });
    });
    return { voided: true };
  }

  /**
   * FIN-043 · Cambiar el número de cuotas de una compra: el saldo PENDIENTE se reparte
   * en `installments` cuotas nuevas (sin interés), desde el próximo vencimiento de la
   * tarjeta. Las cuotas ya pagadas no se tocan. Caso típico: el saldo de un extracto
   * que quedó en 1 cuota y se quiere repartir según el pago mínimo.
   */
  async resplitPurchase(userId: string, purchaseId: string, installments: number, now = new Date()) {
    const n = Math.floor(installments);
    if (!(n >= 1 && n <= 72)) throw new BadRequestException('El número de cuotas debe estar entre 1 y 72.');
    const purchase = await this.prisma.cardPurchase.findFirst({
      where: { id: purchaseId, deletedAt: null, debt: { userId, deletedAt: null } },
      include: { installments: { where: { deletedAt: null } }, debt: { select: { id: true, paymentDay: true } } },
    });
    if (!purchase) throw new NotFoundException('Compra no encontrada');
    const unpaid = purchase.installments.filter((i) => i.paidAt == null);
    const pending = round2(unpaid.reduce((a, i) => a + Number(i.amount), 0));
    if (pending <= 0) throw new BadRequestException('Esta compra ya está pagada.');
    const paidCount = purchase.installments.length - unpaid.length;
    const lastPaidDue = purchase.installments.filter((i) => i.paidAt != null).reduce<Date | null>((a, i) => (!a || i.dueDate > a ? i.dueDate : a), null);

    // Primera cuota nueva: el próximo día de pago de la tarjeta (o el de la compra), a partir de hoy.
    const day = purchase.debt.paymentDay ?? purchase.occurredAt.getUTCDate();
    const from = lastPaidDue && lastPaidDue > now ? lastPaidDue : now;
    const clamp = (y: number, m: number) => Math.min(day, new Date(Date.UTC(y, m + 1, 0)).getUTCDate());
    let y = from.getUTCFullYear();
    let m = from.getUTCMonth();
    if (new Date(Date.UTC(y, m, clamp(y, m))) <= from) { m += 1; if (m > 11) { m = 0; y += 1; } }
    const per = round2(pending / n);
    const last = round2(pending - per * (n - 1));

    await this.prisma.$transaction(async (tx) => {
      const stamp = new Date();
      await tx.cardInstallment.updateMany({ where: { id: { in: unpaid.map((i) => i.id) } }, data: { deletedAt: stamp } });
      await tx.cardInstallment.createMany({
        data: Array.from({ length: n }, (_, i) => {
          const mm = m + i;
          const yy = y + Math.floor(mm / 12);
          const mo = mm % 12;
          return {
            cardPurchaseId: purchase.id,
            periodNo: paidCount + i + 1,
            dueDate: new Date(Date.UTC(yy, mo, clamp(yy, mo))),
            amount: i === n - 1 ? last : per,
          };
        }),
      });
      await tx.cardPurchase.update({ where: { id: purchase.id }, data: { installmentsCount: paidCount + n } });
      const next = await tx.cardInstallment.findFirst({
        where: { purchase: { debtId: purchase.debtId, deletedAt: null }, deletedAt: null, paidAt: null },
        orderBy: { dueDate: 'asc' },
        select: { dueDate: true },
      });
      await tx.debt.update({ where: { id: purchase.debtId }, data: { nextDueDate: next?.dueDate ?? null } });
      await this.outbox.enqueue(tx, {
        aggregateType: 'debt',
        aggregateId: purchase.debtId,
        eventType: DomainEventType.DebtUpdated,
        payload: { userId, reason: 'card_purchase_resplit', purchaseId: purchase.id },
      });
    });
    return this.summary(userId, purchase.debtId);
  }

  async summary(userId: string, debtId: string): Promise<CardSummary> {
    const card = await this.ensureCardOwned(userId, debtId);
    const purchases = await this.prisma.cardPurchase.findMany({
      where: { debtId: card.id, deletedAt: null },
      include: { installments: { where: { deletedAt: null } } },
      orderBy: { occurredAt: 'desc' },
    });

    let usedAmount = 0;
    const rows = purchases.map((p) => {
      const pending = p.installments.filter((i) => i.paidAt == null).reduce((a, i) => a + Number(i.amount), 0);
      const paidCount = p.installments.filter((i) => i.paidAt != null).length;
      usedAmount += pending;
      return {
        id: p.id,
        amount: Number(p.amount),
        occurredAt: p.occurredAt.toISOString(),
        installmentsCount: p.installmentsCount,
        withInterest: p.withInterest,
        isCashAdvance: p.isCashAdvance,
        categoryId: p.categoryId,
        note: p.note,
        pendingBalance: round2(pending),
        paidInstallments: paidCount,
        canVoid: paidCount === 0,
      };
    });

    const creditLimit = card.creditLimit != null ? Number(card.creditLimit) : null;
    return {
      creditLimit,
      usedAmount: round2(usedAmount),
      availableCredit: creditLimit != null ? round2(creditLimit - usedAmount) : null,
      purchases: rows,
    };
  }

  private async ensureCardOwned(userId: string, debtId: string) {
    const debt = await this.prisma.debt.findFirst({ where: { id: debtId, userId, deletedAt: null } });
    if (!debt) throw new NotFoundException('Tarjeta no encontrada');
    // FIN-032: por CAPACIDAD del descriptor (tarjeta/fintech), no por el tipo — así
    // un producto nuevo con compras a cuotas se habilita por configuración (§32/F).
    if (!descriptorFor(debt.debtType).capabilities.installmentPurchases) {
      throw new BadRequestException('Este producto no maneja compras a cuotas');
    }
    return debt;
  }
}

const money = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
