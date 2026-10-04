import type { TextStyle } from 'react-native';
import { isDark } from './appearance';

/**
 * Tokens de diseño de Millo (Fachada v1, FIN-038).
 *
 * Una sola fuente para color, espacio, radio y tipografía. Las pantallas NO deben
 * escribir hex ni tamaños sueltos: si falta un token, se agrega aquí. Los tokens
 * "semánticos" (successBg, scrim, onPrimaryMuted…) existen porque el mismo valor se
 * repetía en varios archivos (diagnóstico SPRINT-PULIDO-001 P3).
 */
const light = {
  // FIN-060 · Paleta "Banca Privada" (aprobada por el Fundador 2026-10-03): esmeralda
  // profunda, neutros marfil y un acento dorado. El verde de marca ocupa ~10 % de la
  // pantalla; la jerarquía se hace con letra, no con color.
  primary: '#0B6E4F',
  primaryDark: '#08533B',
  primaryLight: '#12A575',
  /** Fondo suave del color primario (chips activos, acuses). */
  primarySoft: '#E7F1EC',
  /** Dorado del logo: metas, logros, Millo+ y rachas. Solo rellenos/íconos. */
  accent: '#C9A24A',
  gold: '#C9A24A',
  goldSoft: '#F6EED9',
  /** Dorado legible como texto sobre blanco (4.6:1). */
  goldText: '#8C6A1F',
  danger: '#B3261E',
  dangerSoft: '#FBEDEC',
  success: '#137A4E',
  successSoft: '#E7F1EC',
  warning: '#B7791F',
  warningSoft: '#FBF1E0',
  /** Ámbar oscuro: texto de aviso legible sobre blanco y tramo "ya salió" (Inicio G). */
  warningDeep: '#9A5B00',
  /** Rojo oscuro: texto crítico legible sobre blanco (Salud J). */
  dangerDeep: '#8E1F18',
  /** Banda 'Frágil' del Score. */
  bandFragil: '#9A5B00',
  info: '#2B5C8A',
  infoSoft: '#E8EFF6',
  /** Serie de deudas (antes morado): azul sobrio, segunda serie de datos. */
  debt: '#2B5C8A',
  debtSoft: '#E8EFF6',
  /** Millo en pareja: color de la pareja (tú = primary). Nunca rojo ni rosado. */
  partner: '#2B5C8A',
  partnerSoft: '#E8EFF6',

  bg: '#F7F5F0',
  surface: '#FFFFFF',
  surfaceAlt: '#EFECE4',
  border: '#E2DDD2',

  text: '#14201B',
  textMuted: '#4A564F',
  textFaint: '#646E68',
  textInverse: '#FFFFFF',
  /** Texto secundario sobre fondo primario (antes `opacity: 0.85`). */
  onPrimaryMuted: 'rgba(255,255,255,0.85)',
  onPrimaryFaint: 'rgba(255,255,255,0.7)',
  /** Pista blanca translúcida para barras sobre fondo primario. */
  onPrimaryTrack: 'rgba(255,255,255,0.2)',
  /** Fondo oscurecido detrás de modales/hojas. */
  scrim: 'rgba(7,18,14,0.5)',
};

/**
 * FIN-060 · Modo oscuro "Banca Privada": superficies verde-negro, texto marfil y la
 * marca un tono más clara. Sobre el verde de marca el texto va oscuro (contraste 7:1),
 * por eso `textInverse` cambia.
 */
const dark: typeof light = {
  primary: '#3DB389',
  primaryDark: '#5CC9A0',
  primaryLight: '#2E9E76',
  primarySoft: '#12392C',
  accent: '#D9B45A',
  gold: '#D9B45A',
  goldSoft: '#3A3120',
  goldText: '#E6C677',
  danger: '#F2766B',
  dangerSoft: '#3D1D1A',
  success: '#4CC38A',
  successSoft: '#12392C',
  warning: '#E8A94C',
  warningSoft: '#3A2C14',
  warningDeep: '#F0BC6A',
  dangerDeep: '#F79A90',
  bandFragil: '#E8A94C',
  info: '#7FB0E0',
  infoSoft: '#1A2B3B',
  debt: '#7FB0E0',
  debtSoft: '#1A2B3B',
  partner: '#7FB0E0',
  partnerSoft: '#1A2B3B',

  bg: '#0B110F',
  surface: '#131B18',
  surfaceAlt: '#1B2521',
  border: '#26312C',

  text: '#EEF1EC',
  textMuted: '#A9B4AE',
  textFaint: '#7E8A84',
  textInverse: '#06120D',
  onPrimaryMuted: 'rgba(6,18,13,0.82)',
  onPrimaryFaint: 'rgba(6,18,13,0.68)',
  onPrimaryTrack: 'rgba(6,18,13,0.2)',
  scrim: 'rgba(0,0,0,0.6)',
};

export const colors = isDark ? dark : light;
export { isDark };

/** FIN-060: series de gráficos (máximo 5; el resto va en "Otros"). */
export const chartColors = isDark
  ? ['#3DB389', '#7FB0E0', '#D9B45A', '#C291B8', '#6E7A74']
  : ['#0B6E4F', '#2B5C8A', '#C9A24A', '#8B5E83', '#8A9690'];

/**
 * Mis deudas (opción B): tramos de la barra "cuánto pesa cada deuda en tu total".
 * Alternan claro/oscuro para distinguirse por luminosidad, no solo por tono.
 */
export const debtShareColors = isDark
  ? ['#3DB389', '#7FB0E0', '#D9B45A', '#C291B8', '#6E7A74', '#5CC9A0']
  : ['#0B6E4F', '#2B5C8A', '#C9A24A', '#8B5E83', '#8A9690', '#5E9E85'];

/** Colores por categoría de entidad financiera (antes paleta paralela en AddDebt). */
export const entityColors: Record<string, string> = isDark
  ? { banco: '#7FB0E0', cooperativa: '#6FB7BE', fintech: '#A897CC', prestamista_particular: '#D4A266', tarjeta: '#C291B8', otro: '#A9B4AE' }
  : { banco: '#2B5C8A', cooperativa: '#3F7F86', fintech: '#6B5B8A', prestamista_particular: '#9A6B2E', tarjeta: '#8B5E83', otro: '#646E68' };

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
  title: { fontSize: 17, lineHeight: 23, fontWeight: '600' as const },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: '600' as const, letterSpacing: -0.3 },
  display: { fontSize: 28, lineHeight: 34, fontWeight: '600' as const, letterSpacing: -0.5 },
  hero: { fontSize: 36, lineHeight: 42, fontWeight: '600' as const, letterSpacing: -0.8, fontVariant: TABULAR },
  /** FIN-060: etiqueta de sección en mayúsculas pequeñas. */
  label: { fontSize: 11, lineHeight: 14, fontWeight: '600' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
};

/** Tamaño táctil mínimo (accesibilidad): 44 dp. */
export const touch = { min: 44 };
