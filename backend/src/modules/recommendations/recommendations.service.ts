import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, RecommendationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricKey } from '../financial-engine/engine.constants';
import { nextMilestone } from '../financial-engine/metrics/emergency-fund.constants';
import { monthStart } from '../financial-engine/metrics/series.util';
import { SimulationsService } from '../simulations/simulations.service';
import { orderByCashflow } from '../debts/cashflow-plan.util';
import { toEffectiveAnnualRate } from '../finance/amortization/interest.util';
import type { RateBasis } from '../finance/amortization/amortization.types';
import {
  IMPACT_SCORE_CAP,
  MAX_ACTIVE_RECOMMENDATIONS,
  MIN_STRATEGY_DIFFERENCE,
  URGENCY,
} from './recommendations.constants';

/**
 * FIN-061 (Motor de Salida Humano, aprobado por el Fundador 2026-10-04):
 * - `recorte_categoria` se retira: Millo no recomienda recortar gustos (regla 2:
 *   recortes solo sobre fugas).
 * - `estrategia` (avalancha/bola de nieve) se retira: una sola regla de orden en
 *   toda la app, liberar flujo (FIN-045; regla 6).
 * Las ya guardadas dejan de mostrarse.
 */
const RETIRED_KINDS = new Set(['recorte_categoria', 'estrategia']);

/** BT-043: recomendación de estrategia guardada sin diferencia real (datos viejos). */
function isEmptyStrategy(r: { kind: string; impact: Prisma.JsonValue }): boolean {
  if (r.kind !== 'estrategia') return false;
  const diff = Number((r.impact as { interestDifference?: number } | null)?.interestDifference ?? 0);
  return !(diff >= MIN_STRATEGY_DIFFERENCE);
}

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
    const rows = await this.prisma.recommendation.findMany({
      where: { userId, status: { in: ['new', 'seen'] } },
      orderBy: [{ priorityScore: 'desc' }, { createdAt: 'desc' }],
    });
    // BT-043: una sola por tipo (la más reciente; las de meses anteriores quedaban
    // activas y se veían repetidas) y nunca una estrategia sin diferencia real.
    const newest = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      const cur = newest.get(r.kind);
      if (!cur || r.createdAt > cur.createdAt) newest.set(r.kind, r);
    }
    return rows.filter((r) => newest.get(r.kind) === r && !isEmptyStrategy(r) && !RETIRED_KINDS.has(r.kind));
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
      // FIN-061 regla 6: la misma deuda que el plan para liberar flujo (cuota ÷
      // saldo), con tasas comparadas en Efectiva Anual (antes: tasa cruda, que
      // ponía 2,5 % mensual por debajo de 25 % anual).
      const ranked = orderByCashflow(
        state.debts.map((d) => ({
          ...d,
          payment: d.monthlyPayment,
          annualRatePct: toEffectiveAnnualRate(d.ratePct, d.rateBasis as RateBasis) * 100,
        })),
      );
      const worst = ranked[0];
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
          urgency: worst.annualRatePct > 25 ? URGENCY.rojo : URGENCY.amarillo,
          feasibility: Math.min(1, surplus / (extra * 2)),
        }));
      }
    }

    // 2) (FIN-061) La comparación avalancha/bola de nieve ya no se recomienda:
    //    el orden lo da el plan para liberar flujo.

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

    // 4) (FIN-061) Sin recortes de categorías: Millo no recomienda quitar gustos.

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

      // BT-043: la nueva reemplaza a la del mismo tipo de un mes anterior (antes
      // quedaban las dos activas y la persona veía la misma tarjeta repetida).
      await this.prisma.recommendation.updateMany({
        where: { userId, kind: c.kind, status: { in: ['new', 'seen'] } },
        data: { status: 'dismissed', dismissReason: 'superseded' },
      });

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

}
