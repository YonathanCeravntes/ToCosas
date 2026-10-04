import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DebtOutlayService } from '../debts/debt-outlay.service';
import { NetIncomeService } from '../income/net-income.service';
import { financialPeriod } from '../budget/financial-period.util';
import { fairShare, inviteCode } from './household.util';

const round2 = (n: number) => Math.round(n * 100) / 100;
const INVITE_DAYS = 7;
const MAX_MEMBERS = 2;

const firstName = (full: string | null | undefined) => (full ?? '').trim().split(/\s+/)[0] || 'Tu pareja';

/**
 * FIN-059 · Millo en pareja (Fundador, 2026-10-03, "Aprobado. Darle, de una").
 *
 * "Tuyo, mío y nuestro": cada uno conserva su Millo privado; el hogar solo ve lo que cada
 * uno marca como de la casa (movimientos, gastos fijos, deudas) y las metas juntos. Reglas
 * que no se negocian (Ley 1257 — violencia económica; Ley 1581 — consentimiento):
 *  - Lo personal nunca se comparte en detalle. Del ingreso solo viaja la PROPORCIÓN, y solo
 *    si la persona lo activa; de las deudas personales, solo totales y solo si lo activa.
 *  - Cada uno acepta por separado y puede salir solo, sin permiso del otro.
 *  - "Nuestro mes" usa el mes calendario para que los dos vean lo mismo.
 */
@Injectable()
export class HouseholdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly debtOutlay: DebtOutlayService,
    private readonly netIncome: NetIncomeService,
  ) {}

  // -------------------------------------------------------------------------
  // Pertenencia
  // -------------------------------------------------------------------------

  private async membership(userId: string) {
    return this.prisma.householdMember.findFirst({
      where: { userId, leftAt: null, household: { deletedAt: null } },
      include: { household: true },
    });
  }

  /** El id del hogar activo de la persona, o null. Lo usan Registrar, gastos fijos y el bot. */
  async activeHouseholdId(userId: string): Promise<string | null> {
    return (await this.membership(userId))?.householdId ?? null;
  }

  private async requireMembership(userId: string) {
    const m = await this.membership(userId);
    if (!m) throw new NotFoundException('No estás en Millo en pareja.');
    return m;
  }

  private async activeMembers(householdId: string) {
    return this.prisma.householdMember.findMany({
      where: { householdId, leftAt: null },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async state(userId: string) {
    const m = await this.membership(userId);
    if (!m) return { household: null };
    const [members, invite] = await Promise.all([
      this.activeMembers(m.householdId),
      this.prisma.householdInvite.findFirst({
        where: { householdId: m.householdId, usedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const partner = members.find((x) => x.userId !== userId) ?? null;
    return {
      household: {
        id: m.householdId,
        splitMode: m.household.splitMode,
        monthlyBudget: m.household.monthlyBudget != null ? Number(m.household.monthlyBudget) : null,
        me: { shareIncome: m.shareIncome, shareDebts: m.shareDebts, joinedAt: m.joinedAt.toISOString(), isCreator: m.household.createdById === userId },
        partner: partner ? { name: firstName(partner.user.fullName), joinedAt: partner.joinedAt.toISOString() } : null,
        invite: !partner && invite ? { code: invite.code, expiresAt: invite.expiresAt.toISOString() } : null,
      },
    };
  }

  async create(userId: string, consent: boolean) {
    if (!consent) throw new BadRequestException('Para usar Millo en pareja necesitas aceptar cómo se comparten los datos.');
    if (await this.membership(userId)) throw new ConflictException('Ya estás en Millo en pareja.');
    await this.prisma.$transaction(async (tx) => {
      const h = await tx.household.create({ data: { createdById: userId } });
      await tx.householdMember.create({ data: { householdId: h.id, userId, consentAt: new Date() } });
      await tx.householdInvite.create({ data: { householdId: h.id, createdById: userId, code: await this.freeCode(tx), expiresAt: this.inviteExpiry() } });
    });
    return this.state(userId);
  }

  async newInvite(userId: string) {
    const m = await this.requireMembership(userId);
    const members = await this.activeMembers(m.householdId);
    if (members.length >= MAX_MEMBERS) throw new ConflictException('Tu pareja ya está en el hogar.');
    await this.prisma.householdInvite.updateMany({ where: { householdId: m.householdId, usedAt: null }, data: { expiresAt: new Date() } });
    await this.prisma.householdInvite.create({
      data: { householdId: m.householdId, createdById: userId, code: await this.freeCode(this.prisma), expiresAt: this.inviteExpiry() },
    });
    return this.state(userId);
  }

  async join(userId: string, rawCode: string, consent: boolean) {
    if (!consent) throw new BadRequestException('Para unirte necesitas aceptar cómo se comparten los datos.');
    if (await this.membership(userId)) throw new ConflictException('Ya estás en Millo en pareja. Sal del hogar actual para unirte a otro.');
    const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const invite = await this.prisma.householdInvite.findFirst({
      where: { code, usedAt: null, expiresAt: { gt: new Date() }, household: { deletedAt: null } },
    });
    if (!invite) throw new NotFoundException('Ese código no existe o ya venció. Pídele a tu pareja uno nuevo.');
    if (invite.createdById === userId) throw new BadRequestException('Ese es tu propio código: compártelo con tu pareja.');
    const members = await this.activeMembers(invite.householdId);
    if (members.length >= MAX_MEMBERS) throw new ConflictException('Ese hogar ya tiene dos personas.');
    await this.prisma.$transaction([
      this.prisma.householdMember.create({ data: { householdId: invite.householdId, userId, consentAt: new Date() } }),
      this.prisma.householdInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } }),
    ]);
    return this.state(userId);
  }

  async updateMe(userId: string, dto: { shareIncome?: boolean; shareDebts?: boolean }) {
    const m = await this.requireMembership(userId);
    await this.prisma.householdMember.update({
      where: { id: m.id },
      data: {
        ...(dto.shareIncome !== undefined ? { shareIncome: dto.shareIncome } : {}),
        ...(dto.shareDebts !== undefined ? { shareDebts: dto.shareDebts } : {}),
      },
    });
    return this.state(userId);
  }

  async updateHousehold(userId: string, dto: { splitMode?: 'proporcional' | 'mitad'; monthlyBudget?: number | null }) {
    const m = await this.requireMembership(userId);
    await this.prisma.household.update({
      where: { id: m.householdId },
      data: {
        ...(dto.splitMode ? { splitMode: dto.splitMode } : {}),
        ...(dto.monthlyBudget !== undefined ? { monthlyBudget: dto.monthlyBudget && dto.monthlyBudget > 0 ? dto.monthlyBudget : null } : {}),
      },
    });
    return this.state(userId);
  }

  /**
   * Salir es un toque y no necesita permiso del otro (Ley 1257). Lo propio deja de contar en
   * el hogar (sus gastos fijos y deudas de la casa vuelven a ser solo suyos); el historial de
   * movimientos queda, pero "Nuestro mes" ya no lo suma. Si no queda nadie, el hogar se cierra.
   */
  async leave(userId: string) {
    const m = await this.requireMembership(userId);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.householdMember.update({ where: { id: m.id }, data: { leftAt: now } }),
      this.prisma.fixedItem.updateMany({ where: { userId, householdId: m.householdId }, data: { householdId: null } }),
      this.prisma.debt.updateMany({ where: { userId, householdId: m.householdId }, data: { householdId: null } }),
    ]);
    const remaining = await this.prisma.householdMember.count({ where: { householdId: m.householdId, leftAt: null } });
    if (remaining === 0) {
      await this.prisma.household.update({ where: { id: m.householdId }, data: { deletedAt: now } });
    }
    await this.prisma.householdInvite.updateMany({ where: { householdId: m.householdId, usedAt: null }, data: { expiresAt: now } });
    return { household: null };
  }

  // -------------------------------------------------------------------------
  // Lo de la casa: deudas
  // -------------------------------------------------------------------------

  async setDebtShared(userId: string, debtId: string, shared: boolean) {
    const m = await this.requireMembership(userId);
    const debt = await this.prisma.debt.findFirst({ where: { id: debtId, userId, deletedAt: null } });
    if (!debt) throw new NotFoundException('Deuda no encontrada.');
    await this.prisma.debt.update({ where: { id: debtId }, data: { householdId: shared ? m.householdId : null } });
    return { debtId, shared };
  }

  // -------------------------------------------------------------------------
  // Metas juntos
  // -------------------------------------------------------------------------

  async createGoal(userId: string, dto: { name: string; targetAmount: number; targetDate?: string }) {
    const m = await this.requireMembership(userId);
    if (!dto.name?.trim()) throw new BadRequestException('Ponle nombre a la meta.');
    if (!(dto.targetAmount > 0)) throw new BadRequestException('La meta necesita un monto.');
    return this.prisma.householdGoal.create({
      data: {
        householdId: m.householdId,
        name: dto.name.trim().slice(0, 60),
        targetAmount: dto.targetAmount,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        createdById: userId,
      },
    });
  }

  async contribute(userId: string, goalId: string, amount: number) {
    const m = await this.requireMembership(userId);
    if (!(amount > 0)) throw new BadRequestException('Escribe cuánto pusiste.');
    const goal = await this.prisma.householdGoal.findFirst({ where: { id: goalId, householdId: m.householdId, deletedAt: null } });
    if (!goal) throw new NotFoundException('Meta no encontrada.');
    await this.prisma.householdGoalContribution.create({ data: { goalId, userId, amount } });
    return { goalId, amount };
  }

  async removeGoal(userId: string, goalId: string) {
    const m = await this.requireMembership(userId);
    const goal = await this.prisma.householdGoal.findFirst({ where: { id: goalId, householdId: m.householdId, deletedAt: null } });
    if (!goal) throw new NotFoundException('Meta no encontrada.');
    await this.prisma.householdGoal.update({ where: { id: goalId }, data: { deletedAt: new Date() } });
    return { removed: true };
  }

  // -------------------------------------------------------------------------
  // Nuestro mes
  // -------------------------------------------------------------------------

  async month(userId: string, now = new Date()) {
    const m = await this.requireMembership(userId);
    const householdId = m.householdId;
    const members = await this.activeMembers(householdId);
    const ids = members.map((x) => x.userId);
    const names = new Map(members.map((x) => [x.userId, x.userId === userId ? 'Tú' : firstName(x.user.fullName)]));
    const period = financialPeriod(now, 1);

    const [houseTx, fixedItems, houseDebts, goals] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          householdId,
          userId: { in: ids },
          deletedAt: null,
          status: 'confirmada',
          kind: { in: ['gasto', 'pago_deuda'] },
          occurredAt: { gte: period.start, lt: period.end },
        },
        include: { category: { select: { name: true, icon: true, color: true } }, debt: { select: { name: true } } },
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.fixedItem.findMany({ where: { householdId, userId: { in: ids }, deletedAt: null, isActive: true, kind: 'gasto' } }),
      this.prisma.debt.findMany({ where: { householdId, userId: { in: ids }, deletedAt: null, status: 'activa' } }),
      this.prisma.householdGoal.findMany({
        where: { householdId, deletedAt: null },
        include: { contributions: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Pagado por cada uno (lo de la casa).
    const paidBy = new Map<string, number>(ids.map((id) => [id, 0]));
    for (const t of houseTx) paidBy.set(t.userId, (paidBy.get(t.userId) ?? 0) + Number(t.amount));
    const spent = round2(houseTx.reduce((a, t) => a + Number(t.amount), 0));

    // Fijos de la casa: lo que falta registrar este mes.
    const fixedIds = fixedItems.map((f) => f.id);
    const fixedPaid = fixedIds.length
      ? await this.prisma.transaction.groupBy({
          by: ['fixedItemId'],
          where: { fixedItemId: { in: fixedIds }, deletedAt: null, status: 'confirmada', occurredAt: { gte: period.start, lt: period.end } },
          _sum: { amount: true },
        })
      : [];
    const fixedPaidMap = new Map(fixedPaid.map((g) => [g.fixedItemId as string, Number(g._sum.amount ?? 0)]));
    const fixedRows = fixedItems.map((f) => {
      const amount = Number(f.amount);
      const paid = fixedPaidMap.get(f.id) ?? 0;
      return { id: f.id, name: f.name, owner: names.get(f.userId) ?? '', amount: round2(amount), pending: round2(Math.max(0, amount - paid)), dayOfMonth: f.dayOfMonth };
    });

    // Deudas de la casa: cuota del mes (desembolso real, §32) y lo que falta.
    const outlays = new Map<string, number>();
    for (const id of new Set(houseDebts.map((d) => d.userId))) {
      const o = await this.debtOutlay.outlaysByUser(id);
      for (const [debtId, v] of o.byDebt) outlays.set(debtId, v.outlay);
    }
    const debtIds = houseDebts.map((d) => d.id);
    const debtPaid = debtIds.length
      ? await this.prisma.transaction.groupBy({
          by: ['debtId'],
          where: { debtId: { in: debtIds }, kind: 'pago_deuda', deletedAt: null, status: 'confirmada', occurredAt: { gte: period.start, lt: period.end } },
          _sum: { amount: true },
        })
      : [];
    const debtPaidMap = new Map(debtPaid.map((g) => [g.debtId as string, Number(g._sum.amount ?? 0)]));
    const debtRows = houseDebts.map((d) => {
      const monthly = round2(outlays.get(d.id) ?? Number(d.monthlyPayment ?? 0));
      const paid = round2(debtPaidMap.get(d.id) ?? 0);
      return {
        id: d.id,
        name: d.name,
        owner: names.get(d.userId) ?? '',
        mine: d.userId === userId,
        monthly,
        paid,
        pending: round2(Math.max(0, monthly - paid)),
        nextDueDate: d.nextDueDate ? d.nextDueDate.toISOString() : null,
      };
    });

    const committedPending = round2(fixedRows.reduce((a, f) => a + f.pending, 0) + debtRows.reduce((a, d) => a + d.pending, 0));
    const budget = m.household.monthlyBudget != null ? Number(m.household.monthlyBudget) : null;
    const left = budget != null ? round2(budget - spent - committedPending) : null;

    // Aporte justo: el ingreso solo se usa para la PROPORCIÓN y nunca sale de aquí.
    const incomes = new Map<string, number | null>();
    for (const x of members) {
      if (!x.shareIncome) {
        incomes.set(x.userId, null);
        continue;
      }
      const n = await this.netIncome.compute(x.userId).catch(() => null);
      let income = n?.netMonthlyEstimate ?? 0;
      if (!(income > 0)) {
        const received = await this.prisma.transaction.aggregate({
          where: { userId: x.userId, kind: 'ingreso', deletedAt: null, status: 'confirmada', occurredAt: { gte: period.start, lt: period.end } },
          _sum: { amount: true },
        });
        income = Number(received._sum.amount ?? 0);
      }
      incomes.set(x.userId, income > 0 ? income : null);
    }
    const share = fairShare(
      members.map((x) => ({ userId: x.userId, income: incomes.get(x.userId) ?? null, shareIncome: x.shareIncome, paid: paidBy.get(x.userId) ?? 0 })),
      m.household.splitMode,
    );

    // Deudas personales de la pareja: solo totales y solo si ella lo activó.
    const partnerDebts: Array<{ name: string; count: number; monthly: number; balance: number }> = [];
    for (const x of members) {
      if (x.userId === userId || !x.shareDebts) continue;
      const debts = await this.prisma.debt.findMany({
        where: { userId: x.userId, deletedAt: null, status: 'activa' },
        include: { cardPurchases: { where: { deletedAt: null }, include: { installments: { where: { deletedAt: null, paidAt: null } } } } },
      });
      const o = await this.debtOutlay.outlaysByUser(x.userId);
      const balance = debts.reduce(
        (a, d) => a + (d.cardPurchases.length ? d.cardPurchases.reduce((b, p) => b + p.installments.reduce((c, i) => c + Number(i.amount), 0), 0) : Number(d.currentBalance)),
        0,
      );
      partnerDebts.push({ name: firstName(x.user.fullName), count: debts.length, monthly: round2(o.totalOutlay), balance: round2(balance) });
    }

    const goalRows = goals.map((g) => {
      const saved = round2(g.contributions.reduce((a, c) => a + Number(c.amount), 0));
      const target = Number(g.targetAmount);
      const byMember = ids.map((id) => ({
        who: names.get(id) ?? '',
        amount: round2(g.contributions.filter((c) => c.userId === id).reduce((a, c) => a + Number(c.amount), 0)),
      }));
      // Ritmo: lo aportado por mes desde que se creó, para estimar cuándo llegan.
      const months = Math.max(1, (now.getTime() - g.createdAt.getTime()) / (30 * 86_400_000));
      const pace = saved / months;
      const remaining = Math.max(0, target - saved);
      const eta = remaining <= 0 ? now : pace > 0 ? new Date(now.getTime() + (remaining / pace) * 30 * 86_400_000) : null;
      return {
        id: g.id,
        name: g.name,
        target: round2(target),
        saved,
        percent: target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0,
        targetDate: g.targetDate ? g.targetDate.toISOString() : null,
        eta: eta ? eta.toISOString() : null,
        byMember,
      };
    });

    return {
      period: { start: period.start.toISOString(), end: period.end.toISOString(), label: period.label },
      members: members.map((x) => ({ who: names.get(x.userId) ?? '', isMe: x.userId === userId })),
      budget,
      spent,
      committedPending,
      left,
      fair: {
        mode: share.mode,
        fallbackReason: share.fallbackReason,
        total: share.total,
        rows: share.rows.map((r) => ({ who: names.get(r.userId) ?? '', isMe: r.userId === userId, percent: Math.round(r.ratio * 100), due: r.due, paid: r.paid, balance: r.balance })),
        settlement: share.settlement
          ? { from: names.get(share.settlement.fromUserId) ?? '', to: names.get(share.settlement.toUserId) ?? '', fromIsMe: share.settlement.fromUserId === userId, amount: share.settlement.amount }
          : null,
      },
      fixed: fixedRows,
      debts: debtRows,
      partnerDebts,
      goals: goalRows,
      recent: houseTx.slice(0, 15).map((t) => ({
        id: t.id,
        who: names.get(t.userId) ?? '',
        isMe: t.userId === userId,
        amount: Number(t.amount),
        occurredAt: t.occurredAt.toISOString(),
        label: t.category?.name ?? t.debt?.name ?? t.note ?? 'Gasto de la casa',
        icon: t.category?.icon ?? '🏠',
        color: t.category?.color ?? '#0B6E4F',
      })),
    };
  }

  // -------------------------------------------------------------------------

  private inviteExpiry(): Date {
    return new Date(Date.now() + INVITE_DAYS * 86_400_000);
  }

  private async freeCode(db: { householdInvite: { findUnique: (a: { where: { code: string } }) => Promise<unknown> } }): Promise<string> {
    for (let i = 0; i < 8; i += 1) {
      const code = inviteCode();
      if (!(await db.householdInvite.findUnique({ where: { code } }))) return code;
    }
    throw new ConflictException('No pude generar un código. Intenta de nuevo.');
  }

  /** Para el bot y la app: comprueba que la persona no intente tocar un hogar ajeno. */
  async assertMember(userId: string, householdId: string) {
    const m = await this.membership(userId);
    if (!m || m.householdId !== householdId) throw new ForbiddenException();
  }
}
