import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { chartColors, colors } from '../theme/colors';
import type { IconName } from './ui';

/**
 * Ícono vectorial de una categoría o tipo de movimiento (decisión del Fundador
 * 2026-09-27, `DEC-0040` §2). El backend sigue guardando el emoji de la categoría
 * (`Category.icon`, contrato estable con el bot y con datos existentes); la app lo
 * traduce aquí a un ícono de Ionicons para que se vea igual en todos los teléfonos y
 * combine con la barra de navegación (FIN-038). Un emoji desconocido (categoría creada
 * por el usuario) cae al ícono de su tipo.
 */
const EMOJI_TO_ICON: Record<string, IconName> = {
  // gastos (default-categories.ts)
  '🍔': 'restaurant-outline',
  '🛒': 'cart-outline',
  '🚌': 'bus-outline',
  '💡': 'bulb-outline',
  '🏠': 'home-outline',
  '💊': 'medkit-outline',
  '🎉': 'game-controller-outline',
  '👕': 'shirt-outline',
  '📚': 'book-outline',
  '🛋️': 'bed-outline',
  '📦': 'cube-outline',
  // FIN-061 F2
  '🛵': 'bicycle-outline',
  '☕': 'cafe-outline',
  // tipos de gasto fijo (FIN-048)
  '🏢': 'business-outline',
  '📶': 'wifi-outline',
  '📱': 'phone-portrait-outline',
  '🛡️': 'shield-checkmark-outline',
  '📺': 'tv-outline',
  '🅿️': 'car-outline',
  '🏋️': 'barbell-outline',
  '👪': 'people-outline',
  '📌': 'pin-outline',
  // ingresos
  '💰': 'cash-outline',
  '💵': 'cash-outline',
  '💻': 'laptop-outline',
  '🏷️': 'pricetag-outline',
  '🎁': 'gift-outline',
  '➕': 'add-circle-outline',
  // pagos de deuda / otros
  '💳': 'card-outline',
  '🚀': 'rocket-outline',
  '🔁': 'swap-horizontal-outline',
};

/**
 * FIN-060 (Banca Privada): el color del ícono lo da el TIPO, no la categoría — gasto y
 * transferencia neutros, ingreso verde de marca, pago de deuda azul de deudas. Los
 * colores sueltos por categoría se retiraron (jerarquía con letra, no con color).
 */
const KIND_FALLBACK: Record<string, { icon: IconName; color: string; bg: string }> = {
  gasto: { icon: 'cart-outline', color: colors.textMuted, bg: colors.surfaceAlt },
  ingreso: { icon: 'cash-outline', color: colors.primary, bg: colors.primarySoft },
  pago_deuda: { icon: 'card-outline', color: colors.debt, bg: colors.debtSoft },
  transferencia: { icon: 'swap-horizontal-outline', color: colors.textMuted, bg: colors.surfaceAlt },
};

export function categoryIconName(emoji?: string | null, kind?: string | null): IconName {
  if (emoji && EMOJI_TO_ICON[emoji]) return EMOJI_TO_ICON[emoji];
  return (KIND_FALLBACK[kind ?? ''] ?? KIND_FALLBACK.transferencia).icon;
}

/**
 * FIN-060 · Colores de las fuentes de ingreso ("Cómo te llega la plata"): la parte fija
 * en verde de marca, las demás con la serie de gráficos y "Sin categoría" en gris.
 * Mismo orden que `sources`, para que la barra y las filas coincidan.
 */
export function incomeSourceColors(sources: Array<{ id: string; kind: string }>): string[] {
  let next = 1;
  return sources.map((s) => {
    if (s.kind === 'fijo') return colors.primary;
    if (s.id === 'sin') return chartColors[4];
    const c = chartColors[Math.min(next, 3)];
    next += 1;
    return c;
  });
}

/**
 * FIN-060 · Tonos de un mismo verde para las categorías de gasto (de la más grande a la
 * más pequeña); "Sin categoría" va en gris.
 */
export function categoryShade(index: number, uncategorized?: boolean): string {
  if (uncategorized) return colors.textFaint + '80';
  const alpha = ['', 'B3', '80', '59', '40'];
  return colors.primary + alpha[Math.min(index, alpha.length - 1)];
}

export function CategoryGlyph({
  emoji,
  kind,
  size = 'md',
}: {
  /** Emoji guardado en `Category.icon` (puede ser null: sin categoría). */
  emoji?: string | null;
  /** Tipo de movimiento: decide el ícono (si no hay categoría conocida) y el tono. */
  kind?: string | null;
  /** Se acepta por compatibilidad; desde FIN-060 el tono lo decide el tipo. */
  color?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const tone = KIND_FALLBACK[kind ?? ''] ?? KIND_FALLBACK.transferencia;
  const box = size === 'lg' ? 44 : size === 'sm' ? 26 : 34;
  const glyph = size === 'lg' ? 22 : size === 'sm' ? 14 : 17;
  return (
    <View
      accessible={false}
      style={{
        width: box,
        height: box,
        borderRadius: Math.round(box * 0.29),
        backgroundColor: tone.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={categoryIconName(emoji, kind)} size={glyph} color={tone.color} />
    </View>
  );
}
