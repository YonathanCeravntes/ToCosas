import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from './AppText';
import { Ico } from './ui';
import { colors, radius, spacing, type } from '../theme/colors';
import { Insight } from '../api/types';
import { insightsApi, proposalsApi } from '../api/endpoints';

/** true si la novedad es una propuesta de un toque (FIN-046 Fase 4). */
export const isProposal = (i: Insight) => !!i.payload?.action;

/**
 * FIN-046 Fase 4 · "Aprende de ti": Millo propone ("¿Pagas Netflix cada mes?") y la
 * persona decide con un toque. Nada se aplica sin "Sí, hazlo".
 */
export function ProposalCard({ insight, onDone }: { insight: Insight; onDone: () => void }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [err, setErr] = useState<string | null>(null);
  const income = insight.payload?.action !== 'crear_gasto_fijo';

  const accept = async () => {
    setState('busy');
    try {
      await proposalsApi.accept(insight.id);
      setState('done');
      setTimeout(onDone, 1200);
    } catch (e) {
      setErr((e as Error).message);
      setState('error');
    }
  };
  const decline = async () => {
    setState('busy');
    await insightsApi.setStatus(insight.id, 'dismissed').catch(() => undefined);
    onDone();
  };

  return (
    <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ico name={income ? 'cash-outline' : 'repeat-outline'} color={colors.primaryDark} size={16} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '600', ...type.body }}>{insight.title}</Text>
          <Text style={{ color: colors.textMuted, ...type.small, marginTop: 2 }}>{insight.body}</Text>
        </View>
      </View>
      {state === 'done' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, marginLeft: 42 }}>
          <Ico name="checkmark-circle" color={colors.primary} />
          <Text style={{ color: colors.primaryDark, fontWeight: '600', ...type.body }}>Hecho. {income ? 'Ya cuenta en tu mes.' : 'Desde ahora se registra solo.'}</Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, marginLeft: 42, alignItems: 'center' }}>
          <Pressable
            onPress={() => void accept()}
            disabled={state === 'busy'}
            accessibilityRole="button"
            style={{ backgroundColor: colors.primary, borderRadius: radius.md, minHeight: 40, paddingVertical: 9, paddingHorizontal: 16, flexDirection: 'row', gap: 6, alignItems: 'center' }}
          >
            {state === 'busy' ? <ActivityIndicator size="small" color={colors.textInverse} /> : null}
            <Text style={{ color: colors.textInverse, fontWeight: '600', ...type.body }}>Sí, hazlo</Text>
          </Pressable>
          <Pressable onPress={() => void decline()} disabled={state === 'busy'} accessibilityRole="button" style={{ paddingVertical: 9, paddingHorizontal: 8 }}>
            <Text style={{ color: colors.textMuted, fontWeight: '500', ...type.body }}>No, gracias</Text>
          </Pressable>
        </View>
      )}
      {state === 'error' && err ? <Text style={{ color: colors.danger, ...type.small, marginTop: 6 }}>{err}</Text> : null}
    </View>
  );
}
