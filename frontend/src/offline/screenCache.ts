import { Platform } from 'react-native';
import { getDb } from './database';

/**
 * FIN-056 (BT-037) · Caché de pantallas: la última respuesta de cada consulta se guarda
 * en el dispositivo y se pinta AL INSTANTE al abrir la pantalla, mientras llega la
 * fresca ("stale-while-revalidate"). Así Inicio no muestra un bloque de carga y luego
 * las cifras: muestra las cifras de la última vez y las actualiza en silencio.
 * En el teléfono vive en la tabla `sync_meta` de SQLite (ya existía); en la web, en
 * localStorage. Todo es opcional: si falla, la pantalla carga como siempre.
 */
const PREFIX = 'cache:';

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    let raw: string | null = null;
    if (Platform.OS === 'web') {
      raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(PREFIX + key);
    } else {
      const db = await getDb();
      const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM sync_meta WHERE key = ?', [PREFIX + key]);
      raw = row?.value ?? null;
    }
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setCached(key: string, value: unknown): Promise<void> {
  try {
    const raw = JSON.stringify(value);
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(PREFIX + key, raw);
      return;
    }
    const db = await getDb();
    await db.runAsync('INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)', [PREFIX + key, raw]);
  } catch {
    /* la caché es opcional */
  }
}

/** Al cerrar sesión: nada de la persona anterior debe quedar en el dispositivo. */
export async function clearScreenCache(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') return;
      Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
      return;
    }
    const db = await getDb();
    await db.runAsync("DELETE FROM sync_meta WHERE key LIKE 'cache:%'");
  } catch {
    /* opcional */
  }
}
