import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDeductionDto,
  CreateIncomeSourceDto,
  DeductionBaseDto,
  SetIncomeProfileDto,
  UpdateDeductionDto,
  UpdateIncomeSourceDto,
} from './dto/income.dto';

/** FIN-027 · CRUD del perfil laboral, fuentes de ingreso y deducciones. */
@Injectable()
export class IncomeService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    return this.prisma.incomeProfile.findUnique({ where: { userId } });
  }

  async setProfile(userId: string, dto: SetIncomeProfileDto) {
    return this.prisma.incomeProfile.upsert({
      where: { userId },
      create: { userId, workProfile: dto.workProfile },
      update: { workProfile: dto.workProfile },
    });
  }

  async listSources(userId: string) {
    return this.prisma.incomeSource.findMany({
      where: { userId, deletedAt: null },
      include: { deductions: { where: { deletedAt: null } } },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createSource(userId: string, dto: CreateIncomeSourceDto) {
    return this.prisma.incomeSource.create({
      data: {
        userId,
        kind: dto.kind ?? 'otro',
        name: dto.name,
        amount: dto.amount,
        isVariable: dto.isVariable ?? false,
        dayOfMonth: dto.dayOfMonth ?? null,
      },
    });
  }

  async updateSource(userId: string, id: string, dto: UpdateIncomeSourceDto) {
    await this.ensureSourceOwned(userId, id);
    return this.prisma.incomeSource.update({ where: { id }, data: { ...dto } });
  }

  async removeSource(userId: string, id: string) {
    await this.ensureSourceOwned(userId, id);
    await this.prisma.incomeSource.update({ where: { id }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }

  async createDeduction(userId: string, sourceId: string, dto: CreateDeductionDto) {
    await this.ensureSourceOwned(userId, sourceId);
    this.validateDeductionShape(dto);
    return this.prisma.deduction.create({
      data: {
        incomeSourceId: sourceId,
        kind: dto.kind ?? 'otra',
        name: dto.name,
        percent: dto.percent ?? null,
        fixedAmount: dto.fixedAmount ?? null,
        base: dto.base ?? 'total',
        baseAmount: dto.baseAmount ?? null,
        withheldAtSource: dto.withheldAtSource ?? true,
      },
    });
  }

  async updateDeduction(userId: string, id: string, dto: UpdateDeductionDto) {
    const current = await this.ensureDeductionOwned(userId, id);
    this.validateDeductionShape({
      percent: dto.percent ?? (current.percent ? Number(current.percent) : undefined),
      fixedAmount: dto.fixedAmount ?? (current.fixedAmount ? Number(current.fixedAmount) : undefined),
      base: (dto.base ?? current.base) as DeductionBaseDto,
      baseAmount: dto.baseAmount ?? (current.baseAmount ? Number(current.baseAmount) : undefined),
    } as CreateDeductionDto);
    return this.prisma.deduction.update({ where: { id }, data: { ...dto } });
  }

  async removeDeduction(userId: string, id: string) {
    await this.ensureDeductionOwned(userId, id);
    await this.prisma.deduction.update({ where: { id }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }

  /** Requisito duro: percent XOR fixedAmount; base=parcial exige baseAmount. */
  private validateDeductionShape(dto: Pick<CreateDeductionDto, 'percent' | 'fixedAmount' | 'base' | 'baseAmount'>) {
    const hasPercent = dto.percent != null;
    const hasFixed = dto.fixedAmount != null;
    if (hasPercent === hasFixed) {
      throw new BadRequestException('La deducción debe tener percent O fixedAmount (no ambos, no ninguno)');
    }
    if (dto.base === 'parcial' && dto.baseAmount == null) {
      throw new BadRequestException('Una base parcial requiere baseAmount');
    }
  }

  private async ensureSourceOwned(userId: string, id: string) {
    const s = await this.prisma.incomeSource.findFirst({ where: { id, userId, deletedAt: null } });
    if (!s) throw new NotFoundException('Fuente de ingreso no encontrada');
    return s;
  }

  private async ensureDeductionOwned(userId: string, id: string) {
    const d = await this.prisma.deduction.findFirst({
      where: { id, deletedAt: null, incomeSource: { userId, deletedAt: null } },
    });
    if (!d) throw new NotFoundException('Deducción no encontrada');
    return d;
  }
}
