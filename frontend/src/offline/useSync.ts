import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { runSync, SyncResult } from './syncEngine';
import { transactionsRepo } from './transactionsRepo';

export interface SyncStatus {
  syncing: boolean;
  lastResult: SyncResult | null;
  pending: number;
  error: string | null;
  sync: () => Promise<void>;
  refreshPending: () => Promise<void>;
}

/**
 * Hook de sincronización. Ejecuta un sync al montar y cada vez que la app
 * vuelve a primer plano (buen momento para reintentar tras recuperar señal).
 */
export function useSync(): SyncStatus {
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refreshPending = useCallback(async () => {
    setPending(await transactionsRepo.pendingCount());
  }, []);

  const sync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setError(null);
    try {
      const result = await runSync();
      setLastResult(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSyncing(false);
      await refreshPending();
    }
  }, [syncing, refreshPending]);

  useEffect(() => {
    void sync();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { syncing, lastResult, pending, error, sync, refreshPending };
}
