import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Card, Row } from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';
import {
  HealthIndicator,
  HealthScore,
  IndicatorLevel,
  Recommendation,
  ScoreBand,
  ScoreHistoryPoint,
} from '../api/types';
import { ApiError } from '../api/client';
import { healthApi, recommendationsApi } from '../api/endpoints';
import { useApi } from '../utils/useApi';

/**
 * FIN-019 · Experiencia de Salud (DEC-019, ARQ-0019 v1.1).
 * Intención §0: comprensión con agencia — nunca calificado, siempre orientado.
 * Cero backend: toda la materia prima viene de FIN-004/005/007.
 */

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

/** Nombres llanos de los pilares (P1, §29.2). */
const PILLAR_LABEL: Record<string, string> = {
  liquidity: 'Tu colchón',
  debt: 'Tus deudas',
  savings: 'Tu ahorro',
  wealth: 'Lo que tienes',
};

/** El peor indicador con nivel auditado (rojo primero, luego amarillo). */
function worstIndicator(indicators: HealthIndicator[]): HealthIndicator | null {
  return (
    indicators.find((i) => i.level === 'rojo') ??
    indicators.find((i) => i.level === 'amarillo') ??
    null
  );
}

/** "$N de cada $100" para valores porcentuales (consistencia con Inicio, S2). */
function humanValue(display: string): string {
  const m = /^([\d.,]+)\s*%$/.exec(display.trim());
  if (!m) return display;
  const n = Math.round(parseFloat(m[1].replace(',', '.')));
  return `$${n} de cada $100`;
}

export function HealthScreen() {
  const { data, loading, reload } = useApi(() => healthApi.score(), []);
  const recs = useApi(() => recommendationsApi.list(), []);
  const reloadRecs = recs.reload;

  useFocusEffect(
    React.useCallback(() => {
      void reload();
      void reloadRecs();
    }, [reload, reloadRecs]),
  );

  const worst = data ? worstIndicator(data.indicators) : null;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      <ScoreCard data={data} loading={loading} worst={worst} />
      <JugadaCard recs={recs.data ?? []} worst={worst} hasScore={!!data?.score} />
      {data?.indicators.map((ind) => <IndicatorCard key={ind.key} ind={ind} />)}
      <HistorySection />
      <CopilotBridge />
      {data ? (
        <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginVertical: spacing.lg, lineHeight: 18 }}>
          {data.disclaimer}
        </Text>
      ) : null}
    </ScrollView>
  );
}

/** P1 (ruta b) + P4 + P5: Score con causas, tono neutro, cold-start con emoción. */
function ScoreCard({
  data,
  loading,
  worst,
}: {
  data: HealthScore | null;
  loading: boolean;
  worst: HealthIndicator | null;
}) {
  // P5 — cold-start: estado de construcción, nunca un "—" mudo.
  if (data && data.score === null) {
    const days = Math.max(1, data.coldStart?.remainingDays ?? 0);
    return (
      <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
        <Text style={{ color: colors.textInverse, fontWeight: '700', fontSize: 18 }}>
          🌱 Tu Score se está construyendo
        </Text>
        <Text style={{ color: colors.textInverse, opacity: 0.9, marginTop: 6, lineHeight: 20 }}>
          Te faltan ~{days} días de historia. Cuando esté listo verás un número de 0 a
          1.000 que resume tu salud financiera — y qué lo mueve.
        </Text>
        <Text style={{ color: colors.textInverse, opacity: 0.9, marginTop: 8 }}>
          Mientras tanto, ya puedes:
        </Text>
        <Text style={{ color: colors.textInverse, opacity: 0.9, marginTop: 2 }}>
          ✅ Registrar tus movimientos de cada día
        </Text>
        <Text style={{ color: colors.textInverse, opacity: 0.9 }}>
          ✅ Marcar tu fondo de emergencia en Cuentas
        </Text>
      </Card>
    );
  }

  const band = data?.band ? BAND_META[data.band] : null;
  return (
    // P4: SIEMPRE el verde institucional — el color no califica a la persona.
    <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ color: colors.textInverse, opacity: 0.85 }}>Score Millo</Text>
        {data?.delta != null && data.delta !== 0 ? (
          <Text style={{ color: colors.textInverse, opacity: 0.9 }}>
            {data.delta > 0 ? '▲ +' : '▼ '}
            {Math.abs(data.delta)} este mes
          </Text>
        ) : null}
      </Row>
      <Row style={{ alignItems: 'flex-end', gap: 8 }}>
        <Text style={{ color: colors.textInverse, fontSize: 52, fontWeight: '800' }}>
          {data?.score ?? (loading ? '…' : '—')}
        </Text>
        <Text style={{ color: colors.textInverse, opacity: 0.8, marginBottom: 10 }}>de 1.000</Text>
        {band ? (
          // La banda vive en un chip pequeño: informa sin teñir la experiencia.
          <View style={{ backgroundColor: band.color, borderRadius: radius.full, paddingVertical: 3, paddingHorizontal: 10, marginBottom: 10 }}>
            <Text style={{ color: colors.textInverse, fontWeight: '700', fontSize: 12 }}>{band.label}</Text>
          </View>
        ) : null}
      </Row>

      {/* P1 ruta (b): pilares como barras NEUTRAS 0–100 — mismo tratamiento los 4;
          el semáforo vive en los indicadores, que sí tienen niveles auditados. */}
      {data?.pillars?.length ? (
        <View style={{ marginTop: spacing.sm, gap: 6 }}>
          {data.pillars.map((p) => (
            <Row key={p.key} style={{ gap: 8 }}>
              <Text style={{ color: colors.textInverse, opacity: 0.9, fontSize: 12, width: 92 }}>
                {PILLAR_LABEL[p.key] ?? p.label}
              </Text>
              <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: '#ffffff33', overflow: 'hidden' }}>
                <View
                  style={{
                    width: `${Math.max(0, Math.min(100, p.value ?? 0))}%`,
                    height: 6,
                    backgroundColor: colors.textInverse,
                  }}
                />
              </View>
              <Text style={{ color: colors.textInverse, opacity: 0.75, fontSize: 11, width: 30, textAlign: 'right' }}>
                {p.value != null ? Math.round(p.value) : '—'}
              </Text>
            </Row>
          ))}
        </View>
      ) : null}

      {/* Derivada del peor INDICADOR (niveles auditados); se omite si todo va bien. */}
      {worst ? (
        <Text style={{ color: colors.textInverse, marginTop: spacing.sm, fontWeight: '600', fontSize: 13 }}>
          Lo que más te frena: {worst.title.toLowerCase()}
        </Text>
      ) : null}

      <Text style={{ color: colors.textInverse, opacity: 0.65, marginTop: 8, fontSize: 11 }}>
        No es un puntaje crediticio
      </Text>
    </Card>
  );
}

/** P2: LA acción de mayor impacto — recomendación top del motor (FIN-007),
 *  con el peor indicador como respaldo si el motor no tiene nada activo. */
function JugadaCard({
  recs,
  worst,
  hasScore,
}: {
  recs: Recommendation[];
  worst: HealthIndicator | null;
  hasScore: boolean;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  if (!hasScore) return null;

  const top = recs.find((r) => r.status === 'new' || r.status === 'seen') ?? recs[0] ?? null;
  const SIM_BY_KIND: Record<string, string> = {
    estrategia: 'estrategia_deudas',
    recorte_categoria: 'reducir_gastos',
    fondo_emergencia: 'proyeccion_ahorro',
  };
  const goSimulator = (scenario?: string) =>
    navigation.navigate('Simulator', scenario ? { scenario } : undefined);

  if (!top && !worst) return null;

  return (
    <Card style={{ borderColor: colors.primary, borderWidth: 2 }}>
      <Text style={{ fontWeight: '700', fontSize: 15, color: colors.text }}>
        ⭐ Tu jugada de mayor impacto
      </Text>
      {top ? (
        <>
          <Text style={{ color: colors.text, marginTop: 6, fontWeight: '600' }}>{top.title}</Text>
          <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13, lineHeight: 19 }}>
            {top.body}
          </Text>
          <Pressable onPress={() => goSimulator(SIM_BY_KIND[top.kind])} style={{ marginTop: spacing.sm }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>🧪 Simularlo →</Text>
          </Pressable>
        </>
      ) : worst ? (
        <>
          <Text style={{ color: colors.text, marginTop: 6, fontWeight: '600' }}>
            Mejora tu {worst.title.toLowerCase()}
          </Text>
          {worst.actions[0] ? (
            <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13, lineHeight: 19 }}>
              {worst.actions[0]}
            </Text>
          ) : null}
          <Pressable onPress={() => goSimulator()} style={{ marginTop: spacing.sm }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>🧪 Simularlo →</Text>
          </Pressable>
        </>
      ) : null}
    </Card>
  );
}

/** P3: interpretación siempre visible; palanca donde duele; tap honesto. */
function IndicatorCard({ ind }: { ind: HealthIndicator }) {
  const [open, setOpen] = useState(false);
  const color = LEVEL_COLOR[ind.level];
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const needsAction = ind.level === 'rojo' || ind.level === 'amarillo';

  return (
    <Card style={{ borderLeftWidth: 4, borderLeftColor: color }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>{ind.title}</Text>
        <Text style={{ fontWeight: '800', color, fontSize: 15 }}>{humanValue(ind.display)}</Text>
      </Row>
      <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13 }}>{ind.meaning}</Text>

      {/* La palanca visible exactamente donde hay dolor (P3 / intención). */}
      {needsAction && ind.actions[0] ? (
        <View style={{ marginTop: spacing.sm }}>
          <Text style={{ color: colors.text, fontSize: 13 }}>✅ {ind.actions[0]}</Text>
          <Pressable onPress={() => navigation.navigate('Simulator')} style={{ marginTop: 4 }}>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
              🧪 Simularlo →
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* El tap ahora anuncia su contenido: profundización, no acciones. */}
      <Pressable onPress={() => setOpen(!open)} style={{ marginTop: 6 }}>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {open ? '▾ Cómo se calcula' : '¿Cómo se calcula? →'}
        </Text>
      </Pressable>
      {open ? (
        <View style={{ marginTop: 4 }}>
          <Text style={{ color: colors.text, fontSize: 13, marginBottom: 4 }}>📐 {ind.howComputed}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{ind.ranges}</Text>
          {ind.actions.slice(needsAction ? 1 : 0).map((a, i) => (
            <Text key={i} style={{ color: colors.primaryDark, fontSize: 13, marginTop: 2 }}>
              ✅ {a}
            </Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

/** P6: evolución con lectura narrativa (la lista es el detalle, no el mensaje). */
function HistorySection() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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

  const narrative = () => {
    if (!history || history.length === 0) return null;
    if (history.length === 1) {
      return `Tu primera medición: ${history[0].score} — desde aquí construyes.`;
    }
    const last = history[history.length - 1];
    const prev = history[history.length - 2];
    const d = last.score - prev.score;
    if (d === 0) return `Te mantienes en ${last.score} — la constancia también cuenta.`;
    return `${d > 0 ? '▲ Subiste' : '▼ Bajaste'} ${Math.abs(d)} puntos desde ${prev.period}.`;
  };

  return (
    <Card>
      <Text style={{ fontWeight: '700', fontSize: 15, marginBottom: spacing.sm }}>📈 Evolución de tu Score</Text>
      {history && history.length > 0 ? (
        <>
          <Text style={{ color: colors.text, fontWeight: '600', marginBottom: spacing.sm }}>
            {narrative()}
          </Text>
          {history.map((h) => (
            <Row key={h.period} style={{ justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: colors.textMuted }}>{h.period}</Text>
              <Text style={{ fontWeight: '700', color: colors.text }}>{h.score}</Text>
            </Row>
          ))}
        </>
      ) : locked ? (
        <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
          <Text style={{ fontSize: 24 }}>🔒</Text>
          <Text style={{ color: colors.text, textAlign: 'center', marginTop: 4 }}>
            El histórico de tu Score es una función de Millo+.
          </Text>
          <Pressable
            onPress={() => navigation.navigate('MilloPlus', { source: 'score_history' })}
            style={{ marginTop: spacing.sm, backgroundColor: colors.accent, borderRadius: radius.full, paddingVertical: 8, paddingHorizontal: 18 }}
          >
            <Text style={{ fontWeight: '700', color: colors.text }}>Conocer Millo+ →</Text>
          </Pressable>
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

/** P7: cierre con salida — continuidad hacia el Copiloto. */
function CopilotBridge() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <Pressable
      onPress={() =>
        (navigation as unknown as { navigate: (name: string) => void }).navigate('Insights')
      }
    >
      <Card style={{ paddingVertical: spacing.sm }}>
        <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
          🤖 ¿Preguntas sobre tu Score? El copiloto te lo explica →
        </Text>
      </Card>
    </Pressable>
  );
}
