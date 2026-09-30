import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainEventType } from '../events/domain-events';
import { OutboxService } from '../events/outbox.service';
import {
  CreateDebtInsuranceDto,
  UpdateDebtInsuranceDto,
} from './dto/debt-insurance.dto';
import { BreakdownCharge, paymentBreakdown } from './payment-breakdown.util';

/**
 * FIN-013 · Seguros y cargos asociados al crédito (DEC-0011 §4.1).
 *
 * Modelo mínimo: prima/cargo mensual plano, financiado (dentro de la cuota) o
 * aparte, endosable (solo seguros — FIN-023 añade `cuota_manejo` y rechaza el
 * endoso para cargos). El cálculo del desglose vive en
 * `payment-breakdown.util.ts` (compartido con `DebtOutlayService`, la fuente
 * de "lo comprometido" — DEC-0023).
 */
@Injectable()
export class DebtInsuranceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async list(userId: string, debtId: string) {
    await this.ensureDebtOwned(userId, debtId);
    return this.prisma.debtInsurance.findMany({
      where: { debtId, deletedAt: null },
      orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(userId: string, debtId: string, dto: CreateDebtInsuranceDto) {
    await this.ensureDebtOwned(userId, debtId);
    this.validateChargeSemantics(dto.kind, dto.endorsed, dto.insurer);
    // FIN-023: cambiar los cargos cambia el desembolso real → evento de dominio
    // para que el Motor recalcule (frescura ~25 s declarada en ARQ-0023 §10).
    return this.outbox.withEvent(async (tx) => {
      const created = await tx.debtInsurance.create({
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
      return {
        result: created,
        event: {
          aggregateType: 'debt',
          aggregateId: debtId,
          eventType: DomainEventType.DebtUpdated,
          payload: { userId, op: 'insurance_create' },
        },
      };
    });
  }

  async update(userId: string, insuranceId: string, dto: UpdateDebtInsuranceDto) {
    const current = await this.ensureInsuranceOwned(userId, insuranceId);
    this.validateChargeSemantics(
      dto.kind ?? (current.kind as string),
      dto.endorsed ?? current.endorsed,
      dto.insurer === undefined ? current.insurer : dto.insurer,
    );
    return this.outbox.withEvent(async (tx) => {
      const updated = await tx.debtInsurance.update({
        where: { id: insuranceId },
        data: { ...dto },
      });
      return {
        result: updated,
        event: {
          aggregateType: 'debt',
          aggregateId: current.debtId,
          eventType: DomainEventType.DebtUpdated,
          payload: { userId, op: 'insurance_update' },
        },
      };
    });
  }

  /** FIN-023 (DEC-0023 §5.1): una cuota de manejo es un cargo del banco, no una
   *  póliza — el endoso y la aseguradora no tienen sentido y se rechazan. */
  private validateChargeSemantics(
    kind: string | undefined,
    endorsed: boolean | undefined,
    insurer: string | null | undefined,
  ) {
    if (kind !== 'cuota_manejo') return;
    if (endorsed) {
      throw new BadRequestException('Una cuota de manejo no es endosable (no es una póliza)');
    }
    if (insurer) {
      throw new BadRequestException('Una cuota de manejo no tiene aseguradora');
    }
  }

  async remove(userId: string, insuranceId: string) {
    const current = await this.ensureInsuranceOwned(userId, insuranceId);
    await this.outbox.withEvent(async (tx) => {
      const updated = await tx.debtInsurance.update({
        where: { id: insuranceId },
        data: { deletedAt: new Date() },
      });
      return {
        result: updated,
        event: {
          aggregateType: 'debt',
          aggregateId: current.debtId,
          eventType: DomainEventType.DebtUpdated,
          payload: { userId, op: 'insurance_remove' },
        },
      };
    });
    return { deleted: true };
  }

  /**
   * Desglose de la cuota real para el DISPLAY del detalle. Delegado al util
   * puro único (FIN-023): mismo cálculo que la fuente de "lo comprometido".
   */
  paymentBreakdown(monthlyPayment: number, insurances: BreakdownCharge[]) {
    return paymentBreakdown(monthlyPayment, insurances);
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
