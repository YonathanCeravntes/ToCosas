/** FIN-048: orden de los tipos de gasto fijo — los más comunes primero; "Otro fijo" al final. */
const FIXED_ORDER = ['Arriendo', 'Administración', 'Servicios públicos', 'Internet y TV', 'Celular', 'Educación', 'Seguros', 'Suscripciones', 'Transporte fijo', 'Gimnasio', 'Apoyo familiar'];

export const OTHER_FIXED = 'Otro fijo';

export const fixedOrder = (name: string) => {
  const i = FIXED_ORDER.indexOf(name);
  return i === -1 ? (name === OTHER_FIXED ? 999 : 500) : i;
};
