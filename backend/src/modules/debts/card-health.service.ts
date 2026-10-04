import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SpendableService } from '../budget/spendable.service';
import { RateBasis } from '../finance/amortization/amortization.types';
import { toMonthlyEffectiveRate } from '../finance/amortization/interest.util';
import { CardService } from './card.service';
import { cardHealth, CardHealth } from './card-health.util';
import { CashflowPlanService } from './cashflow-plan.service';
import { DebtOutlayService } from './debt-outlay.service';
import { descriptorFor } from './product-type.descriptor';

export interface StatementDto {
  closingDate: string;
  dueDate?: string;
  statementBalance: number;
  minimumPayment?: number;
  totalPayment?: number;
  creditLimit?: number;
  handlingFee?: number;
}

const num = (d: unknown) => (d != null ? Number(d) : null);

/**
 * FIN-061 Fase 2.4 · Extractos de tarjeta y la salud de cada tarjeta. Fuentes únicas
 * (§32): lo usado = CardService, la cuota = DebtOutlayService, el abono del plan =
 * CashflowPlanService (una sola regla de orden: liberar flujo).
 */
@Injectable()
export class CardHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cards: CardService,
    private readonly debtOutlay: DebtOutlayService,
    private readonly plan: CashflowPlanService,
    private readonly spendable: SpendableService,
  ) {}

  async listStatements(userId: string, debtId: string) {
    await this.ensureCard(userId, debtId);
    const rows = await this.prisma.cardStatement.findMany({ where: { debtId }, orderBy: { closingDate: 'desc' }, take: 12 });
    return rows.map((s) => ({
      id: s.id,
      closingDate: s.closingDate.toISOString().slice(0, 10),
      dueDate: s.dueDate ? s.dueDate.toISOString().slice(0, 10) : null,
      statementBalance: Number(s.statementBalance),
      minimumPayment: num(s.minimumPayment),
      totalPayment: num(s.totalPayment),
      creditLimit: num(s.creditLimit),
      handlingFee: num(s.handlingFee),
    }));
  }

  /**
   * Guarda (o corrige) el extracto de un corte. Si trae cupo, actualiza el cupo de la
   * tarjeta; si trae fecha de pago futura, la próxima fecha de pago.
   */
  async saveStatement(userId: string, debtId: string, dto: StatementDto) {
    const card = await this.ensureCard(userId, debtId);
    const closingDate = new Date(`${dto.closingDate.slice(0, 10)}T00:00:00Z`);
    const dueDate = dto.dueDate ? new Date(`${dto.dueDate.slice(0, 10)}T00:00:00Z`) : null;
    if (dueDate && dueDate < closingDate) throw new BadRequestException('La fecha de pago no puede ser antes del corte.');
    const data = {
      dueDate,
      statementBalance: dto.statementBalance,
      minimumPayment: dto.minimumPayment ?? null,
      totalPayment: dto.totalPayment ?? null,
      creditLimit: dto.creditLimit ?? null,
      handlingFee: dto.handlingFee ?? null,
    };
    const saved = await this.prisma.cardStatement.upsert({
      where: { debtId_closingDate: { debtId, closingDate } },
      create: { debtId, closingDate, ...data },
      update: data,
    });
    const debtUpdate: { creditLimit?: number; nextDueDate?: Date } = {};
    if (dto.creditLimit && dto.creditLimit > 0) debtUpdate.creditLimit = dto.creditLimit;
    if (dueDate && dueDate >= new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()))) {
      if (!card.nextDueDate || dueDate < card.nextDueDate || card.nextDueDate < new Date()) debtUpdate.nextDueDate = dueDate;
    }
    if (Object.keys(debtUpdate).length) await this.prisma.debt.update({ where: { id: debtId }, data: debtUpdate });
    return { id: saved.id, saved: true };
  }

  async health(userId: string, debtId: string, now: Date = new Date()): Promise<CardHealth> {
    const card = await this.ensureCard(userId, debtId);
    const [summary, outlays, plan, teQueda, statements, payments, purchases, allCards] = await Promise.all([
      this.cards.summary(userId, debtId),
      this.debtOutlay.outlaysByUser(userId),
      this.plan.forUser(userId),
      this.spendable.compute(userId, now),
      this.prisma.cardStatement.findMany({ where: { debtId }, orderBy: { closingDate: 'desc' }, take: 6 }),
      this.prisma.transaction.findMany({
        where: { userId, debtId, deletedAt: null, kind: 'pago_deuda' },
        select: { occurredAt: true, amount: true },
        orderBy: { occurredAt: 'desc' },
        take: 24,
      }),
      this.prisma.cardPurchase.findMany({
        where: { debtId, deletedAt: null },
        include: { installments: { where: { deletedAt: null } }, category: { select: { name: true } } },
        orderBy: { occurredAt: 'desc' },
        take: 200,
      }),
      this.prisma.debt.findMany({ where: { userId, deletedAt: null, status: { in: ['activa', 'en_mora'] } } }),
    ]);

    const cardIds = allCards.filter((d) => descriptorFor(d.debtType).capabilities.installmentPurchases).map((d) => d.id);
    const others = await Promise.all(
      cardIds.filter((id) => id !== debtId).map(async (id) => {
        const s = await this.cards.summary(userId, id);
        return { creditLimit: s.creditLimit, used: s.usedAmount };
      }),
    );
    const latest = statements[0];
    // Sin compras registradas, lo usado es el saldo del último extracto.
    const used = summary.usedAmount > 0 ? summary.usedAmount : latest ? Number(latest.statementBalance) : 0;
    const first = plan.steps[0];

    return cardHealth({
      now,
      incomeBase: teQueda.incomeBase,
      monthlyRate: Number(card.interestRate) > 0 ? toMonthlyEffectiveRate(Number(card.interestRate), card.rateBasis as RateBasis) : 0,
      creditLimit: summary.creditLimit,
      usedAmount: used,
      cuota: outlays.byDebt.get(debtId)?.outlay ?? Number(card.monthlyPayment ?? 0),
      planExtra: first && first.debtId === debtId ? plan.toDebt : 0,
      allCardsCuota: cardIds.reduce((a, id) => a + (outlays.byDebt.get(id)?.outlay ?? 0), 0),
      otherCards: others,
      nextDueDate: card.nextDueDate,
      statements: statements.map((s) => ({
        closingDate: s.closingDate,
        dueDate: s.dueDate,
        statementBalance: Number(s.statementBalance),
        minimumPayment: num(s.minimumPayment),
        totalPayment: num(s.totalPayment),
        creditLimit: num(s.creditLimit),
        handlingFee: num(s.handlingFee),
      })),
      payments: payments.map((p) => ({ date: p.occurredAt, amount: Number(p.amount) })),
      purchases: purchases.map((p) => {
        const pending = p.installments.filter((i) => i.paidAt == null);
        const last = pending.reduce<Date | null>((a, i) => (!a || i.dueDate > a ? i.dueDate : a), null);
        return {
          id: p.id,
          amount: Number(p.amount),
          occurredAt: p.occurredAt,
          installmentsCount: p.installmentsCount,
          withInterest: p.withInterest,
          isCashAdvance: p.isCashAdvance,
          categoryName: p.category?.name ?? null,
          perInstallment: pending.length ? Number(pending[pending.length - 1].amount) : 0,
          pendingBalance: pending.reduce((a, i) => a + Number(i.amount), 0),
          lastDueDate: last,
        };
      }),
    });
  }

  private async ensureCard(userId: string, debtId: string) {
    const debt = await this.prisma.debt.findFirst({ where: { id: debtId, userId, deletedAt: null } });
    if (!debt) throw new NotFoundException('Tarjeta no encontrada');
    if (!descriptorFor(debt.debtType).capabilities.installmentPurchases) {
      throw new BadRequestException('Este producto no es una tarjeta');
    }
    return debt;
  }
}
