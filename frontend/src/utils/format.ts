/** Formatea un monto en pesos colombianos: 1234567 → "$1.234.567". */
export function formatMoney(value: number, currency = 'COP'): string {
  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
  return formatter.format(value ?? 0);
}

/**
 * Formatea una FECHA PURA (sin hora real: nextDueDate, payoffDate, dueDate de
 * amortización…) a "3 jul 2026". Fija UTC porque estos campos viajan como
 * medianoche UTC y en zonas negativas (Colombia, UTC−5) la conversión local
 * los corría un día hacia atrás (ajuste post-cierre FIN-022; `shortDate` de
 * Inicio/Presupuesto ya lo hacía así). Para instantes reales usa
 * `formatLocalDate`.
 */
export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Formatea un INSTANTE real (occurredAt de transacciones, vigencias de
 * suscripción) a la fecha local del dispositivo — aquí la hora local SÍ es la
 * verdad del evento. */
export function formatLocalDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Formatea un porcentaje: 12.5 → "12,5%". */
export function formatPercent(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`;
}

/**
 * BT-001 · Parsea un número escrito según la configuración regional del usuario:
 * `15,35` (coma decimal), `15.35` (punto decimal) o `1535` (entero). Si aparecen
 * ambos separadores, el último es el decimal y el otro es de miles. Devuelve NaN
 * si no hay número. Espejo del `normalizeNumberInput` del backend — ninguna capa
 * debe romper por formato regional. Úsalo para TODO campo numérico decimal.
 */
export function parseDecimal(input: string): number {
  const cleaned = input.trim().replace(/[^\d.,-]/g, '');
  if (cleaned === '' || cleaned === '-') return NaN;
  let s = cleaned;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  } else if (hasComma) {
    s = s.replace(/,/g, '.');
  }
  return parseFloat(s);
}

/** Igual que parseDecimal pero para montos enteros (COP no usa centavos):
 *  descarta separadores de miles. `1.000.000` → 1000000. */
export function parseAmount(input: string): number {
  const digits = input.replace(/\D/g, '');
  return digits === '' ? NaN : parseInt(digits, 10);
}
