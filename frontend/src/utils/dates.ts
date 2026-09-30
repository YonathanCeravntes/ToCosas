/**
 * FIN-056 (BT-027) · Fechas de "día" hacia el servidor.
 *
 * El servidor corta los días y los ciclos a medianoche universal (UTC). Mandar la hora
 * local (`toISOString()` de un `new Date()`) hacía que un gasto anotado después de las
 * 7 p. m. en Colombia cayera en el día siguiente (y, el último día del ciclo, en el mes
 * que viene). Igual que el bot, la app manda SOLO la fecha local, a mediodía UTC: así
 * el día es el mismo en el teléfono, en Inicio y en el servidor.
 */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 'YYYY-MM-DDT12:00:00.000Z' con la fecha LOCAL del dispositivo. */
export function toApiDate(d: Date): string {
  return `${localDateKey(d)}T12:00:00.000Z`;
}

/** Fecha guardada (instante) → Date local a mediodía de ese día calendario, para editarla sin corrimientos. */
export function fromApiDate(iso: string): Date {
  const key = iso.length === 10 ? iso : iso.slice(0, 10);
  const [y, m, d] = key.split('-').map(Number);
  // Los instantes viejos guardados con hora local se leen por su día UTC (como los muestra Inicio).
  if (iso.length > 10 && !/T12:00:00(\.000)?Z$/.test(iso)) {
    const t = new Date(iso);
    return new Date(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), 12);
  }
  return new Date(y, m - 1, d, 12);
}
