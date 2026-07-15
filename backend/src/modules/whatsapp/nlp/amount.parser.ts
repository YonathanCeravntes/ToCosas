/**
 * Parser de montos en español coloquial (formato colombiano: punto = miles,
 * coma = decimales). Soporta multiplicadores: k, mil, millón/millones, m.
 *
 * Ejemplos:
 *   "$250.000"        → 250000
 *   "1.200.000"       → 1200000
 *   "45.000"          → 45000
 *   "250k" / "250 k"  → 250000
 *   "45 mil"          → 45000
 *   "1.2 millones"    → 1200000
 *   "1,5 millones"    → 1500000
 *   "2 millones"      → 2000000
 *   "1.5m"            → 1500000
 *   "45000"           → 45000
 */

const MULTIPLIERS: Array<{ re: RegExp; factor: number }> = [
  { re: /millones?|mill/i, factor: 1_000_000 },
  { re: /\bmil\b/i, factor: 1_000 },
  { re: /^k$/i, factor: 1_000 },
  { re: /^m$/i, factor: 1_000_000 },
];

/** Normaliza un string numérico colombiano a número JS. */
export function normalizeNumberString(raw: string): number | null {
  const s = raw.trim();
  if (!/\d/.test(s)) return null;

  // 1.200.000  ó  1.200.000,50  → punto miles, coma decimal
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  }
  // 1,2  → coma decimal
  if (/^\d+,\d+$/.test(s)) {
    return parseFloat(s.replace(',', '.'));
  }
  // 1.2  → punto decimal (no es grupo de miles)  ó  250 / 45000
  if (/^\d+(\.\d+)?$/.test(s)) {
    return parseFloat(s);
  }
  // fallback: quitar separadores de miles
  const cleaned = s.replace(/[.,](?=\d{3}\b)/g, '');
  const val = parseFloat(cleaned.replace(',', '.'));
  return Number.isNaN(val) ? null : val;
}

/**
 * Extrae el primer monto encontrado en un texto. Devuelve el valor numérico
 * o null si no hay ninguno.
 */
export function parseAmount(text: string): number | null {
  const lower = ` ${text.toLowerCase()} `;

  // 1) número + multiplicador (250k, 45 mil, 1.2 millones, 1.5m)
  const multRe = /(\d[\d.,]*)\s*(millones?|mill|mil|k|m)\b/i;
  const m = lower.match(multRe);
  if (m) {
    const base = normalizeNumberString(m[1]);
    if (base !== null) {
      const word = m[2].toLowerCase();
      const factor =
        MULTIPLIERS.find((x) => x.re.test(word))?.factor ??
        (word === 'k' ? 1_000 : word === 'm' ? 1_000_000 : 1);
      return Math.round(base * factor * 100) / 100;
    }
  }

  // 2) número "pelado", con o sin símbolo de moneda
  const plainRe = /\$?\s?(\d[\d.,]*\d|\d)/;
  const p = lower.match(plainRe);
  if (p) {
    const val = normalizeNumberString(p[1]);
    if (val !== null) return Math.round(val * 100) / 100;
  }

  return null;
}
