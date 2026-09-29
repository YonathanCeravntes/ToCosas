import type { TextStyle } from 'react-native';

/**
 * Tokens de diseño de Millo (Fachada v1, FIN-038).
 *
 * Una sola fuente para color, espacio, radio y tipografía. Las pantallas NO deben
 * escribir hex ni tamaños sueltos: si falta un token, se agrega aquí. Los tokens
 * "semánticos" (successBg, scrim, onPrimaryMuted…) existen porque el mismo valor se
 * repetía en varios archivos (diagnóstico SPRINT-PULIDO-001 P3).
 */
export const colors = {
  primary: '#0B6E4F',
  primaryDark: '#08543C',
  primaryLight: '#12A676',
  /** Fondo suave del color primario (chips activos, acuses). */
  primarySoft: '#EAF7F1',
  accent: '#F2B705',
  danger: '#D64545',
  dangerSoft: '#FDECEC',
  success: '#2E9E5B',
  successSoft: '#EAF7F1',
  warning: '#E08A00',
  warningSoft: '#FFF6E5',
  /** Banda 'Frágil' del Score (entre warning y danger). */
  bandFragil: '#E06A00',
  info: '#2563EB',
  infoSoft: '#EAF0FD',

  bg: '#F6F8F7',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F3F1',
  border: '#E2E8E5',

  text: '#12211C',
  textMuted: '#5B6B64',
  textFaint: '#8A968F',
  textInverse: '#FFFFFF',
  /** Texto secundario sobre fondo primario (antes `opacity: 0.85`). */
  onPrimaryMuted: 'rgba(255,255,255,0.85)',
  onPrimaryFaint: 'rgba(255,255,255,0.65)',
  /** Pista blanca translúcida para barras sobre fondo primario. */
  onPrimaryTrack: 'rgba(255,255,255,0.2)',
  /** Fondo oscurecido detrás de modales/hojas. */
  scrim: 'rgba(0,0,0,0.45)',
};

/**
 * Mis deudas (opción B): tramos de la barra "cuánto pesa cada deuda en tu total".
 * Alternan claro/oscuro para distinguirse por luminosidad, no solo por tono.
 */
export const debtShareColors = ['#0B6E4F', '#E08A00', '#7FB8A3', '#2563EB', '#B45309', '#9DB4AB'];

/** Colores por categoría de entidad financiera (antes paleta paralela en AddDebt). */
export const entityColors: Record<string, string> = {
  banco: '#2563EB',
  cooperativa: '#0891B2',
  fintech: '#7C3AED',
  prestamista_particular: '#B45309',
  tarjeta: '#DB2777',
  otro: '#4B5563',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 999,
};

/**
 * Escala tipográfica (8 pasos). `fontVariant: ['tabular-nums']` en cifras para que
 * los dígitos no bailen al cambiar. `hero` es la cifra protagonista de cada pantalla.
 */
const TABULAR: TextStyle['fontVariant'] = ['tabular-nums'];

export const type = {
  caption: { fontSize: 11, lineHeight: 15 },
  small: { fontSize: 12, lineHeight: 17 },
  body: { fontSize: 14, lineHeight: 20 },
  bodyLg: { fontSize: 16, lineHeight: 22 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: '800' as const },
  display: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const },
  hero: { fontSize: 36, lineHeight: 42, fontWeight: '800' as const, fontVariant: TABULAR },
};

/** Tamaño táctil mínimo (accesibilidad): 44 dp. */
export const touch = { min: 44 };
