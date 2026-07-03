/** Formatea un monto en pesos colombianos: 1234567 → "$1.234.567". */
export function formatMoney(value: number, currency = 'COP'): string {
  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
  return formatter.format(value ?? 0);
}

/** Formatea una fecha ISO a "3 jul 2026". */
export function formatDate(iso: string | Date): string {
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
