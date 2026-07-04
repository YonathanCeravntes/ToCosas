import { getDb } from './database';
import { uuidv4 } from './uuid';
import { TxKind } from '../api/types';

export interface LocalTransaction {
  id: string;
  client_uuid: string;
  kind: TxKind;
  amount: number;
  occurred_at: string;
  note: string | null;
  debt_id: string | null;
  category_id: string | null;
  category_icon: string | null;
  source: string;
  updated_at: string | null;
  deleted: number;
}

export interface NewTransactionInput {
  kind: TxKind;
  amount: number;
  occurredAt: string;
  note?: string;
  debtId?: string;
  categoryId?: string;
  categoryIcon?: string;
}

/**
 * Repositorio de transacciones local-first. La UI lee de aquí (funciona sin
 * conexión); las escrituras van a la caché local + al outbox para sincronizar.
 */
export const transactionsRepo = {
  /** Crea una transacción localmente y la encola para subir. */
  async add(input: NewTransactionInput): Promise<LocalTransaction> {
    const db = await getDb();
    const clientUuid = uuidv4();
    const now = new Date().toISOString();
    const localId = `local:${clientUuid}`;

    await db.runAsync(
      `INSERT INTO local_transactions
        (id, client_uuid, kind, amount, occurred_at, note, debt_id, category_id, category_icon, source, updated_at, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'app', ?, 0)`,
      [
        localId,
        clientUuid,
        input.kind,
        input.amount,
        input.occurredAt,
        input.note ?? null,
        input.debtId ?? null,
        input.categoryId ?? null,
        input.categoryIcon ?? null,
        now,
      ],
    );

    await db.runAsync(
      `INSERT INTO outbox (client_uuid, op, entity, payload, created_at, synced)
       VALUES (?, 'create', 'transaction', ?, ?, 0)`,
      [
        clientUuid,
        JSON.stringify({
          kind: input.kind,
          amount: input.amount,
          occurredAt: input.occurredAt,
          note: input.note,
          debtId: input.debtId,
          categoryId: input.categoryId,
          clientUuid,
        }),
        now,
      ],
    );

    return {
      id: localId,
      client_uuid: clientUuid,
      kind: input.kind,
      amount: input.amount,
      occurred_at: input.occurredAt,
      note: input.note ?? null,
      debt_id: input.debtId ?? null,
      category_id: input.categoryId ?? null,
      category_icon: input.categoryIcon ?? null,
      source: 'app',
      updated_at: now,
      deleted: 0,
    };
  },

  /** Lista las transacciones locales (no borradas), más recientes primero. */
  async list(limit = 100): Promise<LocalTransaction[]> {
    const db = await getDb();
    return db.getAllAsync<LocalTransaction>(
      `SELECT * FROM local_transactions
       WHERE deleted = 0
       ORDER BY occurred_at DESC
       LIMIT ?`,
      [limit],
    );
  },

  /** Cuántos cambios quedan pendientes de subir. */
  async pendingCount(): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) as n FROM outbox WHERE synced = 0',
    );
    return row?.n ?? 0;
  },
};
