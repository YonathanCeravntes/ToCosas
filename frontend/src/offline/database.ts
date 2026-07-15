import * as SQLite from 'expo-sqlite';

/**
 * Base de datos local (SQLite) para el modo offline.
 *
 * - `local_transactions`: caché de transacciones (lo que ve la UI sin conexión).
 * - `outbox`: cola de cambios locales pendientes de subir al servidor.
 * - `sync_meta`: cursor de la última sincronización (para el pull delta).
 */

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('tocosas.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS local_transactions (
          id          TEXT PRIMARY KEY,
          client_uuid TEXT UNIQUE,
          kind        TEXT NOT NULL,
          amount      REAL NOT NULL,
          occurred_at TEXT NOT NULL,
          note        TEXT,
          debt_id     TEXT,
          category_id TEXT,
          category_icon TEXT,
          source      TEXT DEFAULT 'app',
          updated_at  TEXT,
          deleted     INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS outbox (
          client_uuid TEXT PRIMARY KEY,
          op          TEXT NOT NULL,          -- create | update | delete
          entity      TEXT NOT NULL,          -- transaction
          payload     TEXT NOT NULL,          -- JSON
          created_at  TEXT NOT NULL,
          synced      INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS sync_meta (
          key   TEXT PRIMARY KEY,
          value TEXT
        );
      `);
      // Migración suave para bases creadas antes de agregar categorías.
      for (const col of ['category_id TEXT', 'category_icon TEXT']) {
        try {
          await db.execAsync(`ALTER TABLE local_transactions ADD COLUMN ${col}`);
        } catch {
          /* la columna ya existe */
        }
      }
      return db;
    });
  }
  return dbPromise;
}

export async function getSyncCursor(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_meta WHERE key = ?',
    ['lastPulledAt'],
  );
  return row?.value ?? null;
}

export async function setSyncCursor(iso: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)',
    ['lastPulledAt', iso],
  );
}

/** Utilidad para tests/desarrollo: limpia toda la base local. */
export async function resetLocalDb(): Promise<void> {
  const db = await getDb();
  await db.execAsync(
    'DELETE FROM local_transactions; DELETE FROM outbox; DELETE FROM sync_meta;',
  );
}
