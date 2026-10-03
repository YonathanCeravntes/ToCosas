import React from 'react';
import { View } from 'react-native';
import { Text } from './AppText';
import { PaceBar, Pill, SegmentBar } from './ui';
import { colors, spacing, type } from '../theme/colors';
import { formatMoney } from '../utils/format';
import { TeQueda } from '../api/types';

/** Reparto de la base de ingreso del ciclo (mismos datos de `teQueda`, §32). */
function splitOf(teQueda: TeQueda): { base: number; pending: number; spent: number; free: number } {
  const base = teQueda.incomeBase ?? 0;
  const pending = teQueda.pendingCommitments.reduce((a, c) => a + c.amount, 0);
  const free = Math.max(0, teQueda.amount);
  const spent = Math.max(0, base - teQueda.amount - pending);
  return { base, pending, spent, free };
}

/**
 * Inicio G: cómo se reparte la BASE de ingreso del ciclo (misma de `teQueda`, §32):
 * por pagar (fijos + cuotas pendientes) · ya salió (gastos y pagos reales) · libre.
 */
export function IncomeSplit({ teQueda }: { teQueda: TeQueda }) {
  const { base, pending, spent, free } = splitOf(teQueda);
  if (base <= 0) return null;
  return (
    <View style={{ marginTop: spacing.sm + 2 }}>
      <SegmentBar
        height={8}
        parts={[
          { key: 'pending', label: 'Por pagar', value: pending, color: colors.warningDeep },
          { key: 'spent', label: 'Ya salió', value: spent, color: colors.textFaint },
          { key: 'free', label: 'Libre', value: free, color: colors.primary },
        ]}
      />
      <Text style={{ color: colors.textFaint, ...type.caption, marginTop: spacing.xs }}>
        De tu ingreso de {formatMoney(base)} este ciclo
      </Text>
    </View>
  );
}

/** "$ 85.000" → "$85.000" (la píldora es compacta). */
function compactMoney(n: number): string {
  return formatMoney(n).replace(/\s/g, '');
}

/**
 * FIN-060 · Ritmo del ciclo (aprobado por el Fundador): cuánto del dinero del ciclo ya
 * salió (relleno) contra el día del ciclo en que vas (marca de "hoy"). Debajo, la
 * diferencia contra el ritmo ideal en pesos. Solo usa datos que Inicio ya recibe; si
 * falta la posición en el ciclo, la marca y la diferencia no se pintan.
 */
export function CyclePace({ teQueda, ideal }: { teQueda: TeQueda; ideal?: number | null }) {
  const { base, spent } = splitOf(teQueda);
  if (base <= 0) return null;
  const used = Math.min(1, spent / base);
  const today = ideal != null && Number.isFinite(ideal) ? Math.max(0, Math.min(1, ideal)) : null;
  const diff = today != null ? Math.round((today - used) * base) : null;
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={{ color: colors.textFaint, ...type.label, marginBottom: spacing.xs }}>Ritmo del ciclo</Text>
      <View
        accessible
        accessibilityLabel={`Ya salió el ${Math.round(used * 100)} por ciento de tu ingreso del ciclo${today != null ? `; vas en el ${Math.round(today * 100)} por ciento del ciclo` : ''}`}
      >
        <PaceBar used={used} ideal={today ?? undefined} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={{ color: colors.textFaint, ...type.caption }}>Ya salió {Math.round(used * 100)} %</Text>
        {today != null ? <Text style={{ color: colors.textFaint, ...type.caption }}>hoy · {Math.round(today * 100)} % del ciclo</Text> : null}
      </View>
      {diff != null ? (
        <View style={{ marginTop: spacing.sm }}>
          {diff >= 0 ? (
            <Pill tone="ok" label={`+${compactMoney(diff)} bajo el ritmo`} />
          ) : (
            <Pill tone="warn" label={`${compactMoney(-diff)} sobre el ritmo`} />
          )}
        </View>
      ) : null}
    </View>
  );
}
