/**
 * FIN-045 · Plan para liberar flujo de caja (decisión del Fundador, 2026-09-29).
 *
 * En vez de "Simularlo", Millo da UN consejo concreto: a qué deuda abonarle primero
 * para que cada mes quede más plata libre, con cuánto y en cuánto tiempo.
 *
 * Reglas decididas por el Fundador:
 *  1. Orden = LIBERAR FLUJO primero: la deuda que más cuota mensual libera por cada
 *     peso abonado (cuota ÷ saldo). Empate (±2 %) → la de tasa más alta.
 *  2. Monto propuesto = la MITAD de lo que queda libre en el ciclo (`teQueda`, §32).
 *  3. Fondo de emergencia EN PARALELO: si el colchón no cubre 1 mes de gasto esencial,
 *     una parte del abono (30 %) va al colchón hasta completarlo.
 *  Al terminar una deuda, su cuota se suma al abono de la siguiente ("bola de flujo").
 *
 * Función pura: no toca la BD (el servicio le entrega las cifras de las fuentes únicas).
 */
export const PLAN_SHARE_OF_FREE = 0.5;
export const COLCHON_SHARE = 0.3;
export const COLCHON_TARGET_MONTHS = 1;
const MAX_MONTHS = 600;
const TIE = 0.02;

export interface PlanDebt {
  id: string;
  name: string;
  balance: number;
  /** Lo que sale del bolsillo al mes por esta deuda (y deja de salir al terminarla). */
  payment: number;
  /** Tasa efectiva mensual (fracción) para proyectar intereses. */
  monthlyRate: number;
  /** Tasa anual efectiva en % (solo para mostrar y desempatar). */
  annualRatePct: number;
  /** FIN-061 F2: tasa mensual real para comparar el costo de los dos órdenes (tarjetas incluidas). */
  compareRate?: number;
}

export interface CashflowPlanInput {
  /** Lo que queda libre en el ciclo (`teQueda.amount`). */
  free: number;
  /** Gasto esencial mensual (fijos de gasto + desembolso de deudas), misma definición del Motor. */
  essential: number;
  /** Saldo en cuentas marcadas como fondo de emergencia. */
  emergencyBalance: number;
  debts: PlanDebt[];
  /** Si la persona ajusta el monto mensual, reemplaza la propuesta automática. */
  monthlyOverride?: number;
}

export interface PlanStep {
  order: number;
  debtId: string;
  name: string;
  balance: number;
  payment: number;
  annualRatePct: number;
  /** Cuota liberada por cada $100 abonados (cuota ÷ saldo × 100). */
  freesPerHundred: number;
  /** Mes (1 = el próximo) en que queda pagada con el plan; null si no alcanza en 50 años. */
  monthWithPlan: number | null;
  /** Mes en que quedaría pagada solo con la cuota normal; null si nunca. */
  monthWithout: number | null;
}

export interface CashflowPlan {
  free: number;
  proposal: number;
  toDebt: number;
  toColchon: number;
  colchonGap: number;
  /** Meta del colchón (1 mes de gasto esencial) y lo que ya hay en él. */
  colchonTarget: number;
  emergencyBalance: number;
  /** Meses para completar el colchón con `toColchon` (null si no aplica). */
  colchonMonths: number | null;
  steps: PlanStep[];
  /** Plata libre extra al mes cuando termina la primera deuda. */
  firstFrees: number;
  /**
   * FIN-061 F2 (decisión 3 del Fundador): una sola regla de orden — liberar flujo — y
   * siempre a la vista cuánto costaría la otra (mayor tasa primero). null con < 2 deudas.
   */
  alternative: { interestPlan: number; interestHighestRate: number; difference: number; sameOrder: boolean } | null;
}

const roundTo1000 = (n: number) => Math.floor(n / 1000) * 1000;

export function orderByCashflow<T extends { balance: number; payment: number; annualRatePct: number }>(debts: T[]): T[] {
  const ratio = (d: T) => (d.balance > 0 && d.payment > 0 ? d.payment / d.balance : 0);
  return [...debts].sort((a, b) => {
    const ra = ratio(a);
    const rb = ratio(b);
    const hi = Math.max(ra, rb);
    if (hi > 0 && Math.abs(ra - rb) / hi <= TIE) return b.annualRatePct - a.annualRatePct;
    return rb - ra;
  });
}

/** Proyección mes a mes: cuotas normales + abono extra al primer objetivo, con rollover. */
function simulate(debts: PlanDebt[], extra: (month: number) => number): Map<string, number | null> {
  return simulateWithInterest(debts, extra).paidAt;
}

function simulateWithInterest(
  debts: PlanDebt[],
  extra: (month: number) => number,
): { paidAt: Map<string, number | null>; interest: number } {
  let interest = 0;
  const bal = new Map(debts.map((d) => [d.id, d.balance]));
  const paidAt = new Map<string, number | null>(debts.map((d) => [d.id, d.balance <= 0.5 ? 0 : null]));
  let freed = 0;
  for (let m = 1; m <= MAX_MONTHS; m++) {
    const open = debts.filter((d) => paidAt.get(d.id) === null);
    if (open.length === 0) break;
    let freedThisMonth = 0;
    for (const d of open) {
      interest += bal.get(d.id)! * d.monthlyRate;
      let b = bal.get(d.id)! * (1 + d.monthlyRate);
      const pay = Math.min(b, d.payment);
      b -= pay;
      // Lo que sobra de la cuota del último mes también se suma al abono.
      freedThisMonth += d.payment - pay;
      bal.set(d.id, b);
    }
    let pool = extra(m) + freed + freedThisMonth;
    for (const d of debts) {
      if (paidAt.get(d.id) !== null) continue;
      if (pool > 0) {
        const b = bal.get(d.id)!;
        const amt = Math.min(b, pool);
        bal.set(d.id, b - amt);
        pool -= amt;
      }
      if (bal.get(d.id)! <= 0.5) {
        paidAt.set(d.id, m);
        freed += d.payment;
      }
    }
  }
  return { paidAt, interest };
}

export function buildCashflowPlan(input: CashflowPlanInput): CashflowPlan {
  const free = Math.max(0, input.free);
  const proposal = Math.max(0, input.monthlyOverride ?? roundTo1000(free * PLAN_SHARE_OF_FREE));
  const colchonGap = input.essential > 0 ? Math.max(0, input.essential * COLCHON_TARGET_MONTHS - input.emergencyBalance) : 0;
  const toColchon = colchonGap > 0 ? Math.min(colchonGap, roundTo1000(proposal * COLCHON_SHARE)) : 0;
  const toDebt = proposal - toColchon;

  const ordered = orderByCashflow(input.debts.filter((d) => d.balance > 0.5));
  const colchonMonths = toColchon > 0 ? Math.ceil(colchonGap / toColchon) : null;
  // Completado el colchón, lo que iba a él también se suma al abono.
  const withPlan = simulate(ordered, (m) => toDebt + (colchonMonths !== null && m > colchonMonths ? toColchon : 0));
  // "Sin plan": cada deuda solo con su cuota, sin abonos ni rollover.
  const alone = new Map(ordered.map((d) => [d.id, simulate([d], () => 0).get(d.id) ?? null]));

  const steps: PlanStep[] = ordered.map((d, i) => ({
    order: i + 1,
    debtId: d.id,
    name: d.name,
    balance: Math.round(d.balance),
    payment: Math.round(d.payment),
    annualRatePct: Math.round(d.annualRatePct * 10) / 10,
    freesPerHundred: d.balance > 0 ? Math.round((d.payment / d.balance) * 1000) / 10 : 0,
    monthWithPlan: withPlan.get(d.id) ?? null,
    monthWithout: alone.get(d.id) ?? null,
  }));

  return {
    free: Math.round(free),
    proposal,
    toDebt,
    toColchon,
    colchonGap: Math.round(colchonGap),
    colchonTarget: Math.round(Math.max(0, input.essential) * COLCHON_TARGET_MONTHS),
    emergencyBalance: Math.round(Math.max(0, input.emergencyBalance)),
    colchonMonths,
    steps,
    firstFrees: steps[0]?.payment ?? 0,
    alternative: compareOrders(ordered, toDebt),
  };
}

/** Interés total del plan con el orden de liberar flujo frente a mayor tasa primero. */
function compareOrders(ordered: PlanDebt[], toDebt: number): CashflowPlan['alternative'] {
  if (ordered.length < 2 || toDebt <= 0) return null;
  const real = ordered.map((d) => ({ ...d, monthlyRate: d.compareRate ?? d.monthlyRate }));
  const byRate = [...real].sort((a, b) => b.annualRatePct - a.annualRatePct);
  const plan = simulateWithInterest(real, () => toDebt).interest;
  const alt = simulateWithInterest(byRate, () => toDebt).interest;
  return {
    interestPlan: Math.round(plan),
    interestHighestRate: Math.round(alt),
    difference: Math.round(plan - alt),
    sameOrder: byRate.every((d, i) => d.id === real[i].id),
  };
}
