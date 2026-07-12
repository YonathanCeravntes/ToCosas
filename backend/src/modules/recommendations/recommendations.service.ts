import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, RecommendationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricKey } from '../financial-engine/engine.constants';
import { nextMilestone } from '../financial-engine/metrics/emergency-fund.constants';
import { monthStart } from '../financial-engine/metrics/series.util';
import { SimulationsService } from '../simulations/simulations.service';
import {
  DISCRETIONARY_GLOBAL_CATEGORIES,
  IMPACT_SCORE_CAP,
  MAX_ACTIVE_RECOMMENDATIONS,
  URGENCY,
} from './recommendations.constants';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

interface Candidate {
  kind: string;
  title: string;
  body: string;
  whatIfNot: string;
  dedupeKey: string;
  impact: Record<string, number | string | null>;
  priorityScore: number;
}

/**
 * Motor de recomendaciones con impacto (FIN-007 §4.3). Corre simulaciones
 * reales sobre las oportunidades detectadas y cuantifica el beneficio.
 * Prioridad = impacto (ΔScore normalizado) × urgencia × viabilidad.
 * Genéricas por construcción (DEC-0005 §14.2): sin marcas ni entidades.
 */
@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly simulations: SimulationsService,
  ) {}

  async list(userId: string) {
    return this.prisma.recommendation.findMany({
      where: { userId, status: { in: ['new', 'seen'] } },
      orderBy: { priorityScore: 'desc' },
    });
  }

  async setStatus(userId: string, id: string, status: RecommendationStatus) {
    const rec = await this.prisma.recommendation.findFirst({ where: { id, userId } });
    if (!rec) throw new NotFoundException('Recomendación no encontrada');
    return this.prisma.recommendation.update({ where: { id }, data: { status } });
  }

  /** Genera candidatas para un usuario y aplica cupo/desplazamiento. */
  async generateForUser(userId: string, now: Date = new Date()): Promise<number> {
    const period = monthStart(now).toISOString().slice(0, 7);
    const state = await this.simulations.loadState(userId);
    const candidates: Candidate[] = [];

    const surplus = state.income - state.expense - state.debtPayments;

    // 1) Excedente + deudas → abono extra a la de mayor tasa.
    if (surplus > 50_000 && state.debts.length > 0) {
      const worst = [...state.debts].sort((a, b) => b.ratePct - a.ratePct)[0];
      const extra = Math.round(surplus * 0.5);
      const sim = await this.simulations.projectOnly(userId, {
        type: 'abono_extra',
        debtId: worst.id,
        extraMonthly: extra,
      });
      const saved = Number(sim.specifics.interestSaved ?? 0);
      const months = Number(sim.specifics.monthsSaved ?? 0);
      if (saved > 0) {
        candidates.push(this.candidate({
          kind: 'abono_extra',
          dedupeKey: `rec_abono_extra:${period}`,
          title: `Abona ${fmt(extra)} extra a tu ${worst.ref}`,
          body: `Con ${fmt(extra)} adicionales al mes ahorras ${fmt(saved)} en intereses y terminas ${months} meses antes.`,
          whatIfNot: `Seguirás pagando ${fmt(saved)} de intereses evitables durante la vida del crédito.`,
          impact: { interestSaved: saved, monthsSaved: months, scoreDelta: sim.delta.score },
          scoreDelta: sim.delta.score,
          urgency: worst.ratePct > 25 ? URGENCY.rojo : URGENCY.amarillo,
          feasibility: Math.min(1, surplus / (extra * 2)),
        }));
      }
    }

    // 2) DTI alto → comparar estrategias.
    const before = state.debts.length > 1 ? await this.simulations.projectOnly(userId, { type: 'estrategia_deudas', extraBudget: Math.max(0, Math.round(surplus * 0.3)) }) : null;
    if (before && before.before.dti > 0.35) {
      const diff = Number(before.specifics.interestDifference ?? 0);
      const rec = String(before.specifics.recommended ?? 'avalanche');
      candidates.push(this.candidate({
        kind: 'estrategia',
        dedupeKey: `rec_estrategia:${period}`,
        title: `Ordena tus deudas con el método ${rec === 'avalanche' ? 'avalancha' : 'bola de nieve'}`,
        body: `Priorizando bien el orden de pago, la diferencia entre estrategias es de ${fmt(diff)} en intereses totales.`,
        whatIfNot: 'Pagar sin orden definido suele costar más intereses y alargar las deudas.',
        impact: { interestDifference: diff, recommended: rec },
        scoreDelta: 10,
        urgency: URGENCY.rojo,
        feasibility: 1,
      }));
    }

    // 3) Fondo por debajo de su próximo hito + excedente → aporte mensual.
    //    FIN-021 (DEC-0021 §5.1): cobertura y gasto esencial se leen de las
    //    métricas PERSISTIDAS del Motor (la fuente oficial §32) — este servicio
    //    ya no recalcula el concepto; los hitos vienen de la constante única.
    const readings = await this.readMonthMetrics(userId, monthStart(now));
    const fundMonths = readings.get(MetricKey.EmergencyFundMonths);
    const essential = readings.get(MetricKey.EssentialExpense) ?? 0;
    const milestone = fundMonths !== undefined ? nextMilestone(fundMonths) : null;
    if (milestone && essential > 0 && surplus > 100_000) {
      const aporte = Math.round(surplus * 0.3);
      const gap = Math.max(0, (milestone.months - fundMonths!) * essential);
      const months = aporte > 0 ? Math.ceil(gap / aporte) : 0;
      if (months > 0) {
        candidates.push(this.candidate({
          kind: 'fondo_emergencia',
          dedupeKey: `rec_fondo:${period}`,
          title: `Aparta ${fmt(aporte)}/mes para tu ${milestone.label}`,
          body: `A ese ritmo llegas a tu ${milestone.label} (${milestone.months} meses de lo esencial cubiertos) en ${months} meses.`,
          whatIfNot: 'Sin colchón, cualquier imprevisto se convierte en deuda nueva.',
          impact: { monthlyContribution: aporte, monthsToTarget: months, milestoneMonths: milestone.months },
          scoreDelta: 25,
          urgency: fundMonths === 0 ? URGENCY.rojo : URGENCY.amarillo,
          feasibility: Math.min(1, surplus / (aporte * 2)),
        }));
      }
    }

    // 4) Categoría dominante DISCRECIONAL (DEC-0007 §10.1: solo lista curada de
    //    globales; personalizadas EXCLUIDAS).
    const topDiscretionary = await this.topDiscretionarySpend(userId, now);
    if (topDiscretionary && topDiscretionary.amount > 200_000) {
      const cut = Math.round(topDiscretionary.amount * 0.2);
      const sim = await this.simulations.projectOnly(userId, { type: 'reducir_gastos', monthlyAmount: cut });
      candidates.push(this.candidate({
        kind: 'recorte_categoria',
        dedupeKey: `rec_recorte:${period}`,
        title: `Recorta 20% de ${topDiscretionary.name}`,
        body: `Este mes llevas ${fmt(topDiscretionary.amount)} en ${topDiscretionary.name}. Un recorte del 20% libera ${fmt(cut)}/mes.`,
        whatIfNot: `Son ${fmt(cut * 12)} al año que podrían trabajar en tus metas.`,
        impact: { freedMonthly: cut, scoreDelta: sim.delta.score },
        scoreDelta: sim.delta.score,
        urgency: URGENCY.amarillo,
        feasibility: 0.8,
      }));
    }

    return this.applyWithDisplacement(userId, candidates);
  }

  /**
   * Cupo de 3 activas con regla de desplazamiento (DEC-0007 §10.2): prioridad
   * ESTRICTAMENTE mayor desplaza a la activa más débil (dismissed/superseded);
   * igual o menor → no se crea este ciclo (podrá entrar al siguiente).
   */
  private async applyWithDisplacement(userId: string, candidates: Candidate[]): Promise<number> {
    let created = 0;
    for (const c of candidates.sort((a, b) => b.priorityScore - a.priorityScore)) {
      const exists = await this.prisma.recommendation.findUnique({
        where: { userId_dedupeKey: { userId, dedupeKey: c.dedupeKey } },
      });
      if (exists) continue; // dedupe mensual

      const active = await this.prisma.recommendation.findMany({
        where: { userId, status: { in: ['new', 'seen'] } },
        orderBy: { priorityScore: 'asc' },
      });
      if (active.length >= MAX_ACTIVE_RECOMMENDATIONS) {
        const weakest = active[0];
        if (c.priorityScore > Number(weakest.priorityScore)) {
          await this.prisma.recommendation.update({
            where: { id: weakest.id },
            data: { status: 'dismissed', dismissReason: 'superseded' },
          });
        } else {
          continue; // no entra este ciclo (DEC-0007 §10.2)
        }
      }
      await this.prisma.recommendation.create({
        data: {
          userId,
          kind: c.kind,
          title: c.title,
          body: c.body,
          whatIfNot: c.whatIfNot,
          priorityScore: c.priorityScore,
          impact: c.impact as Prisma.InputJsonValue,
          dedupeKey: c.dedupeKey,
        },
      });
      created += 1;
    }
    return created;
  }

  /** FIN-021: lecturas persistidas del Motor del mes (fuente oficial §32). */
  private async readMonthMetrics(userId: string, capturedAt: Date): Promise<Map<string, number>> {
    const rows = await this.prisma.metricReading.findMany({
      where: { userId, period: 'month', capturedAt },
    });
    return new Map(rows.map((r) => [r.metricKey, Number(r.value)]));
  }

  private candidate(input: Omit<Candidate, 'priorityScore'> & {
    scoreDelta: number;
    urgency: number;
    feasibility: number;
  }): Candidate {
    const impactNorm = Math.min(1, Math.abs(input.scoreDelta) / IMPACT_SCORE_CAP);
    const priorityScore = Math.round(impactNorm * input.urgency * Math.min(1, input.feasibility) * 10_000) / 10_000;
    const { scoreDelta, urgency, feasibility, ...rest } = input;
    void scoreDelta; void urgency; void feasibility;
    return { ...rest, priorityScore };
  }

  /** Mayor gasto del mes en categorías globales de la lista curada. */
  private async topDiscretionarySpend(userId: string, now: Date) {
    const from = monthStart(now);
    const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
    const txs = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        kind: 'gasto',
        occurredAt: { gte: from, lt: to },
        category: { isGlobal: true, name: { in: DISCRETIONARY_GLOBAL_CATEGORIES } },
      },
      include: { category: { select: { name: true } } },
    });
    const byName = new Map<string, number>();
    for (const t of txs) {
      const name = t.category?.name ?? '';
      byName.set(name, (byName.get(name) ?? 0) + Number(t.amount));
    }
    const top = [...byName.entries()].sort(([, a], [, b]) => b - a)[0];
    return top ? { name: top[0], amount: top[1] } : null;
  }
}
