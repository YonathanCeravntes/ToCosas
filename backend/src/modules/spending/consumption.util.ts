/**
 * FIN-061 Fase 2.3 · Análisis de consumo (función pura). Estudio "Gustos, tarjetas y
 * plata del mes", aprobado por el Fundador el 2026-10-04.
 *
 * Las 7 reglas:
 *  1. Banda de gustos según la carga de deuda (50/30/20 ajustada a la deuda promedio
 *     en Colombia): cuotas/ingreso <20 % → tranquilo hasta 25 %, atención hasta 35 %;
 *     20–35 % → 20/30; >35 % o con mora → 15/25.
 *  2. Por defecto, silencio: ritmo de siempre (≤1,25×), diferencia < $30.000, o cine y
 *     salidas 2 veces al mes o menos.
 *  3. Pico frente a ti mismo: ≥1,5× lo usual (en veces o en plata) Y banda en atención o
 *     alto, o pagado con tarjeta a cuotas con interés mientras se debe.
 *  4. Espaciar, nunca eliminar: la meta es volver a tu ritmo o a la mitad, nunca a cero.
 *  5. Lo protegido ("esto me sostiene") solo recibe una nota informativa; si se paga a
 *     cuotas con interés, la nota habla del interés, nunca del gusto.
 *  6. Suscripciones: repetidas (dos plataformas del mismo tipo), que suben más de 10 %,
 *     o que en total pasan del 5 % del ingreso.
 *  7. Gastos hormiga: compras de menos de $25.000 que suman más del 8 % del ingreso y
 *     1,5× tu ritmo. Se muestra el total, nunca se culpa al tinto.
 * Máximo 2 sugerencias al mes, una por categoría, primero lo positivo. Nunca la
 * palabra "exceso". Sin marcas ni entidades en los textos (DEC-0005 §14.2).
 */
import type { SpendClassOrMixed } from '../budget/spend-class.util';

export const CONSUMPTION = {
  quietRatio: 1.25,
  peakRatio: 1.5,
  minDifference: 30_000,
  outingsQuietCount: 2,
  subscriptionRise: 0.1,
  subscriptionsShare: 0.05,
  antThreshold: 25_000,
  antShare: 0.08,
  maxSuggestions: 2,
} as const;

/** Categoría de salidas (cine, bares, conciertos): 2 veces al mes o menos es silencio. */
export const OUTINGS_CATEGORY = 'Salidas y entretenimiento';

export type GustoBand = 'tranquilo' | 'atencion' | 'alto';

export interface CategoryMonth {
  categoryId: string;
  name: string;
  spendClass: SpendClassOrMixed;
  protected: boolean;
  monthlyCap: number | null;
  /** Este mes (variable + compras con tarjeta; sin gastos fijos). */
  amount: number;
  count: number;
  /** Mediana de los últimos 3 meses con datos (null = sin historial). */
  typicalAmount: number | null;
  typicalCount: number | null;
  /** Parte de este mes pagada con tarjeta a cuotas con interés. */
  financedAmount: number;
  /** Interés estimado de esa parte. */
  financedInterest: number;
}

export interface SubscriptionItem {
  name: string;
  amount: number;
  previousAmount: number | null;
}

export interface ConsumptionInput {
  incomeBase: number;
  /** Cuotas de deuda ÷ ingreso (fracción). */
  dti: number;
  inArrears: boolean;
  hasDebt: boolean;
  categories: CategoryMonth[];
  /** Gastos fijos que son gusto (suscripciones, gimnasio si la persona lo marcó). */
  fixedGustos: number;
  subscriptions: SubscriptionItem[];
  /** Compras pequeñas (no esenciales) de este mes y su mediana de 3 meses. */
  smallPurchases: { amount: number; count: number; typicalAmount: number | null };
}

export type SuggestionKind =
  | 'espaciar'
  | 'suscripcion_repetida'
  | 'suscripcion_subio'
  | 'suscripciones_total'
  | 'hormiga';

export interface Suggestion {
  kind: SuggestionKind;
  categoryId: string | null;
  title: string;
  body: string;
  /** Plata que se libera al mes si se sigue la sugerencia. */
  frees: number;
  /** Botón "Este gusto lo mantengo" (marca la categoría como protegida). */
  canKeep: boolean;
}

export interface Note {
  kind: 'protegido' | 'tarjeta_interes' | 'tope';
  categoryId: string | null;
  text: string;
}

export interface CategoryReading extends CategoryMonth {
  ratio: number | null;
  status: 'sin_historial' | 'normal' | 'abajo' | 'arriba' | 'pico';
}

export interface ConsumptionAnalysis {
  gustos: {
    amount: number;
    share: number | null;
    band: GustoBand | null;
    /** Límites de la banda (fracción del ingreso) para la carga de deuda de la persona. */
    limits: { tranquilo: number; atencion: number };
  };
  categories: CategoryReading[];
  /** Lo positivo primero (categorías por debajo de su ritmo). */
  wins: string[];
  suggestions: Suggestion[];
  notes: Note[];
}

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
const pct = (f: number) => `${Math.round(f * 100)} %`;

/** Regla 1: límites de la banda según la carga de deuda. */
export function bandLimits(dti: number, inArrears: boolean): { tranquilo: number; atencion: number } {
  if (inArrears || dti > 0.35) return { tranquilo: 0.15, atencion: 0.25 };
  if (dti >= 0.2) return { tranquilo: 0.2, atencion: 0.3 };
  return { tranquilo: 0.25, atencion: 0.35 };
}

export function gustoBand(share: number, limits: { tranquilo: number; atencion: number }): GustoBand {
  if (share <= limits.tranquilo) return 'tranquilo';
  if (share <= limits.atencion) return 'atencion';
  return 'alto';
}

/** Familias de suscripción para detectar repetidas. Solo se usan para comparar, nunca se muestran. */
const SUBSCRIPTION_FAMILIES: Record<string, { label: string; words: string[] }> = {
  video: {
    label: 'video',
    words: ['netflix', 'disney', 'hbo', 'max', 'prime', 'amazon', 'star', 'paramount', 'apple tv', 'vix', 'crunchyroll', 'mubi'],
  },
  musica: { label: 'música', words: ['spotify', 'deezer', 'apple music', 'youtube music', 'tidal', 'musica'] },
};

export function subscriptionFamily(name: string): string | null {
  const n = ` ${name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')} `;
  for (const [key, f] of Object.entries(SUBSCRIPTION_FAMILIES)) {
    if (f.words.some((w) => n.includes(` ${w} `) || n.includes(` ${w}`))) return key;
  }
  return null;
}

function readCategory(c: CategoryMonth): CategoryReading {
  if (c.typicalAmount == null || c.typicalAmount <= 0) {
    return { ...c, ratio: null, status: 'sin_historial' };
  }
  const byAmount = c.amount / c.typicalAmount;
  const byCount = c.typicalCount && c.typicalCount > 0 ? c.count / c.typicalCount : 0;
  const ratio = Math.round(Math.max(byAmount, byCount) * 100) / 100;
  let status: CategoryReading['status'] = 'normal';
  if (ratio >= CONSUMPTION.peakRatio) status = 'pico';
  else if (ratio > CONSUMPTION.quietRatio) status = 'arriba';
  else if (byAmount < 0.8 && c.typicalAmount - c.amount >= CONSUMPTION.minDifference) status = 'abajo';
  return { ...c, ratio, status };
}

/** Regla 2: ¿se queda callado con esta categoría? */
function isQuiet(c: CategoryReading): boolean {
  if (c.status !== 'pico') return true;
  if (c.amount - (c.typicalAmount ?? 0) < CONSUMPTION.minDifference) return true;
  if (c.name === OUTINGS_CATEGORY && c.count <= CONSUMPTION.outingsQuietCount) return true;
  return false;
}

export function analyzeConsumption(input: ConsumptionInput): ConsumptionAnalysis {
  const limits = bandLimits(input.dti, input.inArrears);
  const gustoCats = input.categories.filter((c) => c.spendClass === 'gusto');
  const gustosAmount = Math.round(gustoCats.reduce((a, c) => a + c.amount, 0) + input.fixedGustos);
  const share = input.incomeBase > 0 ? gustosAmount / input.incomeBase : null;
  const band = share != null ? gustoBand(share, limits) : null;

  const categories = input.categories.map(readCategory);
  const wins: string[] = [];
  const candidates: Suggestion[] = [];
  const notes: Note[] = [];

  for (const c of categories) {
    if (c.spendClass === 'esencial') continue;
    if (c.status === 'abajo' && c.spendClass === 'gusto') {
      wins.push(`En ${c.name} vas ${fmt((c.typicalAmount ?? 0) - c.amount)} por debajo de lo usual para ti.`);
    }
    if (c.monthlyCap != null && c.monthlyCap > 0 && c.amount >= c.monthlyCap * 0.8) {
      notes.push({
        kind: 'tope',
        categoryId: c.categoryId,
        text: c.amount >= c.monthlyCap
          ? `Llegaste al tope que te pusiste en ${c.name} (${fmt(c.monthlyCap)}).`
          : `Vas en ${fmt(c.amount)} de tu tope de ${fmt(c.monthlyCap)} en ${c.name}.`,
      });
    }
    // Regla 5 (y señal roja): a cuotas con interés mientras se debe → se habla del interés.
    if (c.financedAmount > 0 && c.financedInterest > 0 && input.hasDebt) {
      notes.push({
        kind: 'tarjeta_interes',
        categoryId: c.categoryId,
        text: `Pagaste ${fmt(c.financedAmount)} de ${c.name} con tarjeta a cuotas. Eso suma unos ${fmt(c.financedInterest)} de interés; a 1 cuota no lo pagarías.`,
      });
    }
    if (c.spendClass !== 'gusto' || isQuiet(c)) continue;
    const flagged = band === 'atencion' || band === 'alto' || (c.financedAmount > 0 && input.hasDebt);
    if (!flagged) continue;
    if (c.protected) {
      notes.push({
        kind: 'protegido',
        categoryId: c.categoryId,
        text: `${c.name} va en ${fmt(c.amount)} este mes (lo usual para ti: ${fmt(c.typicalAmount ?? 0)}). Es de lo que te sostiene; solo te lo cuento.`,
      });
      continue;
    }
    // Regla 4: volver a tu ritmo o a la mitad de este mes (lo que sea mayor), nunca a cero.
    const target = Math.max(c.typicalAmount ?? 0, c.amount / 2);
    const frees = Math.round(c.amount - target);
    if (frees < CONSUMPTION.minDifference) continue;
    const times =
      c.typicalCount && c.typicalCount > 0 && c.count >= 2
        ? ` Este mes van ${c.count} veces; lo usual para ti son ${Math.round(c.typicalCount)}.`
        : '';
    candidates.push({
      kind: 'espaciar',
      categoryId: c.categoryId,
      title: `${c.name}: más seguido que de costumbre`,
      body: `Llevas ${fmt(c.amount)}, ${c.ratio}× lo usual para ti.${times} Si lo espacias a tu ritmo lo sigues disfrutando (y hasta más) y liberas ${fmt(frees)}.`,
      frees,
      canKeep: true,
    });
  }

  // Regla 6: suscripciones.
  const subsCat = input.categories.find((c) => c.name === 'Suscripciones');
  const subsId = subsCat?.categoryId ?? null;
  const fams = new Map<string, SubscriptionItem[]>();
  for (const s of input.subscriptions) {
    const f = subscriptionFamily(s.name);
    if (f) fams.set(f, [...(fams.get(f) ?? []), s]);
  }
  for (const [fam, items] of fams) {
    if (items.length < 2) continue;
    const cheapest = Math.min(...items.map((i) => i.amount));
    candidates.push({
      kind: 'suscripcion_repetida',
      categoryId: subsId,
      title: `Tienes ${items.length} plataformas de ${SUBSCRIPTION_FAMILIES[fam].label}`,
      body: `Juntas suman ${fmt(items.reduce((a, i) => a + i.amount, 0))} al mes. Puedes turnarlas: pausar una unos meses y volver cuando la quieras. Liberas ${fmt(cheapest)}.`,
      frees: Math.round(cheapest),
      canKeep: true,
    });
  }
  for (const s of input.subscriptions) {
    if (s.previousAmount && s.previousAmount > 0 && s.amount > s.previousAmount * (1 + CONSUMPTION.subscriptionRise)) {
      candidates.push({
        kind: 'suscripcion_subio',
        categoryId: subsId,
        title: `${s.name} subió de precio`,
        body: `Pasó de ${fmt(s.previousAmount)} a ${fmt(s.amount)} al mes. Revisa si hay un plan más barato que te sirva igual.`,
        frees: Math.round(s.amount - s.previousAmount),
        canKeep: true,
      });
    }
  }
  const subsTotal = input.subscriptions.reduce((a, s) => a + s.amount, 0);
  if (input.incomeBase > 0 && subsTotal > input.incomeBase * CONSUMPTION.subscriptionsShare) {
    candidates.push({
      kind: 'suscripciones_total',
      categoryId: subsId,
      title: 'Tus suscripciones suman bastante',
      body: `Son ${fmt(subsTotal)} al mes, ${pct(subsTotal / input.incomeBase)} de tu ingreso. Quédate con las que más usas y pausa las demás; siempre puedes volver.`,
      frees: Math.round(subsTotal - input.incomeBase * CONSUMPTION.subscriptionsShare),
      canKeep: false,
    });
  }

  // Regla 7: gastos hormiga (el total, nunca la compra).
  const ants = input.smallPurchases;
  if (
    input.incomeBase > 0 &&
    ants.typicalAmount != null &&
    ants.amount > input.incomeBase * CONSUMPTION.antShare &&
    ants.amount >= ants.typicalAmount * CONSUMPTION.peakRatio
  ) {
    const frees = Math.round(ants.amount - ants.typicalAmount);
    if (frees >= CONSUMPTION.minDifference) {
      candidates.push({
        kind: 'hormiga',
        categoryId: null,
        title: 'Las compras pequeñas se juntaron',
        body: `Este mes van ${ants.count} compras de menos de ${fmt(CONSUMPTION.antThreshold)} que suman ${fmt(ants.amount)} (lo usual para ti: ${fmt(ants.typicalAmount)}). No se trata de quitar ninguna: con volver a tu ritmo liberas ${fmt(frees)}.`,
        frees,
        canKeep: false,
      });
    }
  }

  // Máximo 2, una por categoría, las que más liberan primero.
  const suggestions: Suggestion[] = [];
  const usedCats = new Set<string>();
  for (const s of candidates.sort((a, b) => b.frees - a.frees)) {
    if (suggestions.length >= CONSUMPTION.maxSuggestions) break;
    const key = s.categoryId ?? s.kind;
    if (usedCats.has(key)) continue;
    usedCats.add(key);
    suggestions.push(s);
  }

  return {
    gustos: { amount: gustosAmount, share: share != null ? Math.round(share * 1000) / 1000 : null, band, limits },
    categories,
    wins,
    suggestions,
    notes,
  };
}
