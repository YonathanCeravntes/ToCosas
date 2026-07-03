import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AmortizationService } from '../finance/amortization/amortization.service';
import {
  AmortizationResult,
} from '../finance/amortization/amortization.types';
import { debtToAmortizationInput } from './debt-amortization.mapper';
import { CreateDebtDto, UpdateDebtDto } from './dto/debt.dto';

@Injectable()
export class DebtsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly amortization: AmortizationService,
  ) {}

  async create(userId: string, dto: CreateDebtDto) {
    const schedule = this.computeSchedule(dto);
    const nextDue = schedule.entries[0]?.dueDate ?? null;

    const debt = await this.prisma.debt.create({
      data: {
        userId,
        entityId: dto.entityId ?? null,
        name: dto.name,
        debtType: dto.debtType,
        currency: dto.currency ?? 'COP',
        originalAmount: dto.originalAmount,
        currentBalance: dto.currentBalance,
        startDate: new Date(dto.startDate),
        termMonths: dto.termMonths,
        interestRate: dto.interestRate,
        rateBasis: dto.rateBasis,
        amortSystem: dto.amortSystem ?? 'frances',
        monthlyPayment: schedule.monthlyPayment,
        paymentDay: dto.paymentDay ?? null,
        nextDueDate: nextDue ? new Date(nextDue) : null,
        amortization: {
          create: schedule.entries.map((e) => ({
            periodNo: e.periodNo,
            dueDate: new Date(e.dueDate),
            openingBal: e.openingBalance,
            payment: e.payment,
            interestPart: e.interestPart,
            principalPart: e.principalPart,
            extraPayment: e.extraPayment,
            closingBal: e.closingBalance,
          })),
        },
      },
    });
    return { debt, projection: this.summary(schedule) };
  }

  async findAll(userId: string) {
    return this.prisma.debt.findMany({
      where: { userId, deletedAt: null },
      orderBy: { nextDueDate: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const debt = await this.prisma.debt.findFirst({
      where: { id, userId, deletedAt: null },
      include: { amortization: { orderBy: { periodNo: 'asc' } } },
    });
    if (!debt) throw new NotFoundException('Deuda no encontrada');
    return debt;
  }

  async update(userId: string, id: string, dto: UpdateDebtDto) {
    await this.findOne(userId, id);
    return this.prisma.debt.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.debt.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  async getAmortization(userId: string, id: string) {
    const debt = await this.findOne(userId, id);
    return debt.amortization;
  }

  /** Simula un abono extra mensual y devuelve el ahorro. */
  async simulateExtra(userId: string, id: string, extraMonthly: number) {
    const debt = await this.findOne(userId, id);
    const input = debtToAmortizationInput(
      {
        currentBalance: Number(debt.currentBalance),
        interestRate: Number(debt.interestRate),
        rateBasis: debt.rateBasis,
        termMonths: debt.termMonths,
        startDate: debt.startDate,
        amortSystem: debt.amortSystem,
        paymentDay: debt.paymentDay,
      },
      0,
    );
    return this.amortization.simulateExtraPayment(input, extraMonthly);
  }

  /** Resumen agregado de deudas del usuario. */
  async summaryForUser(userId: string) {
    const debts = await this.prisma.debt.findMany({
      where: { userId, deletedAt: null, status: 'activa' },
    });
    const totalDebt = debts.reduce((acc, d) => acc + Number(d.currentBalance), 0);
    const monthlyTotal = debts.reduce(
      (acc, d) => acc + Number(d.monthlyPayment ?? 0),
      0,
    );
    return {
      debtsCount: debts.length,
      totalDebt: Math.round(totalDebt * 100) / 100,
      monthlyPaymentsTotal: Math.round(monthlyTotal * 100) / 100,
      upcoming: debts
        .filter((d) => d.nextDueDate)
        .sort((a, b) => (a.nextDueDate! > b.nextDueDate! ? 1 : -1))
        .slice(0, 5)
        .map((d) => ({
          debtId: d.id,
          name: d.name,
          dueDate: d.nextDueDate,
          amount: Number(d.monthlyPayment ?? 0),
        })),
    };
  }

  private computeSchedule(dto: CreateDebtDto): AmortizationResult {
    const input = debtToAmortizationInput({
      currentBalance: dto.currentBalance,
      interestRate: dto.interestRate,
      rateBasis: dto.rateBasis,
      termMonths: dto.termMonths,
      startDate: new Date(dto.startDate),
      amortSystem: dto.amortSystem,
      paymentDay: dto.paymentDay,
    });
    return this.amortization.buildSchedule(input);
  }

  private summary(schedule: AmortizationResult) {
    return {
      monthlyPayment: schedule.monthlyPayment,
      numberOfPayments: schedule.numberOfPayments,
      totalInterest: schedule.totalInterest,
      totalPaid: schedule.totalPaid,
      payoffDate: schedule.payoffDate,
    };
  }
}
