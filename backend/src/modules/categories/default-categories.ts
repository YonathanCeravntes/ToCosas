/**
 * Catálogo global de categorías precargadas (con ícono emoji, color y keywords
 * para el parser de WhatsApp). Se siembran al arrancar el backend.
 */
export interface DefaultCategory {
  name: string;
  kind: 'ingreso' | 'gasto' | 'pago_deuda';
  icon: string; // emoji
  color: string; // hex
  keywords: string[];
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // --- Gastos ---
  { name: 'Comida', kind: 'gasto', icon: '🍔', color: '#F2994A', keywords: ['almuerzo', 'comida', 'cena', 'desayuno', 'restaurante', 'domicilio'] },
  { name: 'Mercado', kind: 'gasto', icon: '🛒', color: '#27AE60', keywords: ['mercado', 'super', 'supermercado', 'víveres'] },
  { name: 'Transporte', kind: 'gasto', icon: '🚌', color: '#2F80ED', keywords: ['uber', 'taxi', 'bus', 'gasolina', 'transporte', 'didi', 'peaje', 'transmilenio'] },
  { name: 'Servicios', kind: 'gasto', icon: '💡', color: '#F2C94C', keywords: ['luz', 'agua', 'internet', 'telefono', 'gas', 'servicios', 'energia'] },
  { name: 'Arriendo', kind: 'gasto', icon: '🏠', color: '#9B51E0', keywords: ['arriendo', 'renta', 'alquiler'] },
  { name: 'Salud', kind: 'gasto', icon: '💊', color: '#EB5757', keywords: ['farmacia', 'medico', 'eps', 'medicina', 'droga', 'odontologo'] },
  { name: 'Entretenimiento', kind: 'gasto', icon: '🎉', color: '#BB6BD9', keywords: ['cine', 'netflix', 'salida', 'fiesta', 'bar', 'trago', 'spotify'] },
  { name: 'Ropa', kind: 'gasto', icon: '👕', color: '#56CCF2', keywords: ['ropa', 'zapatos', 'tenis', 'camisa'] },
  { name: 'Educación', kind: 'gasto', icon: '📚', color: '#2D9CDB', keywords: ['curso', 'universidad', 'colegio', 'matricula', 'libros'] },
  { name: 'Hogar', kind: 'gasto', icon: '🛋️', color: '#828282', keywords: ['muebles', 'hogar', 'aseo', 'ferreteria'] },
  { name: 'Otros gastos', kind: 'gasto', icon: '📦', color: '#B0B0B0', keywords: ['otros', 'varios'] },

  // --- Ingresos ---
  { name: 'Salario', kind: 'ingreso', icon: '💰', color: '#219653', keywords: ['salario', 'sueldo', 'nomina', 'quincena', 'pago'] },
  { name: 'Freelance', kind: 'ingreso', icon: '💻', color: '#2F80ED', keywords: ['freelance', 'proyecto', 'independiente'] },
  { name: 'Ventas', kind: 'ingreso', icon: '🏷️', color: '#F2994A', keywords: ['venta', 'negocio', 'vendí'] },
  { name: 'Regalo', kind: 'ingreso', icon: '🎁', color: '#EB5757', keywords: ['regalo', 'obsequio'] },
  { name: 'Otros ingresos', kind: 'ingreso', icon: '➕', color: '#27AE60', keywords: ['otros', 'extra'] },

  // --- Pago de deuda ---
  { name: 'Cuota', kind: 'pago_deuda', icon: '💳', color: '#EB5757', keywords: ['cuota', 'credito', 'tarjeta', 'prestamo', 'hipoteca'] },
  { name: 'Abono extra', kind: 'pago_deuda', icon: '🚀', color: '#0B6E4F', keywords: ['abono', 'adelanto', 'extra'] },
];
