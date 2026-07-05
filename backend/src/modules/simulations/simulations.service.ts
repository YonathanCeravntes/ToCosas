import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { computeNetWorth } from '../accounts/networth.util';
import { MetricKey } from '../financial-engine/engine.constants';
import { monthStart } from '../financial-engine/metrics/series.util';
import { RateBasis } from '../finance/amortization/amortization.types';
import {
  FinancialState,
  project,
  ScenarioParams,
  SimulationResult,
} from './simulation-engine';

/**
 * Simulaciones (FIN-007). Carga la foto REAL del usuario, delega en el motor
 * puro y persiste solo el registro `Simulation` (cero escritura en las
 * finanzas/series reales — criterio de aceptación §13 del ARQ).
 */
@Injectable()
export class SimulationsService {
  private readonly logger = new Logger(SimulationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async run(
    userId: string,
    params: ScenarioParams,
    source: 'app' | 'copilot' = 'app',
  ): Promise<SimulationResult> {
    // FIN-009 (DEC-0009 §4.7): cuota free de 5 simulaciones/mes, sin grandfathering.
    const quota = await this.entitlements.simulationQuota(userId);
    if (!quota.allowed) {
      this.logger.log(`[funnel] upgrade_intent user=${userId} source=simulations_limit`);
      throw new ForbiddenException({
        code: 'PREMIUM_REQUIRED',
        message: `Alcanzaste tus ${quota.limit} simulaciones del mes. Con Millo+ son ilimitadas.`,
      });
    }
    this.validate(params);
    const state = await this.loadState(userId);
    const result = project(state, params);

    await this.prisma.simulation.create({
      data: {
        userId,
        type: params.type,
        params: params as unknown as Prisma.InputJsonValue,
        result: result as unknown as Prisma.InputJsonValue,
        source,
      },
    });
    return result;
  }

  /** Proyección sin persistir (uso interno del motor de recomendaciones). */
  async projectOnly(userId: string, params: ScenarioParams): Promise<SimulationResult> {
    return project(await this.loadState(userId), params);
  }

  async history(userId: string) {
    return this.prisma.simulation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /** Resuelve "deuda #N" → id real (para la tool del Copiloto, en servidor). */
  async resolveDebtRef(userId: string, ref: string): Promise<string> {
    const match = /#(\d+)/.exec(ref);
    if (!match) throw new BadRequestException('Referencia de deuda inválida');
    const idx = parseInt(match[1], 10) - 1;
    const debts = await this.prisma.debt.findMany({
      where: { userId, deletedAt: null, status: 'activa' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (idx < 0 || idx >= debts.length) {
      throw new BadRequestException('Esa deuda no existe');
    }
    return debts[idx].id;
  }

  async loadState(userId: string): Promise<FinancialState> {
    const from = monthStart(new Date());
    const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
    const [txByKind, fixedItems, debts, accounts, assets, trend] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['kind'],
        where: { userId, deletedAt: null, occurredAt: { gte: from, lt: to } },
        _sum: { amount: true },
      }),
      this.prisma.fixedItem.findMany({ where: { userId, deletedAt: null, isActive: true } }),
      this.prisma.debt.findMany({
        where: { userId, deletedAt: null, status: 'activa' },
        orderBy: { createdAt: 'asc' },
        include: {
          amortization: { where: { paidAt: null }, orderBy: { periodNo: 'asc' }, select: { periodNo: true }, take: 1 },
          _count: { select: { amortization: true } },
        },
      }),
      this.prisma.account.findMany({ where: { userId, deletedAt: null, archivedAt: null } }),
      this.prisma.asset.findMany({ where: { userId, deletedAt: null } }),
      this.prisma.metricReading.findFirst({
        where: { userId, metricKey: MetricKey.TrendNetWorth, period: 'month', capturedAt: from },
      }),
    ]);

    const sumKind = (k: string) => Number(txByKind.find((t) => t.kind === k)?._sum.amount ?? 0);
    const nw = computeNetWorth(
      accounts.map((a) => ({
        currentBalance: Number(a.currentBalance),
        isLiquid: a.isLiquid,
        includeInNetWorth: a.includeInNetWorth,
        isEmergencyFund: a.isEmergencyFund,
      })),
      assets.map((a) => ({ currentValue: Number(a.currentValue), includeInNetWorth: a.includeInNetWorth })),
      0,
    );

    return {
      income: sumKind('ingreso'),
      expense: sumKind('gasto'),
      debtPayments: sumKind('pago_deuda'),
      fixedIncome: fixedItems.filter((i) => i.kind === 'ingreso').reduce((a, i) => a + Number(i.amount), 0),
      fixedExpense: fixedItems.filter((i) => i.kind === 'gasto').reduce((a, i) => a + Number(i.amount), 0),
      debts: debts.map((d, i) => ({
        id: d.id,
        ref: `deuda #${i + 1} (${d.debtType})`,
        type: d.debtType,
        balance: Number(d.currentBalance),
        ratePct: Number(d.interestRate),
        rateBasis: d.rateBasis as RateBasis,
        monthlyPayment: Number(d.monthlyPayment ?? 0),
        remainingMonths: Math.max(
          1,
          (d._count.amortization ?? d.termMonths ?? 12) - ((d.amortization[0]?.periodNo ?? 1) - 1),
        ),
      })),
      liquidBalance: nw.totalLiquid,
      emergencyBalance: nw.totalEmergencyFund,
      assetsOnly: nw.totalAssetsOnly,
      netWorthTrend: trend ? Number(trend.value) : null,
    };
  }

  private validate(params: ScenarioParams): void {
    const positive: Array<[string, number | undefined]> = [];
    switch (params.type) {
      case 'abono_extra':
        positive.push(['extraMonthly', params.extraMonthly]);
        break;
      case 'nueva_deuda':
        positive.push(['amount', params.amount], ['termMonths', params.termMonths], ['ratePct', params.ratePct]);
        break;
      case 'reducir_gastos':
        positive.push(['monthlyAmount', params.monthlyAmount]);
        break;
      case 'cambio_ingreso':
        positive.push(['newMonthlyIncome', params.newMonthlyIncome]);
        break;
      case 'estrategia_deudas':
        if (params.extraBudget < 0) throw new BadRequestException('extraBudget no puede ser negativo');
        break;
      case 'vender_activo':
        positive.push(['assetValue', params.assetValue], ['salePrice', params.salePrice]);
        break;
      case 'refinanciar':
        positive.push(['newRatePct', params.newRatePct], ['newTermMonths', params.newTermMonths]);
        break;
    }
    for (const [name, value] of positive) {
      if (typeof value !== 'number' || !isFinite(value) || value <= 0) {
        throw new BadRequestException(`Parámetro inválido: ${name}`);
      }
    }
  }
}
