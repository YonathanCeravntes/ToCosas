import React from 'react';
import { Text, View } from 'react-native';
import { SegmentBar } from './ui';
import { colors, spacing, type } from '../theme/colors';
import { formatMoney } from '../utils/format';
import { TeQueda } from '../api/types';

/**
 * Inicio G: cómo se reparte la BASE de ingreso del ciclo (misma de `teQueda`, §32):
 * por pagar (fijos + cuotas pendientes) · ya salió (gastos y pagos reales) · libre.
 */
export function IncomeSplit({ teQueda }: { teQueda: TeQueda }) {
  const base = teQueda.incomeBase ?? 0;
  if (base <= 0) return null;
  const pending = teQueda.pendingCommitments.reduce((a, c) => a + c.amount, 0);
  const free = Math.max(0, teQueda.amount);
  const spent = Math.max(0, base - teQueda.amount - pending);
  return (
    <View style={{ marginTop: spacing.sm }}>
      <SegmentBar
        parts={[
          { key: 'pending', label: 'Por pagar', value: pending, color: colors.warning },
          { key: 'spent', label: 'Ya salió', value: spent, color: colors.warningDeep },
          { key: 'free', label: 'Libre', value: free, color: colors.primary },
        ]}
      />
      <Text style={{ color: colors.textFaint, ...type.caption, marginTop: spacing.xs }}>
        De tu ingreso de {formatMoney(base)} este ciclo
      </Text>
    </View>
  );
}

