import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { OutboxService } from '../events/outbox.service';
import { DomainEventType } from '../events/domain-events';
import { InsightsService } from '../insights/insights.service';
import { ENGINE_TZ } from '../financial-engine/engine.constants';
import { descriptorFor, UpdatePolicyRule } from './product-type.descriptor';

/** Una confirmación pendiente: "¿cambió <label> de <deuda>? Estaba en <valor>". */
export interface PendingReview {
  debtId: string;
  debtName: string;
  field: UpdatePolicyRule['field'];
  label: string;
  currentValue: number | null;
  /** El corte que la disparó (para congelar hasta el siguiente). */
  cutDate: string;
}

const monthsBack = (d: Date, n: number) => {
  const r = new Date(d.getTime());
  r.setUTCMonth(r.getUTCMonth() - n);
  return r;
};

/**
 * FIN-036 (DEC-0036) · Inteligencia de actualización — confirmación por corte.
 *
 * DÍA-1 y determinista (condición del CTO): la señal es la FECHA DE CORTE que el
 * producto conoce desde su alta (`nextDueDate`/`paymentDay`) + la `updatePolicy` de
 * su modalidad (config). Cero dependencia de patrones de uso, cero IA (gate DPA+PIA).
 *
 * Calma por construcción: un campo se pregunta a lo sumo una vez por ventana de
 * corte (el `DebtFieldReview` la congela); tasa fija = jamás; la entrega proactiva
 * pasa por el `ProactivityJob`/`NotificationBudgetService` existentes (≤1/día).
 *
 * Nivel 2 (§42, DEC-0030 §5): la respuesta se CONFIRMA antes de aplicar; el cambio
 * guarda el valor anterior (reversible) y emite `DebtUpdated` para que el Motor
 * recompute (mismo patrón hoja de CardService/DebtInsuranceService). Por DEC-0036 §3
 * NINGUNA cadencia escribe sin confirmación. NO toca `transactions.service`.
 */
@Injectable()
export class UpdateReviewService {
  private readonly logger = new Logger(UpdateReviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly insights: InsightsService,
  ) {}

  /**
   * El corte más reciente que YA ocurrió para esta deuda, o null si no ha habido
   * ninguno desde que existe (día-1: una deuda recién creada no pregunta nada
   * antes de su primer corte). Derivado de `nextDueDate` (retrocediendo meses) o,
   * si no hay plan, del `paymentDay` mensual. Determinista.
   */
  lastCutDate(
    debt: { nextDueDate: Date | null; paymentDay: number | null; createdAt: Date },
    now: Date,
  ): Date | null {
    let cut: Date | null = null;
    if (debt.nextDueDate) {
      cut = new Date(debt.nextDueDate.getTime());
      while (cut > now) cut = monthsBack(cut, 1);
    } else if (debt.paymentDay) {
      const day = Math.min(debt.paymentDay, 28);
      cut = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day));
      if (cut > now) cut = monthsBack(cut, 1);
    }
    if (!cut || cut <= debt.createdAt) return null; // sin corte desde que existe
    return cut;
  }

  /** ¿Aplica esta regla a esta deuda? (condición determinista, no heurística). */
  private ruleApplies(rule: UpdatePolicyRule, debt: { rateKind: string }): boolean {
    if (rule.cadence === 'nunca') return false;
    if (rule.cadence === 'al_corte_si_variable') return debt.rateKind === 'variable';
    return true; // al_corte | anual | una_vez
  }

  /** Ventana desde la que un review previo congela la pregunta. */
  private freezeSince(rule: UpdatePolicyRule, cut: Date): Date | null {
    if (rule.cadence === 'una_vez') return null; // cualquier review previo congela para siempre
    if (rule.cadence === 'anual') return monthsBack(cut, 12);
    return cut; // al_corte: un review posterior al corte vigente congela la ventana
  }

  /** Las confirmaciones pendientes del usuario (día-1: solo si un corte ya pasó). */
  async pendingReviews(userId: string, now: Date = new Date()): Promise<PendingReview[]> {
    const debts = await this.prisma.debt.findMany({
      where: { userId, deletedAt: null, status: 'activa' },
      include: { fieldReviews: { orderBy: { reviewedAt: 'desc' } } },
    });

    const pending: PendingReview[] = [];
    for (const d of debts) {
      const cut = this.lastCutDate(d, now);
      if (!cut) continue;
      const policy = descriptorFor(d.debtType).updatePolicy;
      for (const rule of policy) {
        if (!this.ruleApplies(rule, d)) continue;
        const last = d.fieldReviews.find((r) => r.field === rule.field);
        const since = this.freezeSince(rule, cut);
        // Congelada si ya se revisó: 'una_vez' con cualquier review; el resto, si el
        // review es posterior al corte vigente (o dentro de la ventana anual).
        const frozen = last && (since === null || last.reviewedAt >= since);
        if (frozen) continue;
        const raw = d[rule.field];
        pending.push({
          debtId: d.id,
          debtName: d.name,
          field: rule.field,
          label: rule.label,
          currentValue: raw != null ? Number(raw) : null,
          cutDate: cut.toISOString(),
        });
      }
    }
    return pending;
  }

  /**
   * Respuesta del usuario (NIVEL 2 — ya confirmó en la propuesta): registra la
   * revisión (congela la ventana) y, si cambió, aplica el nuevo valor al campo
   * EXISTENTE de `Debt` + emite `DebtUpdated` (el Motor recomputa). Reversible:
   * `previousValue` queda en el registro. "No cambió" solo congela.
   */
  async answer(
    userId: string,
    debtId: string,
    field: string,
    input: { changed: boolean; newValue?: number },
  ) {
    const debt = await this.prisma.debt.findFirst({ where: { id: debtId, userId, deletedAt: null } });
    if (!debt) throw new NotFoundException('Deuda no encontrada');
    const rule = descriptorFor(debt.debtType).updatePolicy.find((r) => r.field === field);
    // Solo campos DECLARADOS por la modalidad (whitelist del descriptor, §32).
    if (!rule) throw new BadRequestException('Este campo no se revisa para este producto');
    if (input.changed && (input.newValue == null || input.newValue <= 0)) {
      throw new BadRequestException('Indica el nuevo valor');
    }

    const previous = debt[rule.field] != null ? Number(debt[rule.field]) : null;
    await this.prisma.$transaction(async (tx) => {
      await tx.debtFieldReview.create({
        data: {
          debtId: debt.id,
          field: rule.field,
          changed: input.changed,
          previousValue: previous,
          newValue: input.changed ? input.newValue : null,
        },
      });
      if (input.changed) {
        await tx.debt.update({ where: { id: debt.id }, data: { [rule.field]: input.newValue } });
        // Causalidad §42: el cambio confirmado despierta al Motor (recompute).
        await this.outbox.enqueue(tx, {
          aggregateType: 'debt',
          aggregateId: debt.id,
          eventType: DomainEventType.DebtUpdated,
          payload: { userId, reason: 'update_review', field: rule.field, previous, next: input.newValue },
        });
      }
    });

    return {
      reviewed: true,
      changed: input.changed,
      field: rule.field,
      previousValue: previous,
      newValue: input.changed ? input.newValue : previous,
      // Acuse honesto (§5.1): qué quedó y que es reversible.
      acknowledgment: input.changed
        ? `Listo, actualicé ${rule.label} de ${debt.name} a $${Math.round(input.newValue!).toLocaleString('es-CO')} (antes $${previous != null ? Math.round(previous).toLocaleString('es-CO') : '—'}).`
        : `Perfecto — ${rule.label} de ${debt.name} sigue igual. No te lo vuelvo a preguntar hasta el próximo corte.`,
    };
  }

  /**
   * Siembra el insight proactivo "toca confirmar" ANTES del ProactivityJob de las
   * 7 AM: la ENTREGA queda gobernada por el presupuesto anti-fatiga existente
   * (≤1 proactivo/usuario/día) — "calmada, no ansiosa" por construcción. Idempotente
   * por dedupeKey (usuario + ventana de corte).
   */
  @Cron('0 30 6 * * *', { timeZone: ENGINE_TZ })
  async seedReviewInsights(now: Date = new Date()): Promise<number> {
    const users = await this.prisma.user.findMany({ where: { deletedAt: null }, select: { id: true } });
    let created = 0;
    for (const u of users) {
      try {
        const pending = await this.pendingReviews(u.id, now);
        if (pending.length === 0) continue;
        const first = pending[0];
        const insight = await this.insights.createIfNew({
          userId: u.id,
          type: 'cambio_tendencia',
          severity: 'info',
          title: 'Una confirmación rápida',
          body:
            pending.length === 1
              ? `¿Cambió ${first.label} de ${first.debtName}?${first.currentValue != null ? ` Estaba en $${Math.round(first.currentValue).toLocaleString('es-CO')}.` : ''} Confírmalo en Deudas — si no cambió, no te lo vuelvo a preguntar.`
              : `Tienes ${pending.length} datos por confirmar en tus deudas (cupo/tasa/cuota). Revisa Deudas — lo que no cambió no se vuelve a preguntar.`,
          dedupeKey: `fin036-review-${first.cutDate.slice(0, 10)}`,
        });
        if (insight) created += 1;
      } catch (e) {
        this.logger.warn(`review insights u=${u.id}: ${(e as Error).message}`);
      }
    }
    return created;
  }
}
