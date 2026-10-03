import React from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from './AppText';
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
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t, unit)}
        keyboardType="decimal-pad"
        placeholder={placeholder ?? (unit === 'mensual' ? '1,8' : '24')}
        placeholderTextColor={colors.textFaint}
        accessibilityLabel={label}
        style={{ minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: 12, backgroundColor: colors.surface, color: colors.text, ...type.bodyLg }}
      />
      <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 3, marginTop: 6 }} accessibilityRole="radiogroup">
        {(['mensual', 'anual'] as RateUnit[]).map((u) => {
          const on = unit === u;
          return (
            <Pressable
              key={u}
              onPress={() => onChange(value, u)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={{ flex: 1, minHeight: 36, paddingHorizontal: 10, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.surface : 'transparent', borderWidth: on ? 1 : 0, borderColor: colors.border }}
            >
              <Text style={{ color: on ? colors.text : colors.textMuted, ...type.small, fontWeight: on ? '600' : '500' }}>{u === 'mensual' ? '% mensual' : '% anual (EA)'}</Text>
            </Pressable>
          );
        })}
      </View>
      {conversion ? <Text style={{ color: colors.primary, ...type.small, fontWeight: '600', marginTop: 6 }}>= {conversion.split(' = ')[1]}</Text> : null}
      <Text style={{ color: colors.textFaint, ...type.caption, marginTop: 4 }}>
        {hint ?? 'La anual (EA) es la que aparece en tu extracto o en el pagaré; la mensual, la que te dijeron en el banco.'}
      </Text>
    </View>
  );
}
