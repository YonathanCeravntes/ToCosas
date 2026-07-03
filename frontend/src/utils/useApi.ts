import { useCallback, useEffect, useState } from 'react';

/**
 * Hook simple para cargar datos de la API con estados de carga/error y refetch.
 * Para un producto maduro conviene React Query; esto mantiene el scaffold ligero.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetcher());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
