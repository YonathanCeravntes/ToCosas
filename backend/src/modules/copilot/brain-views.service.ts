import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SpendableService } from '../budget/spendable.service';
import { CashflowPlanService } from '../debts/cashflow-plan.service';
import { DebtOutlayService } from '../debts/debt-outlay.service';
import {
  brand,
  MinimizedBudgetNowView,
  MinimizedCashflowPlanView,
  MinimizedUpcomingView,
} from './minimized-views';

const DAY = 86_400_000;

/** Acción PROPUESTA por el Copiloto: la app muestra un botón y la persona confirma. */
export type ProposedAction =
  | { type: 'crear_gasto_fijo'; label: string; name: string; amount: number; dayOfMonth: number | null }
  | { type: 'abonar_deuda'; label: string; debtId: string; debtName: string; amount: number | null }
  | { type: 'ver_plan'; label: string }
  | { type: 'ver_presupuesto'; label: string };

/**
 * FIN-046 Fase 1 · Vistas del "cerebro" para el Copiloto. Todas salen de las
 * FUENTES ÚNICAS (§32): plan de flujo (FIN-045), Te queda (SpendableService) y
 * desembolso real (DebtOutlayService). Deudas y fijos viajan por REFERENCIA
 * ("deuda #N (tipo)", "gasto fijo #N"), mismo orden que el ContextAssembler.
 */
@Injectable()
export class BrainViewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spendable: SpendableService,
    private readonly plan: CashflowPlanService,
    private readonly debtOutlay: DebtOutlayService,
  ) {}

  /** id → "deuda #N (tipo)" (orden de creación, igual que `buildDebtsView`). */
  async debtRefs(userId: string): Promise<Map<string, { ref: string; name: string }>> {
    const debts = await this.prisma.debt.findMany({
      where: { userId, deletedAt: null, status: 'activa' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, debtType: true, name: true },
    });
    return new Map(debts.map((d, i) => [d.id, { ref: `deuda #${i + 1} (${d.debtType})`, name: d.name }]));
  }

  /** "deuda #N" (con o sin el tipo) → id real. */
  async resolveDebtRef(userId: string, ref: string): Promise<{ id: string; name: string } | null> {
    const n = /#\s*(\d+)/.exec(ref)?.[1];
    if (!n) return null;
    for (const [id, v] of await this.debtRefs(userId)) {
      if (v.ref.startsWith(`deuda #${n} `) || v.ref === `deuda #${n}`) return { id, name: v.name };
    }
    return null;
  }

  async cashflowPlanView(userId: string, monthly?: number): Promise<MinimizedCashflowPlanView> {
    const [plan, refs] = await Promise.all([this.plan.forUser(userId, monthly), this.debtRefs(userId)]);
    return brand({
      kind: 'cashflow_plan' as const,
      free: plan.free,
      proposal: plan.proposal,
      toDebt: plan.toDebt,
      toColchon: plan.toColchon,
      colchonGap: plan.colchonGap,
      colchonMonths: plan.colchonMonths,
      steps: plan.steps.map((s) => ({
        order: s.order,
        ref: refs.get(s.debtId)?.ref ?? 'deuda',
        balance: s.balance,
        payment: s.payment,
        annualRatePct: s.annualRatePct,
        freesPerHundred: s.freesPerHundred,
        monthWithPlan: s.monthWithPlan,
        monthWithout: s.monthWithout,
      })),
    });
  }

  async budgetNowView(userId: string, now = new Date()): Promise<MinimizedBudgetNowView> {
    const [tq, refs, fixed] = await Promise.all([
      this.spendable.compute(userId, now),
      this.debtRefs(userId),
      this.fixedRefs(userId),
    ]);
    // Los compromisos llegan con el NOMBRE de la deuda/fijo: se traducen a referencia.
    const byName = new Map<string, string>();
    for (const v of refs.values()) byName.set(v.name, v.ref);
    for (const f of fixed) byName.set(f.name, f.ref);
    return brand({
      kind: 'budget_now' as const,
      teQueda: Math.round(tq.amount),
      perDay: tq.perDay != null ? Math.round(tq.perDay) : null,
      daysLeft: tq.daysLeft,
      incomeBase: Math.round(tq.incomeBase),
      pendingCommitments: tq.pendingCommitments.map((c) => ({
        ref: byName.get(c.name) ?? (c.kind === 'cuota' ? 'deuda' : 'gasto fijo'),
        amount: Math.round(c.amount),
        datePassed: c.datePassed,
      })),
    });
  }

  async upcomingView(userId: string, now = new Date()): Promise<MinimizedUpcomingView> {
    const [debts, refs, outlays, fixed] = await Promise.all([
      this.prisma.debt.findMany({ where: { userId, deletedAt: null, status: 'activa', nextDueDate: { not: null } } }),
      this.debtRefs(userId),
      this.debtOutlay.outlaysByUser(userId),
      this.fixedRefs(userId),
    ]);
    const horizon = now.getTime() + 31 * DAY;
    const items: MinimizedUpcomingView['items'] = [];
    for (const d of debts) {
      const t = d.nextDueDate!.getTime();
      if (t > horizon) continue;
      items.push({
        ref: refs.get(d.id)?.ref ?? 'deuda',
        amount: Math.round(outlays.byDebt.get(d.id)?.outlay ?? Number(d.monthlyPayment ?? 0)),
        date: d.nextDueDate!.toISOString().slice(0, 10),
        daysLeft: Math.ceil((t - now.getTime()) / DAY),
      });
    }
    for (const f of fixed) {
      if (!f.dayOfMonth) continue;
      const next = new Date(now.getFullYear(), now.getMonth(), f.dayOfMonth);
      if (next.getTime() < now.getTime() - DAY) next.setMonth(next.getMonth() + 1);
      items.push({
        ref: f.ref,
        amount: f.amount,
        date: next.toISOString().slice(0, 10),
        daysLeft: Math.max(0, Math.ceil((next.getTime() - now.getTime()) / DAY)),
      });
    }
    items.sort((a, b) => a.date.localeCompare(b.date));
    return brand({ kind: 'upcoming_payments' as const, items });
  }

  /** Valida y traduce una acción propuesta por la IA (refs → ids reales). Null = inválida. */
  async toAction(userId: string, input: Record<string, unknown>): Promise<ProposedAction | null> {
    const num = (k: string) => (typeof input[k] === 'number' && isFinite(input[k] as number) ? Math.round(input[k] as number) : null);
    const fmt = (n: number) => '$' + n.toLocaleString('es-CO');
    switch (input.type) {
      case 'crear_gasto_fijo': {
        const name = String(input.name ?? '').trim().slice(0, 60);
        const amount = num('amount');
        const day = num('dayOfMonth');
        if (!name || !amount || amount <= 0) return null;
        const dayOfMonth = day && day >= 1 && day <= 31 ? day : null;
        return {
          type: 'crear_gasto_fijo',
          name,
          amount,
          dayOfMonth,
          label: `Crear gasto fijo: ${name} ${fmt(amount)}${dayOfMonth ? ` (día ${dayOfMonth})` : ''}`,
        };
      }
      case 'abonar_deuda': {
        const debt = await this.resolveDebtRef(userId, String(input.debtRef ?? ''));
        if (!debt) return null;
        const amount = num('amount');
        return {
          type: 'abonar_deuda',
          debtId: debt.id,
          debtName: debt.name,
          amount: amount && amount > 0 ? amount : null,
          label: amount && amount > 0 ? `Abonar ${fmt(amount)} a ${debt.name}` : `Abonar a ${debt.name}`,
        };
      }
      case 'ver_plan':
        return { type: 'ver_plan', label: 'Ver mi plan para liberar plata' };
      case 'ver_presupuesto':
        return { type: 'ver_presupuesto', label: 'Ver mi presupuesto' };
      default:
        return null;
    }
  }

  /** Mapa de referencias → nombre real (solo para MOSTRAR a la persona, nunca hacia la IA). */
  async refNames(userId: string): Promise<{ debts: Map<string, string>; fixed: Map<string, string> }> {
    const [refs, fixed] = await Promise.all([this.debtRefs(userId), this.fixedRefs(userId)]);
    const debts = new Map<string, string>();
    for (const v of refs.values()) debts.set(/#(\d+)/.exec(v.ref)![1], v.name);
    return { debts, fixed: new Map(fixed.map((f) => [/#(\d+)/.exec(f.ref)![1], f.name])) };
  }

  applyNames(text: string, names: { debts: Map<string, string>; fixed: Map<string, string> }): string {
    return text
      .replace(/(?:tu |la |a la )?deuda #\s*(\d+)(?:\s*\([a-z_]+\))?/gi, (m, n: string) => {
        const name = names.debts.get(n);
        if (!name) return m;
        const lead = /^(tu |la |a la )/i.exec(m)?.[0] ?? '';
        return `${lead === 'a la ' ? 'a ' : ''}${name}`;
      })
      .replace(/gasto fijo #\s*(\d+)/gi, (m, n: string) => names.fixed.get(n) ?? m);
  }

  async humanize(userId: string, text: string): Promise<string> {
    if (!/(deuda|gasto fijo) #\s*\d/i.test(text)) return text;
    return this.applyNames(text, await this.refNames(userId));
  }

  private async fixedRefs(userId: string) {
    const items = await this.prisma.fixedItem.findMany({
      where: { userId, deletedAt: null, isActive: true, kind: 'gasto' },
      orderBy: { createdAt: 'asc' },
    });
    return items.map((f, i) => ({ ref: `gasto fijo #${i + 1}`, name: f.name, amount: Math.round(Number(f.amount)), dayOfMonth: f.dayOfMonth }));
  }
}
