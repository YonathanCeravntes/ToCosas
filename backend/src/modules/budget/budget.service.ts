import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OutboxService } from '../events/outbox.service';
import { DomainEventType } from '../events/domain-events';
import { CreateFixedItemDto, UpdateFixedItemDto } from './dto/fixed-item.dto';
import { DebtOutlayService } from '../debts/debt-outlay.service';
import { NetIncomeService } from '../income/net-income.service';
import { clampCycleDay, financialPeriod } from './financial-period.util';
import { SpendableService } from './spendable.service';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class BudgetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly spendable: SpendableService,
    private readonly debtOutlay: DebtOutlayService,
    // FIN-027 (DEC-0027 §5.2): el ingreso vive en el modelo de fuentes — sin
    // coexistencia con FixedItem.
    private readonly netIncome: NetIncomeService,
  ) {}

  async create(userId: string, dto: CreateFixedItemDto) {
    // FIN-027 (DEC-0027 §5.2): el ingreso ya no se declara como FixedItem — se
    // configura en "Mi perfil de ingresos" (fuentes + deducciones). Sin esto,
    // un alta aquí crearía un FixedItem-ingreso que NINGÚN consumidor lee (el
    // §32 exige un solo camino, no dos que uno quede mudo).
    if (dto.kind === 'ingreso') {
      throw new BadRequestException(
        'Los ingresos se configuran en tu perfil de ingresos (Ajustes → Mi perfil de ingresos), no aquí.',
      );
    }
    // Compromiso fijo + evento de dominio en la misma transacción (outbox, FIN-002).
    return this.outbox.withEvent(async (tx) => {
      const item = await tx.fixedItem.create({
        data: {
          userId,
          kind: dto.kind,
          name: dto.name,
          amount: dto.amount,
          currency: dto.currency ?? 'COP',
          dayOfMonth: dto.dayOfMonth ?? null,
          categoryId: dto.categoryId ?? null,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          notes: dto.notes ?? null,
        },
      });
      return {
        result: item,
        event: {
          aggregateType: 'fixed_item',
          aggregateId: item.id,
          eventType: DomainEventType.FixedItemChanged,
          payload: { userId, kind: item.kind, op: 'create' },
        },
      };
    });
  }

  async findAll(userId: string) {
    return this.prisma.fixedItem.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ kind: 'asc' }, { amount: 'desc' }],
    });
  }

  async update(userId: string, id: string, dto: UpdateFixedItemDto) {
    await this.ensureOwned(userId, id);
    return this.prisma.fixedItem.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.ensureOwned(userId, id);
    await this.prisma.fixedItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  /**
   * Presupuesto mensual: cuánto le queda al usuario tras cubrir sus compromisos
   * inflexibles. Las cuotas de deuda se suman automáticamente desde el modelo
   * Debt (no se duplican en fixed_items).
   *
   *   disponible = ingresos fijos − gastos fijos − cuotas de deuda
   */
  async monthlySummary(userId: string) {
    const [fixedItems, debts, settings, teQueda, outlays, income, sources] = await Promise.all([
      this.prisma.fixedItem.findMany({
        where: { userId, deletedAt: null, isActive: true },
      }),
      this.prisma.debt.findMany({
        where: { userId, deletedAt: null, status: 'activa' },
      }),
      this.prisma.userSettings.findUnique({ where: { userId } }),
      // FIN-020: "Te queda" oficial — misma fuente que el Inicio (§32).
      this.spendable.compute(userId),
      // FIN-023: lo comprometido con deudas = desembolso REAL (fuente única).
      this.debtOutlay.outlaysByUser(userId),
      // FIN-027 (§32): el ingreso fijo es el NETO de la fuente única.
      this.netIncome.compute(userId),
      this.prisma.incomeSource.findMany({
        where: { userId, deletedAt: null, isActive: true, isVariable: false },
      }),
    ]);
    // FIN-016: ciclo financiero activo (con día 1 = mes calendario, sin cambio).
    const period = financialPeriod(new Date(), settings?.cycleStartDay ?? 1);

    const fixedIncome = income.netFixedTotal;
    const fixedExpense = fixedItems
      .filter((i) => i.kind === 'gasto')
      .reduce((acc, i) => acc + Number(i.amount), 0);
    const debtPayments = outlays.totalOutlay;
    // Para el copy condicional de la casa de cuotas ("incluye seguros y cargos").
    const debtChargesSeparate = round2(
      [...outlays.byDebt.values()].reduce((acc, o) => acc + o.separate, 0),
    );

    const committed = fixedExpense + debtPayments;
    const available = fixedIncome - committed;

    return {
      period: {
        start: period.start.toISOString(),
        end: period.end.toISOString(),
        label: period.label,
        cycleStartDay: settings?.cycleStartDay ?? 1,
      },
      // FIN-020: LA definición oficial de "Te queda" (Alt A). `available` (abajo)
      // es el balance ESTRUCTURAL fijos-vs-fijos y no puede etiquetarse "te queda".
      teQueda,
      fixedIncome: round2(fixedIncome),
      fixedExpense: round2(fixedExpense),
      debtPayments: round2(debtPayments),
      debtChargesSeparate,
      committed: round2(committed),
      available: round2(available),
      // Porcentaje del ingreso comprometido en gastos inflexibles (0 si no hay ingreso).
      committedRatio: fixedIncome > 0 ? round2((committed / fixedIncome) * 100) : 0,
      debts: debts.map((d) => ({
        debtId: d.id,
        name: d.name,
        // FIN-023: desembolso real por deuda (cuota si no hay cargos aparte).
        amount: outlays.byDebt.get(d.id)?.outlay ?? Number(d.monthlyPayment ?? 0),
        nextDueDate: d.nextDueDate,
      })),
      expenses: fixedItems
        .filter((i) => i.kind === 'gasto')
        .map((i) => ({ id: i.id, name: i.name, amount: Number(i.amount), dayOfMonth: i.dayOfMonth })),
      // FIN-027 (§32): las fuentes de ingreso FIJAS reemplazan al FixedItem
      // legado (migrado); las variables no aparecen aquí (no son "fijas").
      incomes: sources.map((s) => ({
        id: s.id,
        name: s.name,
        amount: Number(s.amount),
        dayOfMonth: s.dayOfMonth,
      })),
    };
  }

  /** FIN-016: fija el día de inicio del ciclo (1–28, validado también por CHECK en BD). */
  async setCycleStartDay(userId: string, day: number) {
    const clamped = clampCycleDay(day);
    const settings = await this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, cycleStartDay: clamped },
      update: { cycleStartDay: clamped },
    });
    return { cycleStartDay: settings.cycleStartDay };
  }

  private async ensureOwned(userId: string, id: string) {
    const item = await this.prisma.fixedItem.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Compromiso fijo no encontrado');
    return item;
  }
}
