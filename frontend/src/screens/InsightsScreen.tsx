import React from 'react';
import { RefreshControl, ScrollView, Text } from 'react-native';
import { Card } from '../components/ui';
import { colors, spacing } from '../theme/colors';
import { suggestionsApi } from '../api/endpoints';
import { useApi } from '../utils/useApi';

const ICON: Record<string, string> = {
  priorizar_deuda: '🎯',
  recorte_gasto: '✂️',
  alerta_sobregiro: '⚠️',
  abono_extra: '🚀',
  felicitacion: '🎉',
};

export function InsightsScreen() {
  const { data, loading, error, reload } = useApi(() => suggestionsApi.list(), []);

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.md }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
    >
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.md }}>
        Consejos para ti 💡
      </Text>

      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

      {data?.length ? (
        data.map((s, i) => (
          <Card key={i}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
              {ICON[s.type] ?? '💡'} {s.title}
            </Text>
            <Text style={{ color: colors.textMuted, marginTop: 6, lineHeight: 20 }}>{s.body}</Text>
          </Card>
        ))
      ) : !loading ? (
        <Text style={{ color: colors.textMuted }}>
          Registra tus deudas y movimientos para recibir consejos personalizados.
        </Text>
      ) : null}
    </ScrollView>
  );
}
