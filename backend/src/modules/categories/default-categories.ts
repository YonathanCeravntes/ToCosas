/**
 * Catálogo global de categorías precargadas (con ícono emoji, color y keywords
 * para el parser de WhatsApp). Se siembran al arrancar el backend.
 */
export interface DefaultCategory {
  name: string;
  kind: 'ingreso' | 'gasto' | 'pago_deuda';
  icon: string; // emoji (la app lo traduce a ícono vectorial, CategoryGlyph)
  color: string; // hex
  keywords: string[];
  /** FIN-048: tipo de GASTO FIJO (se elige al crear un gasto fijo; no sale en Registrar). */
  fixed?: boolean;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // --- Gastos del día a día (variables) ---
  { name: 'Comida', kind: 'gasto', icon: '🍔', color: '#F2994A', keywords: ['almuerzo', 'comida', 'cena', 'desayuno', 'restaurante', 'domicilio'] },
  { name: 'Mercado', kind: 'gasto', icon: '🛒', color: '#27AE60', keywords: ['mercado', 'super', 'supermercado', 'víveres'] },
  { name: 'Transporte', kind: 'gasto', icon: '🚌', color: '#2F80ED', keywords: ['uber', 'taxi', 'bus', 'gasolina', 'transporte', 'didi', 'peaje', 'transmilenio'] },
  { name: 'Salud', kind: 'gasto', icon: '💊', color: '#EB5757', keywords: ['farmacia', 'medico', 'eps', 'medicina', 'droga', 'odontologo'] },
  { name: 'Salidas y entretenimiento', kind: 'gasto', icon: '🎉', color: '#BB6BD9', keywords: ['cine', 'salida', 'fiesta', 'bar', 'trago', 'concierto', 'paseo'] },
  { name: 'Ropa', kind: 'gasto', icon: '👕', color: '#56CCF2', keywords: ['ropa', 'zapatos', 'tenis', 'camisa'] },
  { name: 'Hogar', kind: 'gasto', icon: '🛋️', color: '#828282', keywords: ['muebles', 'hogar', 'aseo', 'ferreteria'] },
  { name: 'Otros gastos', kind: 'gasto', icon: '📦', color: '#B0B0B0', keywords: ['otros', 'varios'] },

  // --- Tipos de gasto FIJO (FIN-048, Fundador 2026-09-29) ---
  { name: 'Arriendo', kind: 'gasto', icon: '🏠', color: '#9B51E0', keywords: ['arriendo', 'renta', 'alquiler'], fixed: true },
  { name: 'Administración', kind: 'gasto', icon: '🏢', color: '#6D6D6D', keywords: ['administracion', 'admin'], fixed: true },
  { name: 'Servicios públicos', kind: 'gasto', icon: '💡', color: '#F2C94C', keywords: ['luz', 'agua', 'gas', 'energia', 'acueducto', 'servicios'], fixed: true },
  { name: 'Internet y TV', kind: 'gasto', icon: '📶', color: '#2D9CDB', keywords: ['internet', 'wifi', 'television', 'cable', 'tv'], fixed: true },
  { name: 'Celular', kind: 'gasto', icon: '📱', color: '#56CCF2', keywords: ['celular', 'plan', 'telefono', 'minutos', 'datos'], fixed: true },
  { name: 'Educación', kind: 'gasto', icon: '📚', color: '#2D9CDB', keywords: ['curso', 'universidad', 'colegio', 'matricula', 'libros', 'pension'], fixed: true },
  { name: 'Seguros', kind: 'gasto', icon: '🛡️', color: '#219653', keywords: ['seguro', 'poliza', 'soat'], fixed: true },
  { name: 'Suscripciones', kind: 'gasto', icon: '📺', color: '#BB6BD9', keywords: ['netflix', 'spotify', 'disney', 'suscripcion', 'youtube', 'prime', 'hbo'], fixed: true },
  { name: 'Transporte fijo', kind: 'gasto', icon: '🅿️', color: '#2F80ED', keywords: ['parqueadero', 'pase', 'mensualidad'], fixed: true },
  { name: 'Gimnasio', kind: 'gasto', icon: '🏋️', color: '#EB5757', keywords: ['gimnasio', 'gym'], fixed: true },
  { name: 'Apoyo familiar', kind: 'gasto', icon: '👪', color: '#F2994A', keywords: ['mama', 'papa', 'familia', 'mesada'], fixed: true },
  { name: 'Otro fijo', kind: 'gasto', icon: '📌', color: '#B0B0B0', keywords: ['fijo'], fixed: true },

  // --- Ingresos ---
  { name: 'Salario', kind: 'ingreso', icon: '💰', color: '#219653', keywords: ['salario', 'sueldo', 'nomina', 'quincena', 'pago'] },
  { name: 'Freelance', kind: 'ingreso', icon: '💻', color: '#2F80ED', keywords: ['freelance', 'proyecto', 'independiente'] },
  { name: 'Ventas', kind: 'ingreso', icon: '🏷️', color: '#F2994A', keywords: ['venta', 'negocio', 'vendí'] },
  { name: 'Regalo', kind: 'ingreso', icon: '🎁', color: '#EB5757', keywords: ['regalo', 'obsequio'] },
  // FIN-057 (Fundador 2026-10-02): el rebusque en plataformas (Didi, Uber, InDriver, Rappi…)
  // es una fuente propia; antes caía en "Otros ingresos" y el bot lo tomaba por transporte pagado.
  { name: 'Plataformas', kind: 'ingreso', icon: '🚗', color: '#E08A00', keywords: ['didi', 'uber', 'indriver', 'picap', 'cabify', 'rappi', 'carrera', 'plataforma'] },
  { name: 'Otros ingresos', kind: 'ingreso', icon: '➕', color: '#27AE60', keywords: ['otros', 'extra'] },

  // --- Pago de deuda ---
  { name: 'Cuota', kind: 'pago_deuda', icon: '💳', color: '#EB5757', keywords: ['cuota', 'credito', 'tarjeta', 'prestamo', 'hipoteca'] },
  { name: 'Abono extra', kind: 'pago_deuda', icon: '🚀', color: '#0B6E4F', keywords: ['abono', 'adelanto', 'extra'] },
];
