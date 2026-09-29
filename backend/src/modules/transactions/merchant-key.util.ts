import { normalizeName } from '../budget/fixed-expense.util';

/**
 * FIN-046 Fase 4 · "Comercio" de un movimiento a partir de su nota: sin montos, tildes,
 * fechas ni palabras de relleno. "Pagué Netflix $45.000" → "netflix";
 * "almuerzo en el Corral 32 mil" → "almuerzo corral". Sirve para aprender la
 * categoría por comercio y para detectar lo que se paga cada mes.
 */
const FILLER = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'en', 'a', 'al', 'y', 'con', 'por', 'para', 'un', 'una', 'mi', 'mis',
  'pague', 'pago', 'pagar', 'compre', 'compra', 'gaste', 'gasto', 'gastos', 'me', 'hoy', 'ayer', 'anoche',
  'mil', 'millon', 'millones', 'pesos', 'cop', 'k', 'lucas', 'luca', 'barras', 'palos', 'mensual', 'mes',
  'ingreso', 'recibi', 'entro', 'efectivo', 'tarjeta', 'nequi', 'daviplata', 'transferencia',
]);

export function merchantKey(note: string | null | undefined): string {
  if (!note) return '';
  const words = normalizeName(note)
    .split(' ')
    .filter((w) => w.length > 1 && !/\d/.test(w) && !FILLER.has(w));
  return words.slice(0, 3).join(' ');
}

/** "netflix" → "Netflix" (para mostrar el nombre del comercio). */
export function displayMerchant(key: string): string {
  return key.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}
