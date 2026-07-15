import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AmortizationService } from '../finance/amortization/amortization.service';
import { toMonthlyEffectiveRate } from '../finance/amortization/interest.util';
import { OutboxService } from '../events/outbox.service';
import { DomainEventType } from '../events/domain-events';
import { RateBasis } from '../finance/amortization/amortization.types';

type PrepayEffect = 'reducir_plazo' | 'reducir_cuota';

interface LockedDebtRow {
  id: string;
  current_balance: unknown;
  monthly_payment: unknown;
  interest_rate: unknown;
  rate_basis: string;
  status: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * FIN-012 · Abono a capital y pago total anticipado REALES (DEC-0012).
 *
 * Persistencia atómica (§4.3): toda la validación y el recálculo ocurren con la
 * fila de la deuda bloqueada (`SELECT ... FOR UPDATE`) dentro de una única
 * $transaction — ningún otro pago puede intercalarse. El preview usa la MISMA
 * función pura que el recibo persistido (§4.4): lo que el usuario ve antes de
 * confirmar es exactamente lo que queda guardado.
 */
@Injectable()
export class DebtPrepaymentService {
  private readonly logger = new Logger(DebtPrepaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly amortization: AmortizationService,
    private readonly outbox: OutboxService,
  ) {}

  /** Preview sin persistir — misma función pura que el recibo (DEC-0012 §4.4). */
  async preview(userId: string, debtId: string, amount: number, effect: PrepayEffect) {
    const debt = await this.prisma.debt.findFirst({
      where: { id: debtId, userId, deletedAt: null },
    });
    if (!debt) throw new NotFoundException('Deuda no encontrada');
    return this.buildReceipt(
      Number(debt.currentBalance),
      Number(debt.monthlyPayment ?? 0),
      Number(debt.interestRate),
      debt.rateBasis as RateBasis,
      amount,
      effect,
    );
  }

  /** Abono único a capital: recalcula plazo o cuota y persiste, todo bajo lock. */
  async prepay(userId: string, debtId: string, amount: number, effect: PrepayEffect) {
    if (!(amount > 0)) throw new BadRequestException('El abono debe ser mayor a 0');

    return this.prisma.$transaction(async (tx) => {
      const debt = await this.lockDebt(tx, userId, debtId);
      const balance = Number(debt.current_balance);
      if (debt.status !== 'activa') {
        throw new BadRequestException('La deuda no está activa');
      }
      if (amount >= balance) {
        throw new BadRequestException(
          'El abono cubre todo el saldo: usa el pago total anticipado',
        );
      }

      const receipt = this.buildReceipt(
        balance,
        Number(debt.monthly_payment ?? 0),
        Number(debt.interest_rate),
        debt.rate_basis as RateBasis,
        amount,
        effect,
      );

      // Regenera el plan de pago con el cronograma DESPUÉS (misma función pura).
      await tx.amortizationEntry.deleteMany({ where: { debtId } });
      await tx.amortizationEntry.createMany({
        data: receipt.afterEntries.map((e) => ({
          debtId,
          periodNo: e.periodNo,
          dueDate: new Date(e.dueDate),
          openingBal: e.openingBalance,
          payment: e.payment,
          interestPart: e.interestPart,
          principalPart: e.principalPart,
          extraPayment: 0,
          closingBal: e.closingBalance,
        })),
      });

      await tx.debt.update({
        where: { id: debtId },
        data: {
          currentBalance: receipt.newBalance,
          // reducir_cuota persiste la nueva cuota; reducir_plazo la conserva.
          monthlyPayment: receipt.newMonthlyPayment,
          nextDueDate: receipt.afterEntries[0] ? new Date(receipt.afterEntries[0].dueDate) : null,
        },
      });

      const created = await tx.transaction.create({
        data: {
          userId,
          kind: 'pago_deuda',
          paymentType: 'abono_capital',
          amount,
          occurredAt: new Date(),
          debtId,
          // FIN-018 4ª iteración (CPSAO): beneficio antes que término técnico.
          note: `Adelanto a tu deuda (${effect === 'reducir_plazo' ? 'terminas antes' : 'baja tu cuota'})`,
          source: 'app',
          status: 'confirmada',
        },
      });
      await this.enqueueEvents(tx, userId, debtId, created.id, Number(created.amount));

      this.logger.log(
        `[prepay] user=${userId} debt=${debtId} amount=${amount} effect=${effect} saved=${receipt.interestSaved}`,
      );
      return { ...receipt, transactionId: created.id };
    });
  }

  /** Pago total anticipado: liquida por currentBalance (DEC-0012 §4.5). */
  async payoff(userId: string, debtId: string) {
    return this.prisma.$transaction(async (tx) => {
      const debt = await this.lockDebt(tx, userId, debtId);
      const balance = Number(debt.current_balance);
      if (balance <= 0 || debt.status === 'pagada') {
        throw new BadRequestException('La deuda ya está saldada');
      }

      await tx.debt.update({
        where: { id: debtId },
        data: { currentBalance: 0, status: 'pagada', nextDueDate: null },
      });
      // El plan futuro deja de existir (el histórico vive en las transacciones).
      await tx.amortizationEntry.deleteMany({ where: { debtId } });

      const created = await tx.transaction.create({
        data: {
          userId,
          kind: 'pago_deuda',
          paymentType: 'pago_total',
          amount: balance,
          occurredAt: new Date(),
          debtId,
          note: 'Pagaste toda tu deuda',
          source: 'app',
          status: 'confirmada',
        },
      });
      await this.enqueueEvents(tx, userId, debtId, created.id, balance);

      this.logger.log(`[payoff] user=${userId} debt=${debtId} amount=${balance}`);
      return { paidAmount: round2(balance), status: 'pagada', transactionId: created.id };
    });
  }

  /** Bloqueo de fila: la base de la atomicidad (DEC-0012 §4.3, cambio obligatorio #2). */
  private async lockDebt(
    tx: Prisma.TransactionClient,
    userId: string,
    debtId: string,
  ): Promise<LockedDebtRow> {
    const rows = await tx.$queryRaw<LockedDebtRow[]>`
      SELECT id, current_balance, monthly_payment, interest_rate, rate_basis, status
        FROM debts
       WHERE id = ${debtId}::uuid AND user_id = ${userId}::uuid AND deleted_at IS NULL
         FOR UPDATE`;
    if (rows.length === 0) throw new NotFoundException('Deuda no encontrada');
    return rows[0];
  }

  private buildReceipt(
    balance: number,
    payment: number,
    interestRate: number,
    rateBasis: RateBasis,
    amount: number,
    effect: PrepayEffect,
  ) {
    if (balance <= 0) throw new BadRequestException('La deuda no tiene saldo pendiente');
    if (payment <= 0) {
      throw new BadRequestException('La deuda no tiene cuota mensual registrada');
    }
    const monthlyRate = toMonthlyEffectiveRate(interestRate, rateBasis);
    try {
      const before = this.amortization.remainingSchedule(balance, monthlyRate, payment, new Date());
      return this.amortization.prepaymentReceipt(
        balance,
        monthlyRate,
        payment,
        before.months,
        amount,
        effect,
        new Date(),
      );
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  private async enqueueEvents(
    tx: Prisma.TransactionClient,
    userId: string,
    debtId: string,
    transactionId: string,
    amount: number,
  ) {
    // Mismos eventos que el flujo existente de pago_deuda: el Motor recalcula
    // solo, y el insight de deuda saldada se dispara por el pipeline de FIN-006.
    await this.outbox.enqueue(tx, {
      aggregateType: 'transaction',
      aggregateId: transactionId,
      eventType: DomainEventType.TransactionCreated,
      payload: { userId, kind: 'pago_deuda', amount },
    });
    await this.outbox.enqueue(tx, {
      aggregateType: 'debt',
      aggregateId: debtId,
      eventType: DomainEventType.DebtUpdated,
      payload: { userId, reason: 'payment' },
    });
  }
}
