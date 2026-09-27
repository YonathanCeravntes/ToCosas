import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme/colors';
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

const KIND_FALLBACK: Record<string, { icon: IconName; color: string }> = {
  gasto: { icon: 'cart-outline', color: colors.danger },
  ingreso: { icon: 'cash-outline', color: colors.success },
  pago_deuda: { icon: 'card-outline', color: colors.primary },
  transferencia: { icon: 'swap-horizontal-outline', color: colors.textMuted },
};

export function categoryIconName(emoji?: string | null, kind?: string | null): IconName {
  if (emoji && EMOJI_TO_ICON[emoji]) return EMOJI_TO_ICON[emoji];
  return (KIND_FALLBACK[kind ?? ''] ?? KIND_FALLBACK.transferencia).icon;
}

export function CategoryGlyph({
  emoji,
  kind,
  color,
  size = 'md',
}: {
  /** Emoji guardado en `Category.icon` (puede ser null: sin categoría). */
  emoji?: string | null;
  /** Tipo de movimiento: decide el ícono y el color cuando no hay categoría conocida. */
  kind?: string | null;
  /** Color de la categoría (`Category.color`); si falta, el color del tipo. */
  color?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const tint = color || (KIND_FALLBACK[kind ?? ''] ?? KIND_FALLBACK.transferencia).color;
  const box = size === 'lg' ? 44 : size === 'sm' ? 28 : 36;
  const glyph = size === 'lg' ? 24 : size === 'sm' ? 15 : 19;
  return (
    <View
      accessible={false}
      style={{
        width: box,
        height: box,
        borderRadius: radius.full,
        backgroundColor: tint + '1F',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={categoryIconName(emoji, kind)} size={glyph} color={tint} />
    </View>
  );
}
