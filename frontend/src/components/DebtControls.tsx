import React from 'react';
import { Pressable, View, ViewProps } from 'react-native';
import { Text } from './AppText';
import { colors, radius, spacing, type } from '../theme/colors';

/**
 * FIN-060 (grupo Deudas) · Controles del lenguaje "Banca Privada" que usan las
 * pantallas de deudas, simulador y plan: control segmentado (pista marfil, opción
 * elegida en blanco) y chip suave (elegido en verde suave, no relleno).
 */
export function Segmented<T extends string | number | boolean>({
  options,
  value,
  onChange,
  style,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  style?: ViewProps['style'];
}) {
  return (
    <View
      accessibilityRole="tablist"
      style={[{ flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 3 }, style]}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{
              flex: 1,
              minHeight: 36,
              paddingVertical: 7,
              paddingHorizontal: spacing.xs,
              borderRadius: radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? colors.surface : 'transparent',
              borderWidth: on ? 1 : 0,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: on ? colors.text : colors.textMuted, fontWeight: on ? '600' : '500', ...type.small }} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Chip de opción: el elegido va en verde suave con texto verde oscuro. */
export function SoftChip({
  label,
  active,
  onPress,
  disabled,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      style={({ pressed }) => ({
        minHeight: 34,
        justifyContent: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: active ? colors.primarySoft : colors.border,
        backgroundColor: active ? colors.primarySoft : colors.surface,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ color: active ? colors.primaryDark : colors.text, fontWeight: active ? '600' : '400', ...type.small }}>{label}</Text>
    </Pressable>
  );
}
