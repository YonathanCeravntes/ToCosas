/**
 * Motor de sugerencias basado en reglas. Puro y determinista: recibe una
 * "foto" financiera del usuario y devuelve sugerencias accionables ordenadas
 * por impacto (score). No toca la base de datos.
 */

export type SuggestionType =
  | 'priorizar_deuda'
  | 'recorte_gasto'
  | 'alerta_sobregiro'
  | 'abono_extra'
  | 'felicitacion';

export interface SuggestionOut {
  type: SuggestionType;
  title: string;
  body: string;
  score: number; // 0..100, mayor = más relevante
  payload?: Record<string, unknown>;
}

export interface DebtSnapshot {
  id: string;
  name: string;
  balance: number;
  /** Tasa efectiva anual en % (normalizada), para comparar entre bases. */
  annualRatePct: number;
}

export interface CategorySpend {
  category: string;
  amount: number;
}

export interface FinancialSnapshot {
  income: number;
  expense: number;
  debtPayments: number;
  debts: DebtSnapshot[];
  spendByCategory?: CategorySpend[];
}

const HIGH_RATE_THRESHOLD = 30; // % EA

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

export function generateSuggestions(snap: FinancialSnapshot): SuggestionOut[] {
  const out: SuggestionOut[] = [];
  const cashflow = snap.income - snap.expense - snap.debtPayments;

  // R1 — Alerta de sobregiro / falta de liquidez.
  if (snap.income > 0 && snap.expense + snap.debtPayments > snap.income) {
    const gap = snap.expense + snap.debtPayments - snap.income;
    out.push({
      type: 'alerta_sobregiro',
      title: 'Estás gastando más de lo que ingresas',
      body: `Este mes tus salidas superan tus ingresos por ${fmt(gap)}. Revisa tus gastos para evitar un sobregiro.`,
      score: 95,
      payload: { gap },
    });
  }

  // R2 — Priorizar deuda de mayor tasa (avalanche).
  const activeDebts = snap.debts.filter((d) => d.balance > 0);
  const highRate = activeDebts.filter((d) => d.annualRatePct > HIGH_RATE_THRESHOLD);
  if (activeDebts.length >= 2 && highRate.length >= 1) {
    const worst = [...activeDebts].sort((a, b) => b.annualRatePct - a.annualRatePct)[0];
    out.push({
      type: 'priorizar_deuda',
      title: 'Prioriza tu deuda más cara',
      body: `Tienes ${highRate.length} deuda(s) con tasa superior al ${HIGH_RATE_THRESHOLD}% EA. Ataca primero "${worst.name}" (${worst.annualRatePct.toFixed(1)}% EA): es la que más intereses te cuesta.`,
      score: 90,
      payload: { debtId: worst.id, annualRatePct: worst.annualRatePct },
    });
  }

  // R3 — Recorte de gasto en la categoría dominante.
  if (snap.spendByCategory && snap.spendByCategory.length > 0) {
    const top = [...snap.spendByCategory].sort((a, b) => b.amount - a.amount)[0];
    const discretionary = ['entretenimiento', 'comida', 'transporte'];
    if (discretionary.includes(top.category) && top.amount > 0) {
      const potential = Math.round(top.amount * 0.2);
      out.push({
        type: 'recorte_gasto',
        title: `Podrías recortar en ${top.category}`,
        body: `Tu mayor gasto del mes es "${top.category}" (${fmt(top.amount)}). Si reduces un 20% (${fmt(potential)}), podrías adelantar un abono a tu deuda.`,
        score: 70,
        payload: { category: top.category, potential },
      });
    }
  }

  // R4 — Abono extra si hay flujo positivo.
  if (cashflow > 0 && activeDebts.length > 0) {
    const worst = [...activeDebts].sort((a, b) => b.annualRatePct - a.annualRatePct)[0];
    out.push({
      type: 'abono_extra',
      title: 'Tienes margen para abonar extra',
      body: `Este mes te sobran ${fmt(cashflow)}. Si los abonas a "${worst.name}", reduces plazo e intereses. Usa el simulador para ver cuánto ahorrarías.`,
      score: 65,
      payload: { debtId: worst.id, suggestedExtra: Math.round(cashflow) },
    });
  }

  // R5 — Felicitación (sin sobregiro, sin deudas caras, flujo sano).
  if (cashflow > 0 && highRate.length === 0 && out.length === 0) {
    out.push({
      type: 'felicitacion',
      title: '¡Vas muy bien! 🎉',
      body: `Tus finanzas del mes están en orden: flujo positivo de ${fmt(cashflow)} y sin deudas de tasa alta. Sigue así.`,
      score: 30,
    });
  }

  return out.sort((a, b) => b.score - a.score);
}
