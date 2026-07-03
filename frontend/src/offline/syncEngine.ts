import { getDb, getSyncCursor, setSyncCursor } from './database';
import { isOnline } from './network';
import { api } from '../api/client';
import { CreateTransactionInput } from '../api/endpoints';

interface OutboxRow {
  client_uuid: string;
  op: string;
  entity: string;
  payload: string;
}

interface PullResponse {
  serverTime: string;
  changes: {
    transactions: {
      upserted: Array<{
        id: string;
        clientUuid: string | null;
        kind: string;
        amount: string | number;
        occurredAt: string;
        note: string | null;
        debtId: string | null;
        source: string;
        updatedAt: string;
      }>;
      deleted: string[];
    };
  };
}

interface PushResponse {
  serverTime: string;
  idMap: Record<string, string>;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  skipped?: boolean;
}

/**
 * Motor de sincronización offline-first.
 * 1) PUSH: sube el outbox de cambios locales pendientes.
 * 2) PULL: baja los cambios del servidor desde el último cursor y actualiza
 *    la caché local.
 * Es seguro llamarlo varias veces: el push es idempotente por clientUuid.
 */
export async function runSync(): Promise<SyncResult> {
  if (!(await isOnline())) {
    return { pushed: 0, pulled: 0, skipped: true };
  }
  const pushed = await pushOutbox();
  const pulled = await pullChanges();
  return { pushed, pulled };
}

async function pushOutbox(): Promise<number> {
  const db = await getDb();
  const rows = await db.getAllAsync<OutboxRow>(
    "SELECT * FROM outbox WHERE synced = 0 AND op = 'create' AND entity = 'transaction'",
  );
  if (rows.length === 0) return 0;

  const created: CreateTransactionInput[] = rows.map(
    (r) => JSON.parse(r.payload) as CreateTransactionInput,
  );

  const res = await api.post<PushResponse>('/sync/push', { created });

  // Marca como sincronizados y actualiza los ids locales con los del servidor.
  for (const r of rows) {
    const serverId = res.idMap[r.client_uuid];
    await db.runAsync('UPDATE outbox SET synced = 1 WHERE client_uuid = ?', [
      r.client_uuid,
    ]);
    if (serverId) {
      await db.runAsync(
        'UPDATE local_transactions SET id = ? WHERE client_uuid = ?',
        [serverId, r.client_uuid],
      );
    }
  }
  return rows.length;
}

async function pullChanges(): Promise<number> {
  const db = await getDb();
  const cursor = await getSyncCursor();
  const query = cursor ? `?since=${encodeURIComponent(cursor)}` : '';
  const res = await api.get<PullResponse>(`/sync/pull${query}`);

  const { upserted, deleted } = res.changes.transactions;

  for (const t of upserted) {
    await db.runAsync(
      `INSERT INTO local_transactions
        (id, client_uuid, kind, amount, occurred_at, note, debt_id, source, updated_at, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
       ON CONFLICT(id) DO UPDATE SET
         kind=excluded.kind, amount=excluded.amount, occurred_at=excluded.occurred_at,
         note=excluded.note, debt_id=excluded.debt_id, updated_at=excluded.updated_at,
         deleted=0`,
      [
        t.id,
        t.clientUuid,
        t.kind,
        typeof t.amount === 'number' ? t.amount : parseFloat(t.amount),
        t.occurredAt,
        t.note,
        t.debtId,
        t.source,
        t.updatedAt,
      ],
    );
  }

  for (const id of deleted) {
    await db.runAsync('UPDATE local_transactions SET deleted = 1 WHERE id = ?', [id]);
  }

  await setSyncCursor(res.serverTime);
  return upserted.length + deleted.length;
}
