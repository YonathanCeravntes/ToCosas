import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Row } from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';
import {
  HealthIndicator,
  HealthScore,
  IndicatorLevel,
  ScoreBand,
  ScoreHistoryPoint,
} from '../api/types';
import { ApiError } from '../api/client';
import { healthApi } from '../api/endpoints';
import { useApi } from '../utils/useApi';

const BAND_META: Record<ScoreBand, { label: string; color: string }> = {
  critico: { label: 'Crítico', color: colors.danger },
  fragil: { label: 'Frágil', color: '#E06A00' },
  estable: { label: 'Estable', color: colors.warning },
  saludable: { label: 'Saludable', color: colors.success },
  elite: { label: 'Élite', color: colors.primaryDark },
};

const LEVEL_COLOR: Record<IndicatorLevel, string> = {
  verde: colors.success,
  amarillo: colors.warning,
  rojo: colors.danger,
  sin_datos: colors.textMuted,
};

export function HealthScreen() {
  const { data, loading, reload } = useApi(() => healthApi.score(), []);

  useFocusEffect(
    React.useCallback(() => {
      void reload();
    }, [reload]),
  );

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      <ScoreCard data={data} loading={loading} />
      {data?.indicators.map((ind) => <IndicatorCard key={ind.key} ind={ind} />)}
      <HistorySection />
      {data ? (
        <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginVertical: spacing.lg, lineHeight: 18 }}>
          {data.disclaimer}
        </Text>
      ) : null}
    </ScrollView>
  );
}

function ScoreCard({ data, loading }: { data: HealthScore | null; loading: boolean }) {
  const band = data?.band ? BAND_META[data.band] : null;
  return (
    <Card style={{ alignItems: 'center', paddingVertical: spacing.lg, backgroundColor: band?.color ?? colors.primary, borderColor: band?.color ?? colors.primary }}>
      <Text style={{ color: colors.textInverse, opacity: 0.85 }}>Score Millo</Text>
      <Text style={{ color: colors.textInverse, fontSize: 56, fontWeight: '800' }}>
        {data?.score ?? (loading ? '…' : '—')}
      </Text>
      {band ? (
        <Text style={{ color: colors.textInverse, fontWeight: '700', fontSize: 16 }}>{band.label}</Text>
      ) : null}
      {data?.delta != null && data.delta !== 0 ? (
        <Text style={{ color: colors.textInverse, opacity: 0.9, marginTop: 4 }}>
          {data.delta > 0 ? '▲ subió' : '▼ bajó'} {Math.abs(data.delta)} puntos este mes
        </Text>
      ) : null}
      {data && data.deltaByPillar.length > 0 ? (
        <Text style={{ color: colors.textInverse, opacity: 0.85, marginTop: 2, fontSize: 12 }}>
          {data.deltaByPillar.map((d) => `${d.delta! > 0 ? '+' : ''}${d.delta} ${d.pillar}`).join(' · ')}
        </Text>
      ) : null}
      <Text style={{ color: colors.textInverse, opacity: 0.7, marginTop: 6, fontSize: 11 }}>
        No es un puntaje crediticio · v{data?.version ?? 1}
      </Text>
    </Card>
  );
}

function IndicatorCard({ ind }: { ind: HealthIndicator }) {
  const [open, setOpen] = useState(false);
  const color = LEVEL_COLOR[ind.level];
  return (
    <Pressable onPress={() => setOpen(!open)}>
      <Card style={{ borderLeftWidth: 4, borderLeftColor: color }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>{ind.title}</Text>
          <Text style={{ fontWeight: '800', color, fontSize: 16 }}>{ind.display}</Text>
        </Row>
        <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13 }}>{ind.meaning}</Text>
        {open ? (
          <View style={{ marginTop: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: 13, marginBottom: 4 }}>📐 {ind.howComputed}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>{ind.ranges}</Text>
            {ind.actions.map((a, i) => (
              <Text key={i} style={{ color: colors.primaryDark, fontSize: 13, marginTop: 2 }}>
                ✅ {a}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 6 }}>Toca para ver detalle</Text>
        )}
      </Card>
    </Pressable>
  );
}

function HistorySection() {
  const [history, setHistory] = useState<ScoreHistoryPoint[] | null>(null);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setHistory(await healthApi.history());
      setLocked(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setLocked(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Text style={{ fontWeight: '700', fontSize: 15, marginBottom: spacing.sm }}>📈 Evolución de tu Score</Text>
      {history && history.length > 0 ? (
        history.map((h) => (
          <Row key={h.period} style={{ justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: colors.textMuted }}>{h.period}</Text>
            <Text style={{ fontWeight: '700', color: colors.text }}>{h.score}</Text>
          </Row>
        ))
      ) : locked ? (
        <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
          <Text style={{ fontSize: 24 }}>🔒</Text>
          <Text style={{ color: colors.text, textAlign: 'center', marginTop: 4 }}>
            El histórico de tu Score es una función de Millo+.
          </Text>
          <View style={{ marginTop: spacing.sm, backgroundColor: colors.accent, borderRadius: radius.full, paddingVertical: 8, paddingHorizontal: 18 }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>Millo+ · próximamente</Text>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => void load()}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>
            {loading ? 'Cargando…' : 'Ver mi evolución'}
          </Text>
        </Pressable>
      )}
    </Card>
  );
}
