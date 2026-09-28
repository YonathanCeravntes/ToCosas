import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AmortizationService } from '../finance/amortization/amortization.service';
import { AmortizationResult } from '../finance/amortization/amortization.types';
import { toMonthlyEffectiveRate } from '../finance/amortization/interest.util';
import { OutboxService } from '../events/outbox.service';
import { DomainEventType } from '../events/domain-events';
import { scheduleModelFor } from './product-type.descriptor';
import { RenegotiateDebtDto } from './dto/renegotiate.dto';

/** Foto de las condiciones de un crédito (antes / después), lo que ve el usuario. */
export interface DebtTerms {
  balance: number;
  monthlyPayment: number | null;
  remainingInstallments: number | null;
  interestRate: number;
  rateBasis: string;
  rateKind: string;
  paymentDay: number | null;
  nextDueDate: string | null;
  payoffDate: string | null;
  /** Intereses que faltan por pagar según el plan (null si la deuda no tiene plan). */
  remainingInterest: number | null;
}

export interface RenegotiationPreview {
  debtId: string;
  name: string;
  scheduleModel: string;
  effectiveFrom: string;
  keptCycle: boolean;
  before: DebtTerms;
  after: DebtTerms;
  /** Qué cambió, en lenguaje llano (para la app y el bot). */
  changes: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * FIN-044 · Renegociación de un crédito. El usuario pacta con la entidad nuevas
 * condiciones (cuotas, tasa y su tipo, cuota, día de pago, saldo recompuesto) y Millo:
 *  1. calcula ANTES y DESPUÉS (preview) sin tocar nada;
 *  2. al confirmar, recalcula el plan desde la cuota indicada (lo ya pagado no se toca:
 *     el plan nuevo arranca del saldo pendiente), actualiza la deuda y guarda la huella
 *     en `debt_renegotiations` — todo en una transacción, con evento de dominio para que
 *     el Motor y "Te queda" (§32) se recalculen.
 * Tarjetas: no aplica (su saldo y cuotas salen de las compras, FIN-031).
 */
@Injectable()
export class DebtRenegotiationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly amortization: AmortizationService,
    private readonly outbox: OutboxService,
  ) {}

  async preview(userId: string, debtId: string, dto: RenegotiateDebtDto, now = new Date()): Promise<RenegotiationPreview> {
    return (await this.plan(userId, debtId, dto, now)).preview;
  }

  async apply(userId: string, debtId: string, dto: RenegotiateDebtDto, source = 'app', now = new Date()): Promise<RenegotiationPreview> {
    const { preview, schedule } = await this.plan(userId, debtId, dto, now);
    if (preview.changes.length === 0) throw new BadRequestException('No hay cambios que aplicar.');
    const a = preview.after;
    await this.outbox.withEvent(async (tx) => {
      if (schedule) {
        await tx.amortizationEntry.deleteMany({ where: { debtId } });
        await tx.amortizationEntry.createMany({
          data: schedule.entries.map((e) => ({
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
      }
      await tx.debt.update({
        where: { id: debtId },
        data: {
          currentBalance: a.balance,
          monthlyPayment: a.monthlyPayment,
          interestRate: a.interestRate,
          rateKind: a.rateKind as 'fija' | 'variable',
          termMonths: schedule ? a.remainingInstallments : undefined,
          paymentDay: a.paymentDay,
          nextDueDate: a.nextDueDate ? new Date(a.nextDueDate) : null,
          status: a.balance > 0 ? 'activa' : undefined,
        },
      });
      await tx.debtRenegotiation.create({
        data: {
          debtId,
          userId,
          effectiveFrom: new Date(preview.effectiveFrom),
          keptCycle: preview.keptCycle,
          before: preview.before as unknown as object,
          after: preview.after as unknown as object,
          source,
          note: dto.note ?? null,
        },
      });
      return {
        result: null,
        event: {
          aggregateType: 'debt',
          aggregateId: debtId,
          eventType: DomainEventType.DebtUpdated,
          payload: { userId, reason: 'renegotiation' },
        },
      };
    });
    return preview;
  }

  async history(userId: string, debtId: string) {
    await this.ownedDebt(userId, debtId);
    return this.prisma.debtRenegotiation.findMany({
      where: { debtId, userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, effectiveFrom: true, keptCycle: true, before: true, after: true, source: true, note: true, createdAt: true },
    });
  }

  // ---------------------------------------------------------------------------

  private async ownedDebt(userId: string, debtId: string) {
    const debt = await this.prisma.debt.findFirst({
      where: { id: debtId, userId, deletedAt: null },
      include: { amortization: { orderBy: { periodNo: 'asc' } } },
    });
    if (!debt) throw new NotFoundException('Deuda no encontrada');
    return debt;
  }

  private async plan(userId: string, debtId: string, dto: RenegotiateDebtDto, now: Date) {
    const debt = await this.ownedDebt(userId, debtId);
    const model = scheduleModelFor(debt.debtType);
    if (model === 'cuotas_por_compra') {
      throw new BadRequestException('Una tarjeta no se renegocia aquí: su saldo y cuotas salen de sus compras. Envía el extracto nuevo al bot o ajusta las compras.');
    }
    if (debt.status !== 'activa') throw new BadRequestException('La deuda no está activa.');

    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const futureEntries = debt.amortization.filter((e) => e.dueDate >= today);
    const before: DebtTerms = {
      balance: Number(debt.currentBalance),
      monthlyPayment: debt.monthlyPayment != null ? Number(debt.monthlyPayment) : null,
      remainingInstallments: model === 'amortizado' ? futureEntries.length || debt.termMonths : null,
      interestRate: Number(debt.interestRate),
      rateBasis: debt.rateBasis,
      rateKind: debt.rateKind,
      paymentDay: debt.paymentDay,
      nextDueDate: debt.nextDueDate ? iso(debt.nextDueDate) : null,
      payoffDate: futureEntries.length ? iso(futureEntries[futureEntries.length - 1].dueDate) : null,
      remainingInterest: model === 'amortizado' ? round2(futureEntries.reduce((a, e) => a + Number(e.interestPart), 0)) : null,
    };

    // ¿Desde cuándo? y ¿el ciclo sigue igual?
    const keepCycle = dto.keepCycle ?? dto.paymentDay == null;
    if (!keepCycle && dto.paymentDay == null) throw new BadRequestException('Si cambia el día de pago, indícame el nuevo día.');
    const base = dto.effectiveFrom ? new Date(`${dto.effectiveFrom.slice(0, 10)}T00:00:00Z`) : debt.nextDueDate ?? today;
    if (base < new Date(today.getTime() - 400 * 864e5)) throw new BadRequestException('La fecha desde la que aplica es demasiado antigua.');
    const day = keepCycle ? (debt.paymentDay ?? base.getUTCDate()) : (dto.paymentDay as number);
    const firstDue = nextOccurrence(base, day);

    const balance = dto.currentBalance ?? before.balance;
    const rate = dto.interestRate ?? before.interestRate;
    const rateKind = dto.rateKind ?? before.rateKind;

    let after: DebtTerms;
    let schedule: AmortizationResult | null = null;
    if (model === 'amortizado') {
      let n = dto.remainingInstallments ?? null;
      if (n == null && dto.monthlyPayment != null) n = termForPayment(balance, toMonthlyEffectiveRate(rate, debt.rateBasis), dto.monthlyPayment);
      if (n == null) n = before.remainingInstallments ?? debt.termMonths ?? null;
      if (!n || n < 1) throw new BadRequestException('Indícame cuántas cuotas quedan con las nuevas condiciones.');
      schedule =
        balance > 0
          ? this.amortization.buildSchedule({
              principal: balance,
              interestRate: rate,
              rateBasis: debt.rateBasis,
              termMonths: n,
              startDate: addMonthsUTC(firstDue, -1), // el motor fecha la 1ª cuota un mes después
              system: debt.amortSystem === 'aleman' ? 'aleman' : 'frances',
            })
          : null;
      after = {
        balance,
        monthlyPayment: schedule ? schedule.monthlyPayment : 0,
        remainingInstallments: schedule ? schedule.numberOfPayments : 0,
        interestRate: rate,
        rateBasis: debt.rateBasis,
        rateKind,
        paymentDay: day,
        nextDueDate: schedule?.entries[0]?.dueDate ?? null,
        payoffDate: schedule ? schedule.payoffDate : null,
        remainingInterest: schedule ? schedule.totalInterest : 0,
      };
    } else {
      // saldo_y_cuota_pactada (informal): no hay plan de contrato; la cuota pactada manda.
      const payment = dto.monthlyPayment ?? before.monthlyPayment;
      after = {
        balance,
        monthlyPayment: payment,
        remainingInstallments: null,
        interestRate: rate,
        rateBasis: debt.rateBasis,
        rateKind,
        paymentDay: day,
        nextDueDate: iso(firstDue),
        payoffDate: null,
        remainingInterest: null,
      };
    }

    const preview: RenegotiationPreview = {
      debtId: debt.id,
      name: debt.name,
      scheduleModel: model,
      effectiveFrom: after.nextDueDate ?? iso(firstDue),
      keptCycle: keepCycle,
      before,
      after,
      changes: describeChanges(before, after),
    };
    return { preview, schedule };
  }
}

/** Primera fecha ≥ `from` que cae en el día `day` (meses cortos → último día del mes). */
export function nextOccurrence(from: Date, day: number): Date {
  const clamp = (y: number, m: number) => Math.min(day, new Date(Date.UTC(y, m + 1, 0)).getUTCDate());
  const y = from.getUTCFullYear();
  const m = from.getUTCMonth();
  const cand = new Date(Date.UTC(y, m, clamp(y, m)));
  if (cand >= from) return cand;
  return new Date(Date.UTC(m === 11 ? y + 1 : y, (m + 1) % 12, clamp(m === 11 ? y + 1 : y, (m + 1) % 12)));
}

export function addMonthsUTC(d: Date, months: number): Date {
  const target = d.getUTCMonth() + months;
  const y = d.getUTCFullYear() + Math.floor(target / 12);
  const m = ((target % 12) + 12) % 12;
  const day = Math.min(d.getUTCDate(), new Date(Date.UTC(y, m + 1, 0)).getUTCDate());
  return new Date(Date.UTC(y, m, day));
}

/** Cuotas necesarias para pagar `principal` con cuota `payment` a tasa mensual `r` (sistema francés). */
export function termForPayment(principal: number, r: number, payment: number): number {
  if (principal <= 0) return 0;
  if (r <= 0) return Math.ceil(principal / payment);
  if (payment <= principal * r) {
    throw new BadRequestException('Con esa cuota no alcanzas a cubrir los intereses del mes: la deuda nunca bajaría. Revisa la cuota o la tasa.');
  }
  return Math.ceil(-Math.log(1 - (r * principal) / payment) / Math.log(1 + r));
}

const money = (n: number | null) => (n == null ? '—' : `$${Math.round(n).toLocaleString('es-CO')}`);

export function describeChanges(b: DebtTerms, a: DebtTerms): string[] {
  const out: string[] = [];
  if (Math.abs(a.balance - b.balance) > 0.5) out.push(`Saldo: ${money(b.balance)} → ${money(a.balance)}`);
  if (a.remainingInstallments != null && a.remainingInstallments !== b.remainingInstallments) {
    out.push(`Cuotas restantes: ${b.remainingInstallments ?? '—'} → ${a.remainingInstallments}`);
  }
  if (Math.abs(a.interestRate - b.interestRate) > 0.0001) out.push(`Tasa: ${b.interestRate}% → ${a.interestRate}% ${a.rateBasis}`);
  if (a.rateKind !== b.rateKind) out.push(`Tipo de tasa: ${b.rateKind} → ${a.rateKind}`);
  if (a.monthlyPayment != null && b.monthlyPayment != null ? Math.abs(a.monthlyPayment - b.monthlyPayment) > 0.5 : a.monthlyPayment !== b.monthlyPayment) {
    out.push(`Cuota: ${money(b.monthlyPayment)} → ${money(a.monthlyPayment)}`);
  }
  if (a.paymentDay !== b.paymentDay) out.push(`Día de pago: ${b.paymentDay ?? '—'} → ${a.paymentDay}`);
  if (a.nextDueDate !== b.nextDueDate && out.length === 0) out.push(`Próximo pago: ${b.nextDueDate ?? '—'} → ${a.nextDueDate}`);
  return out;
}
