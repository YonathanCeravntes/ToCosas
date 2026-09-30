import { displayMerchant, merchantKey } from '../transactions/merchant-key.util';

/**
 * FIN-046 Fase 4 · "Aprende de ti" — detección pura (sin BD) de lo que Millo puede
 * proponer con un toque. Nunca se aplica solo: la persona confirma.
 */

/** Tolerancias: mismo monto ±15% y mismo día ±5 (un mes cobra el 3 y otro el 7). */
export const PROPOSAL_AMOUNT_TOLERANCE = 0.15;
export const PROPOSAL_DAY_TOLERANCE = 5;

export interface TxLite {
  note: string | null;
  amount: number;
  occurredAt: Date;
  categoryId: string | null;
}

export interface FixedProposal {
  key: string;
  name: string;
  amount: number;
  dayOfMonth: number;
  months: number;
  categoryId: string | null;
}

const monthIndex = (d: Date) => d.getUTCFullYear() * 12 + d.getUTCMonth();
const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Un comercio que aparece en meses SEGUIDOS (al menos 2, el último este mes o el
 * anterior), una vez por mes, con monto y día parecidos → "¿lo vuelvo gasto fijo?".
 * Varias compras del mismo comercio en un mes (almuerzos, Uber) NO son un fijo.
 */
export function detectMonthlyMerchants(txs: TxLite[], now: Date): FixedProposal[] {
  const byKey = new Map<string, { months: Map<number, TxLite[]> }>();
  for (const t of txs) {
    const key = merchantKey(t.note);
    if (!key) continue;
    const g = byKey.get(key) ?? { months: new Map<number, TxLite[]>() };
    const mi = monthIndex(t.occurredAt);
    g.months.set(mi, [...(g.months.get(mi) ?? []), t]);
    byKey.set(key, g);
  }

  const current = monthIndex(now);
  const out: FixedProposal[] = [];
  for (const [key, g] of byKey) {
    // Una sola vez por mes; si en algún mes hay varias, es un gasto del día a día.
    if ([...g.months.values()].some((list) => list.length > 1)) continue;
    const months = [...g.months.keys()].sort((a, b) => b - a);
    if (months[0] < current - 1) continue; // ya no se paga
    // Racha de meses seguidos desde el más reciente.
    const streak: number[] = [months[0]];
    for (let i = 1; i < months.length && months[i] === streak[streak.length - 1] - 1; i++) streak.push(months[i]);
    if (streak.length < 2) continue;

    const items = streak.map((m) => g.months.get(m)![0]);
    const amounts = items.map((t) => t.amount);
    const medAmount = median(amounts);
    if (medAmount <= 0 || amounts.some((a) => Math.abs(a - medAmount) / medAmount > PROPOSAL_AMOUNT_TOLERANCE)) continue;
    const days = items.map((t) => t.occurredAt.getUTCDate());
    const medDay = Math.round(median(days));
    if (days.some((d) => Math.min(Math.abs(d - medDay), 30 - Math.abs(d - medDay)) > PROPOSAL_DAY_TOLERANCE)) continue;

    const cats = items.map((t) => t.categoryId).filter((c): c is string => !!c);
    out.push({
      key,
      name: displayMerchant(key),
      amount: Math.round(medAmount),
      dayOfMonth: Math.min(28, Math.max(1, medDay)),
      months: streak.length,
      categoryId: cats.length ? cats[cats.length - 1] : null,
    });
  }
  return out;
}

export interface IncomeProposal {
  action: 'crear_ingreso_fijo' | 'crear_ingreso_variable';
  name: string;
  amount: number;
  dayOfMonth?: number;
}

/**
 * Ingresos que Millo no conoce, con los 3 últimos meses COMPLETOS recibidos:
 *  - Sin ingresos declarados y lo recibido es estable (±15%) → ingreso fijo.
 *  - Con ingresos declarados y los 3 meses llegó ≥10% más → ingreso variable con lo
 *    MENOS que sobró (conservador), redondeado a $10.000, si es al menos $50.000.
 */
export function detectIncomeProposal(
  received: Array<{ amount: number; day: number }>,
  declaredMonthly: number,
): IncomeProposal | null {
  if (received.length < 3 || received.some((m) => m.amount <= 0)) return null;
  if (declaredMonthly <= 0) {
    const med = median(received.map((m) => m.amount));
    if (received.some((m) => Math.abs(m.amount - med) / med > PROPOSAL_AMOUNT_TOLERANCE)) return null;
    return {
      action: 'crear_ingreso_fijo',
      name: 'Ingreso mensual',
      amount: Math.round(Math.min(...received.map((m) => m.amount)) / 1000) * 1000,
      dayOfMonth: Math.min(28, Math.max(1, Math.round(median(received.map((m) => m.day))))),
    };
  }
  if (received.some((m) => m.amount < declaredMonthly * 1.1)) return null;
  const extra = Math.floor(Math.min(...received.map((m) => m.amount - declaredMonthly)) / 10_000) * 10_000;
  if (extra < 50_000) return null;
  return { action: 'crear_ingreso_variable', name: 'Ingresos extra', amount: extra };
}
