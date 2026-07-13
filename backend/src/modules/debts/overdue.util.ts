/**
 * FIN-024 (DEC-0024 P2) · LA definición de "hace cuánto venció" — función pura
 * única sobre fechas PURAS en medianoche UTC (la lección del ajuste de zona
 * horaria de FIN-022: cada consumidor que re-derive la resta reintroduce el
 * "día corrido"). `null` = no vencida (sin fecha, vence hoy o en el futuro).
 */
export function overdueDays(
  nextDueDate: Date | null | undefined,
  today: Date = new Date(),
): number | null {
  if (!nextDueDate) return null;
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const d = Date.UTC(
    nextDueDate.getUTCFullYear(),
    nextDueDate.getUTCMonth(),
    nextDueDate.getUTCDate(),
  );
  if (d >= t) return null;
  return Math.round((t - d) / 86_400_000);
}
