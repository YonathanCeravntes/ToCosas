import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { monthStart, monthStartMinus } from '../financial-engine/metrics/series.util';
import { detectRecurrence, MonthlyObservation } from './recurrence.util';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

/** Meses de historial analizados por corrida. */
const LOOKBACK_MONTHS = 6;
/** Un hecho no reconfirmado en este lapso se marca stale (deja de usarse). */
const STALE_AFTER_DAYS = 60;

/**
 * Memoria financiera estructurada (FIN-006 §4.4) — SIN embeddings (DEC-0001
 * §5.2). `content` siempre es plantilla del Motor: seguro para el LLM.
 * Categorías creadas por el usuario se refieren de forma anónima
 * ("categoría personalizada #N"), igual que en el ContextAssembler.
 */
@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Analiza a un usuario: recurrencias de gasto/ingreso + fechas clave. */
  async analyzeUser(userId: string, now: Date = new Date()): Promise<number> {
    let confirmed = 0;
    confirmed += await this.detectExpenseRecurrences(userId, now);
    confirmed += await this.detectIncomeRecurrence(userId, now);
    confirmed += await this.registerKeyDates(userId, now);
    await this.markStale(userId, now);
    return confirmed;
  }

  /** Hechos vigentes (no stale, no borrados) para contexto/consulta. */
  async activeFacts(userId: string, limit = 12) {
    return this.prisma.financialMemoryFact.findMany({
      where: { userId, deletedAt: null, staleAt: null },
      orderBy: [{ confidence: 'desc' }, { lastConfirmedAt: 'desc' }],
      take: limit,
    });
  }

  // --- Detectores ---

  private async detectExpenseRecurrences(userId: string, now: Date): Promise<number> {
    const from = monthStartMinus(now, LOOKBACK_MONTHS - 1);
    const txs = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        kind: 'gasto',
        categoryId: { not: null },
        occurredAt: { gte: from },
      },
      include: { category: { select: { name: true, isGlobal: true, createdAt: true } } },
    });

    // Agrupar por categoría → mes.
    const byCat = new Map<
      string,
      { isGlobal: boolean; createdAt: Date; months: Map<string, { amount: number; days: number[] }> }
    >();
    for (const t of txs) {
      if (!t.category) continue;
      const cat = byCat.get(t.category.name) ?? {
        isGlobal: t.category.isGlobal,
        createdAt: t.category.createdAt,
        months: new Map(),
      };
      const mk = monthStart(t.occurredAt).toISOString().slice(0, 7);
      const m = cat.months.get(mk) ?? { amount: 0, days: [] };
      m.amount += Number(t.amount);
      m.days.push(t.occurredAt.getUTCDate());
      cat.months.set(mk, m);
      byCat.set(t.category.name, cat);
    }

    // Nombre visible: global → real; de usuario → "categoría personalizada #N".
    const customs = [...byCat.entries()]
      .filter(([, v]) => !v.isGlobal)
      .sort(([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime());

    let confirmed = 0;
    for (const [name, cat] of byCat.entries()) {
      const obs: MonthlyObservation[] = [...cat.months.entries()].map(([mk, m]) => ({
        monthKey: mk,
        amount: m.amount,
        dayOfMonth: Math.round(m.days.sort((a, b) => a - b)[Math.floor(m.days.length / 2)]),
      }));
      const pattern = detectRecurrence(obs);
      if (!pattern) continue;
      const label = cat.isGlobal
        ? name
        : `categoría personalizada #${customs.findIndex(([n]) => n === name) + 1}`;
      confirmed += await this.upsertFact(userId, {
        kind: 'recurrencia',
        dedupeKey: `recurrencia:gasto:${label}`,
        content: `Gasto recurrente en ${label}: ~${fmt(pattern.medianAmount)} cerca del día ${pattern.medianDay}.`,
        tags: ['gasto', 'recurrente', label],
        payload: pattern as unknown as Record<string, unknown>,
        confidence: pattern.confidence,
        now,
      });
    }
    return confirmed;
  }

  private async detectIncomeRecurrence(userId: string, now: Date): Promise<number> {
    const from = monthStartMinus(now, LOOKBACK_MONTHS - 1);
    const txs = await this.prisma.transaction.findMany({
      where: { userId, deletedAt: null, kind: 'ingreso', occurredAt: { gte: from } },
    });
    const months = new Map<string, { amount: number; days: number[] }>();
    for (const t of txs) {
      const mk = monthStart(t.occurredAt).toISOString().slice(0, 7);
      const m = months.get(mk) ?? { amount: 0, days: [] };
      m.amount += Number(t.amount);
      m.days.push(t.occurredAt.getUTCDate());
      months.set(mk, m);
    }
    const obs: MonthlyObservation[] = [...months.entries()].map(([mk, m]) => ({
      monthKey: mk,
      amount: m.amount,
      dayOfMonth: Math.round(m.days.sort((a, b) => a - b)[Math.floor(m.days.length / 2)]),
    }));
    const pattern = detectRecurrence(obs);
    if (!pattern) return 0;
    return this.upsertFact(userId, {
      kind: 'recurrencia',
      dedupeKey: 'recurrencia:ingreso:mensual',
      content: `Ingreso mensual estable de ~${fmt(pattern.medianAmount)}, usualmente cerca del día ${pattern.medianDay}.`,
      tags: ['ingreso', 'recurrente'],
      payload: pattern as unknown as Record<string, unknown>,
      confidence: pattern.confidence,
      now,
    });
  }

  /** Fechas clave desde paymentDay de deudas y dayOfMonth de fijos. */
  private async registerKeyDates(userId: string, now: Date): Promise<number> {
    const [debts, fixed] = await Promise.all([
      this.prisma.debt.findMany({
        where: { userId, deletedAt: null, status: 'activa', paymentDay: { not: null } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.fixedItem.findMany({
        where: { userId, deletedAt: null, isActive: true, dayOfMonth: { not: null } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    let confirmed = 0;
    for (const [i, d] of debts.entries()) {
      confirmed += await this.upsertFact(userId, {
        kind: 'fecha_clave',
        dedupeKey: `fecha:deuda:${d.id}`,
        content: `La cuota de la deuda #${i + 1} (${d.debtType}) vence cerca del día ${d.paymentDay}.`,
        tags: ['deuda', 'vencimiento'],
        payload: { day: d.paymentDay, debtType: d.debtType },
        confidence: 0.99,
        now,
      });
    }
    for (const [i, f] of fixed.entries()) {
      confirmed += await this.upsertFact(userId, {
        kind: 'fecha_clave',
        dedupeKey: `fecha:fijo:${f.id}`,
        content: `El ${f.kind === 'ingreso' ? 'ingreso' : 'gasto'} fijo #${i + 1} aplica cerca del día ${f.dayOfMonth}.`,
        tags: [f.kind, 'fecha'],
        payload: { day: f.dayOfMonth, kind: f.kind },
        confidence: 0.99,
        now,
      });
    }
    return confirmed;
  }

  /** Ciclo de vida (§4.4): sin reconfirmación en 60 días → stale. */
  private async markStale(userId: string, now: Date): Promise<void> {
    const cutoff = new Date(now.getTime() - STALE_AFTER_DAYS * 86_400_000);
    await this.prisma.financialMemoryFact.updateMany({
      where: { userId, deletedAt: null, staleAt: null, lastConfirmedAt: { lt: cutoff } },
      data: { staleAt: now },
    });
  }

  private async upsertFact(
    userId: string,
    input: {
      kind: 'recurrencia' | 'fecha_clave' | 'habito' | 'cambio';
      dedupeKey: string;
      content: string;
      tags: string[];
      payload: Record<string, unknown>;
      confidence: number;
      now: Date;
    },
  ): Promise<number> {
    await this.prisma.financialMemoryFact.upsert({
      where: { userId_dedupeKey: { userId, dedupeKey: input.dedupeKey } },
      create: {
        userId,
        kind: input.kind,
        dedupeKey: input.dedupeKey,
        content: input.content,
        tags: input.tags,
        payload: input.payload as Prisma.InputJsonValue,
        confidence: input.confidence,
        observedAt: input.now,
        lastConfirmedAt: input.now,
      },
      update: {
        content: input.content,
        tags: input.tags,
        payload: input.payload as Prisma.InputJsonValue,
        confidence: input.confidence,
        lastConfirmedAt: input.now,
        staleAt: null, // reconfirmado → vuelve a estar vigente
      },
    });
    return 1;
  }
}
