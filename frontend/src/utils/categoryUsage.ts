import { categoriesApi, transactionsApi } from '../api/endpoints';
import { Category } from '../api/types';

/**
 * FIN-056 (boceto 1) · Categorías ordenadas por lo que la persona más usa: las de sus
 * últimos 100 movimientos primero, el resto en el orden del catálogo. Sin movimientos,
 * queda el orden del catálogo. Si el historial falla, se devuelve el catálogo igual.
 */
export async function loadCategoriesByUsage(kind: 'gasto' | 'ingreso'): Promise<Category[]> {
  const [cats, txs] = await Promise.all([
    categoriesApi.list(kind),
    transactionsApi.list({ kind, limit: 100 }).catch(() => []),
  ]);
  const count = new Map<string, number>();
  for (const t of txs) if (t.categoryId) count.set(t.categoryId, (count.get(t.categoryId) ?? 0) + 1);
  return cats
    .map((c, i) => ({ c, i, n: count.get(c.id) ?? 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map((x) => x.c);
}

/** Cuántas caben en la cuadrícula corta antes de "Todas". */
export const TOP_CATEGORIES = 7;
