import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, type } from '../theme/colors';
import { parseDecimal } from '../utils/format';
import { rateHint, RateUnit } from '../utils/rates';

/**
 * FIN-056 (boceto 5) · Campo de tasa con selector "% mensual / % anual (EA)" y la
 * conversión a la vista. El valor sale tal como lo escribe la persona; quien lo usa
 * lo lleva a EA con `toEA` antes de mandarlo al servidor.
 */
export function RateInput({
  label = 'Tasa de interés',
  value,
  unit,
  onChange,
  placeholder,
  hint,
}: {
  label?: string;
  value: string;
  unit: RateUnit;
  onChange: (value: string, unit: RateUnit) => void;
  placeholder?: string;
  hint?: string;
}) {
  const n = parseDecimal(value); // §39: "1,8" y "1.8" son lo mismo
  const conversion = rateHint(n, unit);
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ color: colors.textMuted, ...type.small, fontWeight: '600', marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t, unit)}
          keyboardType="decimal-pad"
          placeholder={placeholder ?? (unit === 'mensual' ? '1,8' : '24')}
          placeholderTextColor={colors.textFaint}
          accessibilityLabel={label}
          style={{ flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, backgroundColor: colors.surface, color: colors.text, fontSize: 16, fontWeight: '700' }}
        />
        <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: 3, gap: 2 }} accessibilityRole="radiogroup">
          {(['mensual', 'anual'] as RateUnit[]).map((u) => {
            const on = unit === u;
            return (
              <Pressable
                key={u}
                onPress={() => onChange(value, u)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={{ minHeight: 38, paddingHorizontal: 10, borderRadius: radius.sm - 2, justifyContent: 'center', backgroundColor: on ? colors.surface : 'transparent' }}
              >
                <Text style={{ color: on ? colors.primaryDark : colors.textMuted, ...type.small, fontWeight: on ? '800' : '600' }}>{u === 'mensual' ? '% mensual' : '% anual (EA)'}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {conversion ? <Text style={{ color: colors.primaryDark, ...type.small, fontWeight: '700', marginTop: 6 }}>= {conversion.split(' = ')[1]}</Text> : null}
      <Text style={{ color: colors.textFaint, ...type.caption, marginTop: 4 }}>
        {hint ?? 'La anual (EA) es la que aparece en tu extracto o en el pagaré; la mensual, la que te dijeron en el banco.'}
      </Text>
    </View>
  );
}
