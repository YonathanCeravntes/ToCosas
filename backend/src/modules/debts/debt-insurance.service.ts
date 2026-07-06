import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDebtInsuranceDto,
  UpdateDebtInsuranceDto,
} from './dto/debt-insurance.dto';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * FIN-013 · Seguros asociados al crédito (DEC-0011 §4.1/§4.2).
 *
 * Modelo mínimo: prima mensual plana, financiado (dentro de la cuota) o no,
 * endosable (póliza propia del usuario). Las primas NO impactan el Motor
 * (DTI/gasto esencial) en este ciclo — solo el display de cuota total real
 * y el costo total del crédito.
 */
@Injectable()
export class DebtInsuranceService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, debtId: string) {
    await this.ensureDebtOwned(userId, debtId);
    return this.prisma.debtInsurance.findMany({
      where: { debtId, deletedAt: null },
      orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(userId: string, debtId: string, dto: CreateDebtInsuranceDto) {
    await this.ensureDebtOwned(userId, debtId);
    return this.prisma.debtInsurance.create({
      data: {
        debtId,
        kind: dto.kind ?? 'otro',
        name: dto.name,
        monthlyPremium: dto.monthlyPremium,
        financed: dto.financed ?? true,
        endorsed: dto.endorsed ?? false,
        insurer: dto.insurer ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  async update(userId: string, insuranceId: string, dto: UpdateDebtInsuranceDto) {
    await this.ensureInsuranceOwned(userId, insuranceId);
    return this.prisma.debtInsurance.update({
      where: { id: insuranceId },
      data: { ...dto },
    });
  }

  async remove(userId: string, insuranceId: string) {
    await this.ensureInsuranceOwned(userId, insuranceId);
    await this.prisma.debtInsurance.update({
      where: { id: insuranceId },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  /**
   * Desglose de la cuota real (solo display, no toca el Motor):
   *   - financiadas: primas que ya van DENTRO de la cuota registrada.
   *   - aparte: primas que el usuario paga por fuera → se SUMAN a la cuota.
   *   cuotaTotal = monthlyPayment + primas aparte.
   */
  paymentBreakdown(
    monthlyPayment: number,
    insurances: Array<{ monthlyPremium: unknown; financed: boolean; active: boolean; deletedAt?: Date | null }>,
  ) {
    const activos = insurances.filter((i) => i.active && !i.deletedAt);
    const financed = activos
      .filter((i) => i.financed)
      .reduce((acc, i) => acc + Number(i.monthlyPremium), 0);
    const separate = activos
      .filter((i) => !i.financed)
      .reduce((acc, i) => acc + Number(i.monthlyPremium), 0);
    return {
      basePayment: round2(monthlyPayment),
      insuranceFinanced: round2(financed),
      insuranceSeparate: round2(separate),
      insuranceMonthlyTotal: round2(financed + separate),
      totalMonthlyOutlay: round2(monthlyPayment + separate),
    };
  }

  private async ensureDebtOwned(userId: string, debtId: string) {
    const debt = await this.prisma.debt.findFirst({
      where: { id: debtId, userId, deletedAt: null },
    });
    if (!debt) throw new NotFoundException('Deuda no encontrada');
    return debt;
  }

  private async ensureInsuranceOwned(userId: string, insuranceId: string) {
    const ins = await this.prisma.debtInsurance.findFirst({
      where: { id: insuranceId, deletedAt: null, debt: { userId, deletedAt: null } },
    });
    if (!ins) throw new NotFoundException('Seguro no encontrado');
    return ins;
  }
}
