/**
 * FIN-061 Fase 2.2 · Esencial, gustos y mixtos (función pura).
 *
 * Clasificación SUGERIDA por el nombre de la categoría global; la persona la cambia
 * cuando para ella es distinto (`UserCategoryPref.spendClass`). Una categoría "mixta"
 * (almuerzos del trabajo, ropa, hogar…) no cuenta ni como esencial ni como gusto hasta
 * que la persona decide: Millo no adivina en contra de nadie.
 */
export type SpendClassValue = 'esencial' | 'gusto';
export type SpendClassOrMixed = SpendClassValue | 'mixto';

/** Esencial: lo que no se puede dejar de pagar aunque no sea fijo. */
export const ESSENTIAL_CATEGORY_NAMES = [
  'Mercado',
  'Transporte',
  'Salud',
  'Arriendo',
  'Administración',
  'Servicios públicos',
  'Internet y TV',
  'Celular',
  'Educación',
  'Seguros',
  'Transporte fijo',
  'Apoyo familiar',
];

/** Gustos: lo que da disfrute y se puede espaciar (nunca se sugiere eliminar). */
export const GUSTO_CATEGORY_NAMES = ['Salidas y entretenimiento', 'Suscripciones', 'Domicilios', 'Café y antojos'];

export function defaultSpendClass(name: string, isGlobal: boolean): SpendClassOrMixed {
  if (!isGlobal) return 'mixto';
  if (ESSENTIAL_CATEGORY_NAMES.includes(name)) return 'esencial';
  if (GUSTO_CATEGORY_NAMES.includes(name)) return 'gusto';
  return 'mixto';
}

export interface CategoryClass {
  /** Clase que se usa en los cálculos (la de la persona o la sugerida). */
  spendClass: SpendClassOrMixed;
  /** Clase sugerida por Millo. */
  suggested: SpendClassOrMixed;
  /** "Esto me sostiene": Millo nunca sugiere espaciarlo. */
  protected: boolean;
}

export function classify(
  category: { name: string; isGlobal: boolean },
  pref?: { spendClass: SpendClassValue | null; protected: boolean } | null,
): CategoryClass {
  const suggested = defaultSpendClass(category.name, category.isGlobal);
  return {
    spendClass: pref?.spendClass ?? suggested,
    suggested,
    protected: pref?.protected ?? false,
  };
}
