import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AmortizationService } from '../finance/amortization/amortization.service';
import {
  AmortizationResult,
} from '../finance/amortization/amortization.types';
import { RemindersService } from '../reminders/reminders.service';
import { OutboxService } from '../events/outbox.service';
import { DomainEventType } from '../events/domain-events';
import { SimulationsService } from '../simulations/simulations.service';
import { DebtOutlayService } from './debt-outlay.service';
import { debtToAmortizationInput } from './debt-amortization.mapper';
import { overdueDays } from './overdue.util';
import { DebtInsuranceService } from './debt-insurance.service';
import { CreateDebtDto, UpdateDebtDto } from './dto/debt.dto';
import { descriptorFor, productCatalog, scheduleModelFor } from './product-type.descriptor';
import { DepthReadingService } from './depth-reading.service';

@Injectable()
export class DebtsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly amortization: AmortizationService,
    private readonly reminders: RemindersService,
    private readonly outbox: OutboxService,
    private readonly insurance: DebtInsuranceService,
    private readonly simulations: SimulationsService,
    private readonly debtOutlay: DebtOutlayService,
    private readonly depthReadings: DepthReadingService,
  ) {}

  async create(userId: string, dto: CreateDebtDto) {
    const model = scheduleModelFor(dto.debtType);
    const schedule = this.computeSchedule(dto);
    const nextDue = schedule.entries[0]?.dueDate ?? null;
    // FIN-032: la cuota mensual (monthlyPayment = "lo comprometido") por modelo,
    // sin ramificar por tipo:
    //  - amortizado            → la cuota del plan de contrato;
    //  - saldo_y_cuota_pactada → la cuota pactada que declara el usuario (informal);
    //  - cuotas_por_compra     → null (se DERIVA de las compras — FIN-031).
    const monthlyPayment =
      model === 'amortizado' ? schedule.monthlyPayment
      : model === 'saldo_y_cuota_pactada' ? (dto.monthlyPayment ?? null)
      : null;

    // Deuda + evento de dominio en la misma transacción (patrón outbox, FIN-002).
    const debt = await this.outbox.withEvent(async (tx) => {
      const created = await tx.debt.create({
        data: {
          userId,
          entityId: dto.entityId ?? null,
          name: dto.name,
          debtType: dto.debtType,
          currency: dto.currency ?? 'COP',
          originalAmount: dto.originalAmount,
          currentBalance: dto.currentBalance,
          startDate: new Date(dto.startDate),
          termMonths: dto.termMonths ?? null,
          interestRate: dto.interestRate ?? 0,
          rateBasis: dto.rateBasis ?? 'EA',
          rateKind: dto.rateKind ?? 'fija',
          amortSystem: dto.amortSystem ?? 'frances',
          monthlyPayment,
          // FIN-031: cupo de la tarjeta (solo tarjetas con cupo; null para el resto).
          creditLimit: dto.creditLimit ?? null,
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
      return {
        result: created,
        event: {
          aggregateType: 'debt',
          aggregateId: created.id,
          eventType: DomainEventType.DebtCreated,
          payload: { userId, currentBalance: Number(created.currentBalance) },
        },
      };
    });
    // Recordatorio automático de la cuota (push + WhatsApp).
    await this.reminders.ensureDebtReminder(userId, debt);
    return { debt, projection: this.summary(schedule) };
  }

  async findAll(userId: string) {
    const debts = await this.prisma.debt.findMany({
      where: { userId, deletedAt: null },
      orderBy: { nextDueDate: 'asc' },
    });
    if (debts.length === 0) return debts;

    // Proyección agregada (intereses, total a pagar, nº de cuotas, fecha fin) en
    // una sola consulta sobre la tabla de amortización, sin recalcular el plan.
    const grouped = await this.prisma.amortizationEntry.groupBy({
      by: ['debtId'],
      where: { debtId: { in: debts.map((d) => d.id) } },
      _sum: { interestPart: true, payment: true },
      _count: { _all: true },
      _max: { dueDate: true },
    });
    const byDebt = new Map(grouped.map((g) => [g.debtId, g]));

    return debts.map((d) => {
      const g = byDebt.get(d.id);
      const descriptor = descriptorFor(d.debtType);
      return {
        ...d,
        // FIN-032: modelo/capacidades del tipo (una sola autoridad).
        scheduleModel: descriptor.scheduleModel,
        capabilities: descriptor.capabilities,
        // FIN-024 P2: estado de mora derivado en lectura (null = al día).
        overdueDays: overdueDays(d.nextDueDate),
        projection: {
          totalInterest: Number(g?._sum.interestPart ?? 0),
          totalPaid: Number(g?._sum.payment ?? 0),
          numberOfPayments: g?._count._all ?? 0,
          payoffDate: g?._max.dueDate ?? null,
        },
      };
    });
  }

  async findOne(userId: string, id: string) {
    const debt = await this.prisma.debt.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        amortization: { orderBy: { periodNo: 'asc' } },
        // FIN-013: seguros activos para el desglose de cuota real (solo display).
        insurances: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!debt) throw new NotFoundException('Deuda no encontrada');
    const descriptor = descriptorFor(debt.debtType);
    return {
      ...debt,
      // FIN-032: el frontend decide qué secciones muestra por MODELO, no por tipo.
      scheduleModel: descriptor.scheduleModel,
      capabilities: descriptor.capabilities,
      // FIN-037: lecturas de profundidad (única autoridad; la UI solo renderiza).
      depthReadings: await this.depthReadings.forDebt(userId, debt),
      // FIN-024 P2: para el bloque de conciliación del detalle.
      overdueDays: overdueDays(debt.nextDueDate),
      projection: this.projectionFromEntries(debt.amortization),
      // Desglose de cuota real con seguros (FIN-013, solo display).
      paymentBreakdown: this.insurance.paymentBreakdown(
        Number(debt.monthlyPayment ?? 0),
        debt.insurances,
      ),
    };
  }

  /** FIN-032: el catálogo de tipos (guardarraíl A/B) que alimenta el alta del frontend. */
  catalog() {
    return productCatalog();
  }

  /** Proyección (intereses, total, cuotas, fecha fin) a partir de la tabla guardada. */
  private projectionFromEntries(
    entries: { interestPart: unknown; payment: unknown; dueDate: Date }[],
  ) {
    let totalInterest = 0;
    let totalPaid = 0;
    let payoffDate: Date | null = null;
    for (const e of entries) {
      totalInterest += Number(e.interestPart);
      totalPaid += Number(e.payment);
      if (!payoffDate || e.dueDate > payoffDate) payoffDate = e.dueDate;
    }
    return {
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      numberOfPayments: entries.length,
      payoffDate,
    };
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

    // FIN-023 P4: el desembolso real agregado (línea condicional del hero).
    const outlays = await this.debtOutlay.outlaysByUser(userId);

    // FIN-022 P2: orden de ataque DEL MOTOR (gate a 2+ deudas — DEC-0022 §5.4;
    // el propio strategyOverview re-verifica y decide omitirse, §29.1).
    const overview = debts.length > 1 ? await this.simulations.strategyOverview(userId) : null;
    const byId = new Map(debts.map((d) => [d.id, d]));
    const strategy = overview
      ? {
          recommended: overview.recommended,
          interestDifference: overview.interestDifference,
          months: overview.months,
          attackOrder: overview.attackOrder
            .filter((id) => byId.has(id))
            .map((id) => {
              const d = byId.get(id)!;
              return {
                debtId: d.id,
                name: d.name,
                ratePct: Number(d.interestRate),
                rateBasis: d.rateBasis,
                balance: Number(d.currentBalance),
              };
            }),
        }
      : null;

    return {
      strategy,
      debtsCount: debts.length,
      totalDebt: Math.round(totalDebt * 100) / 100,
      monthlyPaymentsTotal: Math.round(monthlyTotal * 100) / 100,
      // FIN-023: con seguros/cargos aparte; igual a monthlyPaymentsTotal si no hay.
      totalMonthlyOutlay: outlays.totalOutlay,
      upcoming: debts
        .filter((d) => d.nextDueDate)
        .sort((a, b) => (a.nextDueDate! > b.nextDueDate! ? 1 : -1))
        .slice(0, 5)
        .map((d) => ({
          debtId: d.id,
          name: d.name,
          dueDate: d.nextDueDate,
          amount: Number(d.monthlyPayment ?? 0),
          // FIN-024 P2: mismo helper único (§32) también en el summary.
          overdueDays: overdueDays(d.nextDueDate),
        })),
    };
  }

  private computeSchedule(dto: CreateDebtDto): AmortizationResult {
    // FIN-032: solo el modelo `amortizado` tiene un plan de contrato. La tarjeta
    // (`cuotas_por_compra`, saldo/cuota DERIVADOS de las compras — FIN-031) y el
    // informal (`saldo_y_cuota_pactada`, cuota pactada + saldo por pagos, SIN fecha
    // de libertad falsa — §29.2) se crean sin tabla de amortización. El despacho es
    // por `scheduleModel`, nunca por `debtType` (§32).
    if (scheduleModelFor(dto.debtType) !== 'amortizado') {
      return {
        monthlyRate: 0,
        monthlyPayment: 0,
        numberOfPayments: 0,
        totalInterest: 0,
        totalPaid: 0,
        payoffDate: dto.startDate,
        entries: [],
      };
    }
    if (!dto.termMonths || dto.termMonths <= 0) {
      throw new BadRequestException('Este producto necesita un plazo (número de cuotas) para calcular tu plan.');
    }
    const input = debtToAmortizationInput({
      currentBalance: dto.currentBalance,
      interestRate: dto.interestRate ?? 0,
      rateBasis: dto.rateBasis ?? 'EA',
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
