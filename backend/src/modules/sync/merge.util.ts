/**
 * Resolución de conflictos para la sincronización offline.
 *
 * Estrategia: **last-write-wins** por `updatedAt`. El cambio entrante (del
 * cliente) se aplica solo si es más reciente que la versión del servidor.
 */
export function shouldApplyIncoming(
  serverUpdatedAt: Date | null | undefined,
  incomingUpdatedAt: Date | null | undefined,
): boolean {
  if (!incomingUpdatedAt) return false; // sin marca temporal no se puede resolver
  if (!serverUpdatedAt) return true; // no existe en el servidor → aplicar
  return incomingUpdatedAt.getTime() > serverUpdatedAt.getTime();
}

/**
 * Separa una lista de filas (con `deletedAt`) en upserted vs. deleted, para el
 * pull delta. Las filas con `deletedAt` se reportan como borrados (solo el id).
 */
export function splitChanges<T extends { id: string; deletedAt: Date | null }>(
  rows: T[],
): { upserted: T[]; deleted: string[] } {
  const upserted: T[] = [];
  const deleted: string[] = [];
  for (const row of rows) {
    if (row.deletedAt) deleted.push(row.id);
    else upserted.push(row);
  }
  return { upserted, deleted };
}
