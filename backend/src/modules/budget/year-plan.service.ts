import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isSalaryCategory } from './income-split.util';
import type { TeQueda } from './spendable.service';
import {
  CESANTIAS_INTEREST,
  incomeKindOf,
  IncomeKind,
  monthlySetAside,
  monthsUntil,
  stableVariableIncome,
  WINDFALL_KINDS,
  WindfallKind,
  windfallView,
  WindfallView,
} from './year-plan.util';

/**
 * FIN-061 Fase 2.5 · Plata del año: gastos grandes, ingreso irregular, primas y su
 * reparto. Fuente única para el margen estable del plan (CashflowPlanService) y para
 * la pantalla "Plata extra del año" (§32).
 */
@Injectable()
export class YearPlanService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Gastos grandes del año ----------

  async listAnnual(userId: string, now: Date = new Date()) {
    const rows = await this.prisma.annualExpense.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ month: 'asc' }, { createdAt: 'asc' }],
    });
    const items = rows.map((r) => ({
      id: r.id,
      name: r.name,
      amount: Number(r.amount),
      month: r.month,
      monthsLeft: monthsUntil(r.month, now),
      monthly: monthlySetAside(Number(r.amount), r.month, now),
    }));
    return { items, monthlyTotal: items.reduce((a, i) => a + i.monthly, 0) };
  }

  async createAnnual(userId: string, dto: { name: string; amount: number; month: number }) {
    this.validateMonth(dto.month);
    return this.prisma.annualExpense.create({ data: { userId, name: dto.name.trim(), amount: dto.amount, month: dto.month } });
  }

  async updateAnnual(userId: string, id: string, dto: { name?: string; amount?: number; month?: number }) {
    await this.ensureAnnual(userId, id);
    if (dto.month !== undefined) this.validateMonth(dto.month);
    return this.prisma.annualExpense.update({
      where: { id },
      data: { ...(dto.name ? { name: dto.name.trim() } : {}), ...(dto.amount ? { amount: dto.amount } : {}), ...(dto.month ? { month: dto.month } : {}) },
    });
  }

  async removeAnnual(userId: string, id: string) {
    await this.ensureAnnual(userId, id);
    await this.prisma.annualExpense.update({ where: { id }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }

  // ---------- Ingreso estable (irregular → mes flojo) ----------

  /**
   * Ingreso del mes para el margen estable: la parte fija de "Te queda" + la parte
   * variable del mes flojo de los últimos 6 meses (percentil 25), nunca más que lo
   * estimado hoy. Primas y plata única no entran (no son "extra" del día a día: se
   * planean aparte).
   */
  async stableIncome(userId: string, teQueda: Pick<TeQueda, 'incomeFixedBase' | 'incomeVariableBase'>, now: Date = new Date()) {
    if (teQueda.incomeVariableBase <= 0) {
      return { amount: teQueda.incomeFixedBase, variable: { amount: 0, source: 'estimado' as const } };
    }
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, 1));
    const txs = await this.prisma.transaction.findMany({
      where: { userId, deletedAt: null, kind: 'ingreso', occurredAt: { gte: from, lt: to } },
      select: { amount: true, occurredAt: true, category: { select: { name: true } } },
    });
    const first = txs.reduce<Date | null>((a, t) => (!a || t.occurredAt < a ? t.occurredAt : a), null);
    const months: number[] = [];
    for (let i = 6; i >= 1; i--) {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1));
      // Solo desde el primer mes con ingresos registrados (antes la persona no usaba Millo).
      if (!first || end <= new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1))) continue;
      months.push(
        txs
          .filter((t) => t.occurredAt >= start && t.occurredAt < end && t.category && !isSalaryCategory(t.category.name))
          .reduce((a, t) => a + Number(t.amount), 0),
      );
    }
    const variable = stableVariableIncome(teQueda.incomeVariableBase, months);
    return { amount: Math.round(teQueda.incomeFixedBase + variable.amount), variable };
  }

  // ---------- Plata extra: primas e intereses de cesantías ----------

  async windfalls(userId: string, now: Date = new Date()): Promise<WindfallView[]> {
    const [sources, assets, plans] = await Promise.all([
      this.prisma.incomeSource.findMany({ where: { userId, deletedAt: null, isActive: true } }),
      this.prisma.asset.findMany({ where: { userId, deletedAt: null, type: 'cesantias' } }),
      this.prisma.windfallPlan.findMany({ where: { userId } }),
    ]);
    // Prima de servicios = medio salario en junio y otro medio en diciembre.
    const salary = sources.filter((s) => s.receivesPrima).reduce((a, s) => a + Number(s.amount), 0);
    const cesantias = assets.reduce((a, x) => a + Number(x.currentValue), 0);
    const estimate: Record<WindfallKind, number | null> = {
      prima_junio: salary > 0 ? salary / 2 : null,
      prima_diciembre: salary > 0 ? salary / 2 : null,
      intereses_cesantias: cesantias > 0 ? cesantias * CESANTIAS_INTEREST : null,
    };
    const byKind = new Map(plans.map((p) => [p.kind, p]));
    return WINDFALL_KINDS.map((k) => windfallView(k, estimate[k], byKind.get(k) ?? null, now)).sort((a, b) => a.daysLeft - b.daysLeft);
  }

  async setWindfall(userId: string, kind: string, dto: { debtPct: number; cushionPct: number; freePct: number }) {
    if (!(WINDFALL_KINDS as readonly string[]).includes(kind)) throw new NotFoundException('Tipo de plata extra no válido');
    if (dto.debtPct + dto.cushionPct + dto.freePct !== 100) throw new BadRequestException('Las tres partes deben sumar 100 %.');
    await this.prisma.windfallPlan.upsert({
      where: { userId_kind: { userId, kind } },
      create: { userId, kind, ...dto },
      update: dto,
    });
    return (await this.windfalls(userId)).find((w) => w.kind === kind)!;
  }

  // ---------- Cómo le llega la plata ----------

  /**
   * `onlyIncomeOfHousehold` lo dice la persona (Millo no lo puede saber: estar sola en
   * la app no significa ser el único ingreso de la casa).
   */
  async incomeKind(userId: string, onlyIncomeOfHousehold = false): Promise<{ kind: IncomeKind; onlyIncomeOfHousehold: boolean }> {
    const [sources, profile] = await Promise.all([
      this.prisma.incomeSource.findMany({ where: { userId, deletedAt: null, isActive: true } }),
      this.prisma.incomeProfile.findUnique({ where: { userId } }),
    ]);
    return {
      kind: incomeKindOf(
        sources.map((s) => ({ kind: s.kind, isVariable: s.isVariable, receivesPrima: s.receivesPrima, amount: Number(s.amount) })),
        profile?.workProfile ?? null,
      ),
      onlyIncomeOfHousehold,
    };
  }

  private validateMonth(m: number) {
    if (!Number.isInteger(m) || m < 1 || m > 12) throw new BadRequestException('El mes debe estar entre 1 y 12.');
  }

  private async ensureAnnual(userId: string, id: string) {
    const r = await this.prisma.annualExpense.findFirst({ where: { id, userId, deletedAt: null } });
    if (!r) throw new NotFoundException('Gasto no encontrado');
    return r;
  }
}
