/**
 * FIN-061 Fase 2.4 · Salud de tu tarjeta (función pura). Estudio "Gustos, tarjetas y
 * plata del mes", aprobado por el Fundador el 2026-10-04.
 *
 * Las 12 reglas:
 *  1. Uso del cupo > 70 % dos cortes seguidos → cuánto abonar para bajar de 50 % (meta 30 %).
 *  2. Uso del cupo ≥ 90 % → poco margen para imprevistos; pausar compras unos días.
 *  3. Antes de la fecha de pago: PAGO SUGERIDO primero, luego el total, al final el mínimo
 *     (rompe el ancla del mínimo — Keys y Wang 2019).
 *  4. Solo el mínimo 2 meses seguidos → simulación con $100.000 más al mes.
 *  5. Compra de menos de $300.000 a más de 3 cuotas con interés → cuánto cuesta de más.
 *  6. Compra a 24 cuotas o más → costo total; bajar el plazo desde la app del banco.
 *  7. Cuotas de tarjetas > 20 % del ingreso → calendario de cuándo se libera cada cuota.
 *  8. Avance en efectivo → interés desde hoy más comisión; la deuda solo se mueve.
 *  9. Cuota de manejo > $15.000 y casi sin uso → cuánto cuesta al año; pedir exoneración.
 * 10. Antes de cerrar una tarjeta → cómo queda el uso total del cupo (conservar la más
 *     antigua y sin cuota de manejo).
 * 11. 5 días y 1 día antes del pago sin pago registrado → recordatorio con el saldo.
 * 12. Gasto del ciclo 25 % sobre tu promedio → resumen por categoría a mitad de ciclo.
 * Sin marcas ni entidades en los textos (DEC-0005 §14.2).
 */

export const CARD_HEALTH = {
  goal: 0.3,
  healthy: 0.5,
  high: 0.7,
  critical: 0.9,
  minOnlySlack: 1.05,
  minOnlyExtra: 100_000,
  smallPurchase: 300_000,
  smallMaxInstallments: 3,
  longInstallments: 24,
  cardLoadShare: 0.2,
  handlingFeeMin: 15_000,
  lowUsePurchases: 2,
  reminderDays: [5, 1],
  cycleOverAverage: 1.25,
  recentDays: 60,
} as const;

export interface StatementIn {
  closingDate: Date;
  dueDate: Date | null;
  statementBalance: number;
  minimumPayment: number | null;
  totalPayment: number | null;
  creditLimit: number | null;
  handlingFee: number | null;
}

export interface PurchaseIn {
  id: string;
  amount: number;
  occurredAt: Date;
  installmentsCount: number;
  withInterest: boolean;
  isCashAdvance: boolean;
  categoryName: string | null;
  /** Cuota por compra y última fecha de cuota pendiente (para el calendario). */
  perInstallment: number;
  pendingBalance: number;
  lastDueDate: Date | null;
}

export interface CardHealthInput {
  now: Date;
  incomeBase: number;
  monthlyRate: number;
  creditLimit: number | null;
  /** Lo que se debe hoy (Σ cuotas pendientes). */
  usedAmount: number;
  /** Cuota de este mes de la tarjeta (desembolso real). */
  cuota: number;
  /** Abono extra del plan para liberar flujo si esta tarjeta es la primera (0 si no). */
  planExtra: number;
  /** Cuotas de TODAS las tarjetas al mes (regla 7). */
  allCardsCuota: number;
  /** Las demás tarjetas (regla 10). */
  otherCards: Array<{ creditLimit: number | null; used: number }>;
  nextDueDate: Date | null;
  /** Extractos, del más reciente al más viejo. */
  statements: StatementIn[];
  /** Pagos a esta tarjeta (pago_deuda). */
  payments: Array<{ date: Date; amount: number }>;
  purchases: PurchaseIn[];
}

export type CardLevel = 'meta' | 'bien' | 'atencion' | 'alto' | 'critico';

export interface CardAlert {
  rule: number;
  kind: string;
  title: string;
  body: string;
  amount?: number;
}

export interface CardHealth {
  utilization: {
    current: number | null;
    level: CardLevel | null;
    /** Uso del cupo en los últimos cortes (más reciente primero). */
    byStatement: Array<{ closingDate: string; utilization: number }>;
    /** Abono para llegar a 50 % y a la meta de 30 % (0 si ya está por debajo). */
    toHealthy: number;
    toGoal: number;
  };
  /** Regla 3: en este orden — sugerido, total, mínimo. */
  payment: {
    dueDate: string | null;
    suggested: number | null;
    cuota: number;
    planExtra: number;
    total: number | null;
    minimum: number | null;
  };
  alerts: CardAlert[];
  /** Regla 7: cuándo se libera cada cuota (mes AAAA-MM → cuánto deja de salir). */
  releaseCalendar: Array<{ month: string; frees: number }> | null;
  /** Regla 10: uso total del cupo si cerraras esta tarjeta. */
  ifClosed: { totalUtilizationNow: number | null; totalUtilizationIfClosed: number | null } | null;
  /** Regla 12: resumen del ciclo por categoría. */
  cycle: { spent: number; average: number | null; byCategory: Array<{ name: string; amount: number }> } | null;
}

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
const pct = (f: number) => `${Math.round(f * 100)} %`;
const DAY = 86_400_000;
const r = (n: number) => Math.round(n);

export function levelFor(u: number): CardLevel {
  if (u <= CARD_HEALTH.goal) return 'meta';
  if (u <= CARD_HEALTH.healthy) return 'bien';
  if (u <= CARD_HEALTH.high) return 'atencion';
  if (u < CARD_HEALTH.critical) return 'alto';
  return 'critico';
}

/** Meses y su interés total pagando `payment` fijo al mes (null si nunca termina). */
export function payoff(balance: number, monthlyRate: number, payment: number): { months: number; interest: number } | null {
  let b = balance;
  let interest = 0;
  for (let m = 1; m <= 600; m++) {
    const i = b * monthlyRate;
    if (payment <= i) return null;
    interest += i;
    b = b + i - payment;
    if (b <= 0.5) return { months: m, interest: r(interest) };
  }
  return null;
}

/** Interés total de una compra a `n` cuotas (cuota francesa). */
function purchaseInterest(amount: number, monthlyRate: number, n: number): number {
  if (n <= 1 || monthlyRate <= 0) return 0;
  const p = (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
  return Math.max(0, r(p * n - amount));
}

export function cardHealth(input: CardHealthInput): CardHealth {
  const alerts: CardAlert[] = [];
  const latest = input.statements[0];
  const limit = latest?.creditLimit ?? input.creditLimit;

  // --- Reglas 1 y 2: uso del cupo ---
  const byStatement = input.statements
    .map((s) => {
      const lim = s.creditLimit ?? input.creditLimit;
      return lim && lim > 0 ? { closingDate: s.closingDate.toISOString().slice(0, 10), utilization: s.statementBalance / lim } : null;
    })
    .filter((x): x is { closingDate: string; utilization: number } => x !== null);
  const current = limit && limit > 0 ? input.usedAmount / limit : null;
  const toHealthy = limit ? Math.max(0, r(input.usedAmount - limit * CARD_HEALTH.healthy)) : 0;
  const toGoal = limit ? Math.max(0, r(input.usedAmount - limit * CARD_HEALTH.goal)) : 0;
  if (current != null && current >= CARD_HEALTH.critical) {
    alerts.push({
      rule: 2,
      kind: 'cupo_critico',
      title: `Usas el ${pct(current)} del cupo`,
      body: 'Te queda poco margen para imprevistos. Si puedes, pausa las compras con esta tarjeta unos días.',
    });
  } else if (byStatement.length >= 2 && byStatement[0].utilization > CARD_HEALTH.high && byStatement[1].utilization > CARD_HEALTH.high) {
    alerts.push({
      rule: 1,
      kind: 'cupo_alto',
      title: 'Dos cortes seguidos sobre el 70 % del cupo',
      body: `Con ${fmt(toHealthy)} de abono bajas a 50 %, y eso ayuda a tu historial. La meta es quedar por debajo de 30 %.`,
      amount: toHealthy,
    });
  }

  // --- Regla 3: pago sugerido primero ---
  const total = latest?.totalPayment ?? latest?.statementBalance ?? null;
  const minimum = latest?.minimumPayment ?? null;
  let suggested: number | null = input.cuota + input.planExtra;
  if (minimum != null) suggested = Math.max(suggested, minimum);
  if (total != null) suggested = Math.min(suggested, total);
  if (suggested <= 0) suggested = null;
  const dueDate = latest?.dueDate ?? input.nextDueDate;

  // --- Regla 4: solo el mínimo dos meses seguidos ---
  if (input.statements.length >= 3) {
    const paidBetween = (from: Date, to: Date) =>
      input.payments.filter((p) => p.date > from && p.date <= to).reduce((a, p) => a + p.amount, 0);
    const [s0, s1, s2] = input.statements;
    const onlyMin = (prev: StatementIn, s: StatementIn) => {
      if (prev.minimumPayment == null || prev.minimumPayment <= 0) return false;
      const paid = paidBetween(prev.closingDate, s.closingDate);
      return paid > 0 && paid <= prev.minimumPayment * CARD_HEALTH.minOnlySlack;
    };
    if (onlyMin(s1, s0) && onlyMin(s2, s1) && s0.minimumPayment && input.monthlyRate > 0) {
      const base = payoff(s0.statementBalance, input.monthlyRate, s0.minimumPayment);
      const more = payoff(s0.statementBalance, input.monthlyRate, s0.minimumPayment + CARD_HEALTH.minOnlyExtra);
      if (more) {
        const saved = base ? base.interest - more.interest : null;
        alerts.push({
          rule: 4,
          kind: 'solo_minimo',
          title: 'Dos meses pagando solo el mínimo',
          body: base
            ? `Con ${fmt(CARD_HEALTH.minOnlyExtra)} más al mes terminas en ${more.months} meses en vez de ${base.months} y te ahorras ${fmt(saved ?? 0)} de intereses.`
            : `Con el mínimo, el saldo casi no baja. Con ${fmt(CARD_HEALTH.minOnlyExtra)} más al mes terminas en ${more.months} meses.`,
          amount: saved ?? undefined,
        });
      }
    }
  }

  // --- Reglas 5, 6 y 8: compras recientes ---
  const recent = input.purchases.filter((p) => input.now.getTime() - p.occurredAt.getTime() <= CARD_HEALTH.recentDays * DAY);
  for (const p of recent) {
    const label = p.categoryName ? `de ${p.categoryName.toLowerCase()} ` : '';
    if (p.isCashAdvance) {
      const interest = purchaseInterest(p.amount, input.monthlyRate, Math.max(1, p.installmentsCount));
      alerts.push({
        rule: 8,
        kind: 'avance',
        title: `Avance en efectivo de ${fmt(p.amount)}`,
        body: `Cobra interés desde hoy, más la comisión del avance${interest > 0 ? ` (unos ${fmt(interest)} en total a ${p.installmentsCount} cuotas)` : ''}. Si fue para pagar otra tarjeta, la deuda solo se movió de lugar.`,
        amount: interest,
      });
      continue;
    }
    if (!p.withInterest) continue;
    if (p.installmentsCount >= CARD_HEALTH.longInstallments) {
      const interest = purchaseInterest(p.amount, input.monthlyRate, p.installmentsCount);
      alerts.push({
        rule: 6,
        kind: 'cuotas_largas',
        title: `Una compra ${label}a ${p.installmentsCount} cuotas`,
        body: `${fmt(p.amount)} terminan costando unos ${fmt(p.amount + interest)} (${pct(interest / p.amount)} más). Puedes bajar el plazo desde la app de tu banco.`,
        amount: interest,
      });
    } else if (p.amount < CARD_HEALTH.smallPurchase && p.installmentsCount > CARD_HEALTH.smallMaxInstallments) {
      const interest = purchaseInterest(p.amount, input.monthlyRate, p.installmentsCount);
      if (interest > 0) {
        alerts.push({
          rule: 5,
          kind: 'compra_pequena_cuotas',
          title: `Una compra pequeña a ${p.installmentsCount} cuotas`,
          body: `La compra ${label}de ${fmt(p.amount)} te va a costar unos ${fmt(interest)} extra. La próxima vez, a 1 cuota no paga interés en la mayoría de bancos.`,
          amount: interest,
        });
      }
    }
  }

  // --- Regla 7: carga de cuotas de tarjetas ---
  let releaseCalendar: CardHealth['releaseCalendar'] = null;
  if (input.incomeBase > 0 && input.allCardsCuota > input.incomeBase * CARD_HEALTH.cardLoadShare) {
    const byMonth = new Map<string, number>();
    for (const p of input.purchases) {
      if (p.pendingBalance <= 0 || !p.lastDueDate) continue;
      const d = new Date(Date.UTC(p.lastDueDate.getUTCFullYear(), p.lastDueDate.getUTCMonth() + 1, 1));
      const k = d.toISOString().slice(0, 7);
      byMonth.set(k, (byMonth.get(k) ?? 0) + p.perInstallment);
    }
    releaseCalendar = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, frees]) => ({ month, frees: r(frees) }));
    alerts.push({
      rule: 7,
      kind: 'carga_cuotas',
      title: 'Las cuotas de tus tarjetas pesan',
      body: `Suman ${fmt(input.allCardsCuota)} al mes, ${pct(input.allCardsCuota / input.incomeBase)} de tu ingreso. Mira cuándo se libera cada una antes de diferir algo nuevo.`,
      amount: r(input.allCardsCuota),
    });
  }

  // --- Regla 9: cuota de manejo con poco uso ---
  const fee = latest?.handlingFee ?? null;
  if (fee != null && fee > CARD_HEALTH.handlingFeeMin && recent.length < CARD_HEALTH.lowUsePurchases) {
    alerts.push({
      rule: 9,
      kind: 'cuota_manejo',
      title: `La cuota de manejo te cuesta ${fmt(fee * 12)} al año`,
      body: 'Casi no usas esta tarjeta. Puedes pedir que te la exoneren o pasarte a una sin cuota de manejo.',
      amount: r(fee * 12),
    });
  }

  // --- Regla 10: si la cerraras ---
  let ifClosed: CardHealth['ifClosed'] = null;
  if (input.otherCards.length > 0) {
    const others = input.otherCards.filter((c) => c.creditLimit && c.creditLimit > 0);
    const oLim = others.reduce((a, c) => a + (c.creditLimit ?? 0), 0);
    const oUsed = others.reduce((a, c) => a + c.used, 0);
    const allLim = oLim + (limit ?? 0);
    ifClosed = {
      totalUtilizationNow: allLim > 0 ? (oUsed + input.usedAmount) / allLim : null,
      totalUtilizationIfClosed: oLim > 0 ? (oUsed + input.usedAmount) / oLim : null,
    };
  }

  // --- Regla 11: recordatorio antes del pago ---
  if (dueDate) {
    const days = Math.ceil((Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()) - Date.UTC(input.now.getUTCFullYear(), input.now.getUTCMonth(), input.now.getUTCDate())) / DAY);
    const since = latest?.closingDate ?? new Date(dueDate.getTime() - 30 * DAY);
    const paid = input.payments.some((p) => p.date > since);
    if (days >= 0 && days <= CARD_HEALTH.reminderDays[0] && !paid) {
      alerts.push({
        rule: 11,
        kind: 'pago_cerca',
        title: days === 0 ? 'Hoy vence el pago de tu tarjeta' : `Faltan ${days} día${days === 1 ? '' : 's'} para el pago de tu tarjeta`,
        body: `Pago sugerido: ${fmt(suggested ?? input.cuota)}. Revisa que tengas el saldo en tu cuenta para no quedar en sobregiro; también puedes activar el débito automático del pago total.`,
        amount: suggested ?? undefined,
      });
    }
  }

  // --- Regla 12: gasto del ciclo frente a tu promedio ---
  let cycle: CardHealth['cycle'] = null;
  const cycleStart = latest?.closingDate ?? new Date(Date.UTC(input.now.getUTCFullYear(), input.now.getUTCMonth(), 1));
  const inCycle = input.purchases.filter((p) => p.occurredAt > cycleStart && !p.isCashAdvance);
  const spent = inCycle.reduce((a, p) => a + p.amount, 0);
  const prevCycles: number[] = [];
  for (let i = 0; i + 1 < input.statements.length && i < 3; i++) {
    const to = input.statements[i].closingDate;
    const from = input.statements[i + 1].closingDate;
    prevCycles.push(input.purchases.filter((p) => p.occurredAt > from && p.occurredAt <= to && !p.isCashAdvance).reduce((a, p) => a + p.amount, 0));
  }
  const average = prevCycles.length ? prevCycles.reduce((a, v) => a + v, 0) / prevCycles.length : null;
  if (spent > 0) {
    const cats = new Map<string, number>();
    for (const p of inCycle) cats.set(p.categoryName ?? 'Sin categoría', (cats.get(p.categoryName ?? 'Sin categoría') ?? 0) + p.amount);
    cycle = {
      spent: r(spent),
      average: average != null ? r(average) : null,
      byCategory: [...cats.entries()].map(([name, amount]) => ({ name, amount: r(amount) })).sort((a, b) => b.amount - a.amount),
    };
    if (average && average > 0 && spent > average * CARD_HEALTH.cycleOverAverage) {
      alerts.push({
        rule: 12,
        kind: 'ciclo_alto',
        title: 'Este ciclo va por encima de tu promedio',
        body: `Llevas ${fmt(spent)} con la tarjeta desde el último corte; tu promedio es ${fmt(average)}. Mira en qué se fue y, si quieres, ponte un tope semanal.`,
        amount: r(spent - average),
      });
    }
  }

  return {
    utilization: {
      current: current != null ? Math.round(current * 1000) / 1000 : null,
      level: current != null ? levelFor(current) : null,
      byStatement: byStatement.map((b) => ({ ...b, utilization: Math.round(b.utilization * 1000) / 1000 })),
      toHealthy,
      toGoal,
    },
    payment: {
      dueDate: dueDate ? dueDate.toISOString().slice(0, 10) : null,
      suggested: suggested != null ? r(suggested) : null,
      cuota: r(input.cuota),
      planExtra: r(input.planExtra),
      total: total != null ? r(total) : null,
      minimum: minimum != null ? r(minimum) : null,
    },
    alerts: alerts.sort((a, b) => a.rule - b.rule),
    releaseCalendar,
    ifClosed,
    cycle,
  };
}
