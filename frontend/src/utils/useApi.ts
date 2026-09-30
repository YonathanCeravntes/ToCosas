import { useCallback, useEffect, useRef, useState } from 'react';
import { getCached, setCached } from '../offline/screenCache';

/**
 * Hook de carga con estado (data/loading/error/reload).
 *
 * FIN-056 (BT-037): con `cacheKey`, la última respuesta se guarda en el dispositivo y se
 * pinta al instante al abrir la pantalla; la fresca la reemplaza en silencio. `loading`
 * sigue diciendo si hay una consulta en curso, pero las pantallas solo muestran el
 * esqueleto cuando NO hay datos (ni frescos ni de la última vez).
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = [], opts: { cacheKey?: string } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fresh = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      fresh.current = true;
      setData(result);
      if (opts.cacheKey) void setCached(opts.cacheKey, result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!opts.cacheKey) return;
    let alive = true;
    void getCached<T>(opts.cacheKey).then((cached) => {
      // Solo si la consulta fresca no llegó antes que la caché.
      if (alive && cached !== null && !fresh.current) setData((cur) => cur ?? cached);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.cacheKey]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
