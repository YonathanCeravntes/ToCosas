import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InsightsService } from '../insights/insights.service';
import { MetricKey } from '../financial-engine/engine.constants';
import { monthStart, monthStartMinus } from '../financial-engine/metrics/series.util';
import { scoreBand } from '../health/score.util';
import { DISCRETIONARY_GLOBAL_CATEGORIES } from '../recommendations/recommendations.constants';
import {
  ACHIEVEMENT_CATALOG,
  CHALLENGE_DEFS,
  CHALLENGE_XP,
  LEVELS,
  STREAK_XP_CAP_WEEKS,
  STREAK_XP_PER_WEEK,
} from './gamification.constants';
import { isoWeekKey, isoWeeksOfMonth, previousIsoWeekKey } from './week.util';

/**
 * Gamificación (FIN-008). Sin IA, sin canales de notificación propios: la
 * celebración de un logro crea un Insight `logro` (FIN-006) que compite por el
 * único cupo proactivo diario del presupuesto (FIN-007) — cero fatiga nueva.
 */
@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly insights: InsightsService,
  ) {}

  // ---------- Racha (§4.1) ----------

  /** Actualiza la racha semanal ante actividad. Idempotente por semana ISO. */
  async registerActivity(userId: string, when: Date = new Date()): Promise<void> {
    const week = isoWeekKey(when);
    const prevWeek = previousIsoWeekKey(when);
    const streak = await this.prisma.streak.findUnique({
      where: { userId_kind: { userId, kind: 'registro_semanal' } },
    });
    if (!streak) {
      await this.prisma.streak.create({
        data: { userId, kind: 'registro_semanal', current: 1, best: 1, lastPeriod: week },
      });
      return;
    }
    if (streak.lastPeriod === week) return; // misma semana: no-op
    const current = streak.lastPeriod === prevWeek ? streak.current + 1 : 1;
    await this.prisma.streak.update({
      where: { id: streak.id },
      data: { current, best: Math.max(streak.best, current), lastPeriod: week },
    });
    if (current >= 4) await this.unlock(userId, 'racha_4');
    if (current >= 12) await this.unlock(userId, 'racha_12');
  }

  // ---------- Logros (§4.2) ----------

  /** Desbloquea un logro (idempotente) y crea su celebración como Insight. */
  async unlock(userId: string, code: string): Promise<boolean> {
    const def = ACHIEVEMENT_CATALOG.find((a) => a.code === code);
    if (!def) return false;
    try {
      await this.prisma.achievement.create({ data: { userId, code } });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') return false; // ya lo tenía
      throw e;
    }
    // Celebración por la vía existente (cero rutas nuevas, DEC-0008 §4.5).
    await this.insights.createIfNew({
      userId,
      type: 'logro',
      severity: 'info',
      title: `🏆 ${def.title}`,
      body: def.body,
      dedupeKey: `gami_${code}`,
      payload: { achievement: code, xp: def.xp },
    });
    return true;
  }

  /** Evaluación nightly: logros derivados de datos/métricas. Idempotente. */
  async evaluateAchievements(userId: string, now: Date = new Date()): Promise<number> {
    let unlocked = 0;
    const has = async (code: string) =>
      !!(await this.prisma.achievement.findUnique({
        where: { userId_code: { userId, code } },
      }));

    const checks: Array<[string, () => Promise<boolean>]> = [
      ['primer_movimiento', async () => !!(await this.prisma.transaction.findFirst({ where: { userId, deletedAt: null } }))],
      ['primera_deuda', async () => !!(await this.prisma.debt.findFirst({ where: { userId, deletedAt: null } }))],
      ['primera_cuenta', async () => !!(await this.prisma.account.findFirst({ where: { userId, deletedAt: null } })) || !!(await this.prisma.asset.findFirst({ where: { userId, deletedAt: null } }))],
      ['primer_presupuesto', async () => !!(await this.prisma.fixedItem.findFirst({ where: { userId, deletedAt: null } }))],
      ['primera_simulacion', async () => !!(await this.prisma.simulation.findFirst({ where: { userId } }))],
      ['deuda_saldada', async () => !!(await this.prisma.debt.findFirst({ where: { userId, status: 'pagada' } }))],
    ];

    const metrics = await this.readMonth(userId, monthStart(now));
    const fund = metrics.get(MetricKey.EmergencyFundMonths);
    const score = metrics.get('score');
    if (fund !== undefined) {
      checks.push(['fondo_3m', async () => fund >= 3]);
      checks.push(['fondo_6m', async () => fund >= 6]);
    }
    if (score !== undefined) {
      const band = scoreBand(score);
      checks.push(['score_saludable', async () => band === 'saludable' || band === 'elite']);
      checks.push(['score_elite', async () => band === 'elite']);
    }

    for (const [code, check] of checks) {
      if (await has(code)) continue;
      if (await check()) {
        if (await this.unlock(userId, code)) unlocked += 1;
      }
    }
    return unlocked;
  }

  // ---------- Retos (§4.4 + DEC-0008 §10) ----------

  /**
   * Asignación mensual con criterio de ELEGIBILIDAD (DEC-0008 §10.2), en orden:
   *  1. `bajo_promedio`: solo si hay gasto en alguna categoría discrecional
   *     curada en los últimos 3 meses (no se adivina sobre texto libre).
   *  2. `flujo_positivo`: solo si el cashflow promedio de 3 meses NO es
   *     estructuralmente negativo (peor que −20% del ingreso de referencia).
   *  3. `registro_constante`: SIEMPRE elegible — reto por defecto. Garantiza
   *     que todo usuario activo reciba exactamente 1 reto, nunca ninguno.
   */
  async assignChallenge(userId: string, now: Date = new Date()): Promise<string | null> {
    const month = monthStart(now).toISOString().slice(0, 7);
    const existing = await this.prisma.challenge.findFirst({ where: { userId, month } });
    if (existing) return null; // ya tiene reto este mes

    let code = 'registro_constante';
    if (await this.eligibleBajoPromedio(userId, now)) {
      code = 'bajo_promedio';
    } else if (await this.eligibleFlujoPositivo(userId, now)) {
      code = 'flujo_positivo';
    }

    const target =
      code === 'bajo_promedio'
        ? await this.bajoPromedioTarget(userId, now)
        : code === 'registro_constante'
          ? { weeks: isoWeeksOfMonth(month) }
          : {};

    await this.prisma.challenge.create({
      data: { userId, code, month, target: target as Prisma.InputJsonValue, progress: {} },
    });
    return code;
  }

  /** Evalúa el reto activo del mes (progreso y cierre). */
  async evaluateChallenge(userId: string, now: Date = new Date()): Promise<void> {
    const month = monthStart(now).toISOString().slice(0, 7);
    const challenge = await this.prisma.challenge.findFirst({
      where: { userId, month, status: 'active' },
    });
    if (!challenge) return;

    const from = monthStart(now);
    const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
    const isMonthOver = now >= to;

    let progress: Record<string, unknown> = {};
    let completed = false;

    if (challenge.code === 'registro_constante') {
      const weeks = ((challenge.target as { weeks?: string[] })?.weeks ?? isoWeeksOfMonth(month));
      const txs = await this.prisma.transaction.findMany({
        where: { userId, deletedAt: null, occurredAt: { gte: from, lt: to } },
        select: { occurredAt: true },
      });
      const covered = new Set(txs.map((t) => isoWeekKey(t.occurredAt)));
      const hit = weeks.filter((w) => covered.has(w));
      progress = { covered: hit.length, required: weeks.length };
      completed = hit.length === weeks.length;
    } else if (challenge.code === 'flujo_positivo') {
      const cashflow = (await this.readMonth(userId, from)).get(MetricKey.Cashflow) ?? 0;
      progress = { cashflow };
      completed = isMonthOver && cashflow > 0;
    } else if (challenge.code === 'bajo_promedio') {
      const target = challenge.target as { category?: string; avg?: number };
      const spent = await this.categorySpendMonth(userId, target.category ?? '', from, to);
      progress = { spent, avg: target.avg ?? 0 };
      completed = isMonthOver && spent < (target.avg ?? 0);
    }

    const status = completed ? 'completed' : isMonthOver ? 'failed' : 'active';
    await this.prisma.challenge.update({
      where: { id: challenge.id },
      data: { progress: progress as Prisma.InputJsonValue, status },
    });
  }

  // ---------- Perfil (XP/nivel on-read, §4.3) ----------

  async profile(userId: string, now: Date = new Date()) {
    const [achievements, streak, completedChallenges, currentChallenge] = await Promise.all([
      this.prisma.achievement.findMany({ where: { userId } }),
      this.prisma.streak.findUnique({
        where: { userId_kind: { userId, kind: 'registro_semanal' } },
      }),
      this.prisma.challenge.count({ where: { userId, status: 'completed' } }),
      this.prisma.challenge.findFirst({
        where: { userId, month: monthStart(now).toISOString().slice(0, 7) },
      }),
    ]);

    const unlockedCodes = new Map(achievements.map((a) => [a.code, a]));
    const achievementXp = ACHIEVEMENT_CATALOG.filter((a) => unlockedCodes.has(a.code)).reduce(
      (s, a) => s + a.xp,
      0,
    );
    const streakBonus = Math.min(streak?.best ?? 0, STREAK_XP_CAP_WEEKS) * STREAK_XP_PER_WEEK;
    const xp = achievementXp + streakBonus + completedChallenges * CHALLENGE_XP;
    const level = [...LEVELS].reverse().find((l) => xp >= l.minXp) ?? LEVELS[0];
    const next = LEVELS.find((l) => l.minXp > xp) ?? null;

    return {
      xp,
      level: { number: level.level, name: level.name, nextAt: next?.minXp ?? null },
      streak: { current: streak?.current ?? 0, best: streak?.best ?? 0 },
      achievements: ACHIEVEMENT_CATALOG.map((def) => ({
        code: def.code,
        title: def.title,
        condition: def.condition,
        xp: def.xp,
        unlockedAt: unlockedCodes.get(def.code)?.unlockedAt ?? null,
        seenAt: unlockedCodes.get(def.code)?.seenAt ?? null,
      })),
      challenge: currentChallenge
        ? {
            code: currentChallenge.code,
            title: CHALLENGE_DEFS[currentChallenge.code]?.title ?? currentChallenge.code,
            body: CHALLENGE_DEFS[currentChallenge.code]?.body ?? '',
            status: currentChallenge.status,
            progress: currentChallenge.progress,
          }
        : null,
    };
  }

  /** Marca como vistos los logros (cierra la celebración in-app). */
  async markSeen(userId: string): Promise<void> {
    await this.prisma.achievement.updateMany({
      where: { userId, seenAt: null },
      data: { seenAt: new Date() },
    });
  }

  // ---------- helpers ----------

  private async eligibleBajoPromedio(userId: string, now: Date): Promise<boolean> {
    const from = monthStartMinus(now, 3);
    const count = await this.prisma.transaction.count({
      where: {
        userId,
        deletedAt: null,
        kind: 'gasto',
        occurredAt: { gte: from },
        category: { isGlobal: true, name: { in: DISCRETIONARY_GLOBAL_CATEGORIES } },
      },
    });
    return count > 0;
  }

  private async eligibleFlujoPositivo(userId: string, now: Date): Promise<boolean> {
    // Promedio de cashflow de los 3 meses previos vs −20% del ingreso de referencia.
    const flows: number[] = [];
    let incomeRef = 0;
    for (let i = 1; i <= 3; i++) {
      const m = await this.readMonth(userId, monthStartMinus(now, i));
      const c = m.get(MetricKey.Cashflow);
      if (c !== undefined) flows.push(c);
      incomeRef = Math.max(incomeRef, m.get(MetricKey.EssentialExpense) ?? 0);
    }
    if (flows.length === 0) return true; // sin historial → no hay evidencia de imposibilidad
    const avg = flows.reduce((a, v) => a + v, 0) / flows.length;
    const current = await this.readMonth(userId, monthStart(now));
    const ref = Math.max(incomeRef, (current.get(MetricKey.EssentialExpense) ?? 0), 1);
    return avg > -0.2 * ref;
  }

  private async bajoPromedioTarget(userId: string, now: Date) {
    // Categoría curada con mayor gasto en 3 meses + su promedio mensual.
    const from = monthStartMinus(now, 3);
    const txs = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        kind: 'gasto',
        occurredAt: { gte: from, lt: monthStart(now) },
        category: { isGlobal: true, name: { in: DISCRETIONARY_GLOBAL_CATEGORIES } },
      },
      include: { category: { select: { name: true } } },
    });
    const byCat = new Map<string, number>();
    for (const t of txs) {
      const n = t.category?.name ?? '';
      byCat.set(n, (byCat.get(n) ?? 0) + Number(t.amount));
    }
    const top = [...byCat.entries()].sort(([, a], [, b]) => b - a)[0];
    return { category: top?.[0] ?? DISCRETIONARY_GLOBAL_CATEGORIES[0], avg: Math.round((top?.[1] ?? 0) / 3) };
  }

  private async categorySpendMonth(userId: string, category: string, from: Date, to: Date) {
    const txs = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        kind: 'gasto',
        occurredAt: { gte: from, lt: to },
        category: { isGlobal: true, name: category },
      },
    });
    return txs.reduce((a, t) => a + Number(t.amount), 0);
  }

  private async readMonth(userId: string, capturedAt: Date): Promise<Map<string, number>> {
    const rows = await this.prisma.metricReading.findMany({
      where: { userId, period: 'month', capturedAt },
    });
    return new Map(rows.map((r) => [r.metricKey, Number(r.value)]));
  }
}
