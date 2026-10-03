import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Card, ErrorState, FormScroll, GroupLabel, Ico, Money, Pill, ProgressBar, Row, Sparkline } from '../components/ui';
import { colors, radius, spacing, type } from '../theme/colors';
import { formatMoney } from '../utils/format';
import { CashflowPlan, HomeDashboard } from '../api/types';
import {
  HealthIndicator,
  HealthScore,
  IndicatorLevel,
  Recommendation,
  ScoreBand,
  ScoreHistoryPoint,
} from '../api/types';
import { ApiError } from '../api/client';
import { dashboardApi, debtsApi, healthApi, recommendationsApi } from '../api/endpoints';
import { monthsText } from './CashflowPlanScreen';
import { useApi } from '../utils/useApi';

/**
 * FIN-019 · Experiencia de Salud (DEC-019, ARQ-0019 v1.1).
 * Intención §0: comprensión con agencia — nunca calificado, siempre orientado.
 * Cero backend: toda la materia prima viene de FIN-004/005/007.
 */

const BAND_META: Record<ScoreBand, { label: string; tone: 'ok' | 'warn' | 'neg' }> = {
  critico: { label: 'Crítico', tone: 'neg' },
  fragil: { label: 'Frágil', tone: 'warn' },
  estable: { label: 'Estable', tone: 'ok' },
  saludable: { label: 'Saludable', tone: 'ok' },
  elite: { label: 'Élite', tone: 'ok' },
};

/**
 * FIN-060 · Pisos de cada banda del Score. Espejo EXACTO de `scoreBand()` en
 * backend/src/modules/health/score.util.ts (<400 crítico, <600 frágil, <750
 * estable, <900 saludable, resto élite). Solo se usa para dibujar la escala y
 * el "te faltan X puntos"; la banda real sigue viniendo de la API.
 */
const BAND_FLOORS: Array<{ band: ScoreBand; from: number }> = [
  { band: 'critico', from: 0 },
  { band: 'fragil', from: 400 },
  { band: 'estable', from: 600 },
  { band: 'saludable', from: 750 },
  { band: 'elite', from: 900 },
];
const SCORE_MAX = 1000;
/** Tonos de un solo verde (de claro a pleno) para los tramos de la escala. */
const SEGMENT_OPACITY = [0.14, 0.3, 0.5, 0.75, 1];

function formatPoints(n: number): string {
  return Math.round(n).toLocaleString('es-CO');
}

/** Texto (legible sobre blanco) y barra por nivel del indicador. */
const LEVEL_COLOR: Record<IndicatorLevel, string> = {
  verde: colors.primaryDark,
  amarillo: colors.warningDeep,
  rojo: colors.dangerDeep,
  sin_datos: colors.textMuted,
};
const LEVEL_BAR: Record<IndicatorLevel, string> = {
  verde: colors.primary,
  amarillo: colors.warning,
  rojo: colors.danger,
  sin_datos: colors.textFaint,
};

/** Nombres llanos de los pilares (P1, §29.2). */
const PILLAR_LABEL: Record<string, string> = {
  liquidity: 'Tu colchón',
  debt: 'Tus deudas',
  savings: 'Tu ahorro',
  wealth: 'Lo que tienes',
};

/** FIN-056 (BT-033): cada indicador abre el escenario del simulador que lo mueve. */
const SCENARIO_BY_INDICATOR: Record<string, string> = {
  debt: 'estrategia_deudas',
  dti: 'abono_extra',
  emergency_fund: 'proyeccion_ahorro',
  liquidity: 'reducir_gastos',
  savings: 'proyeccion_ahorro',
  savings_rate: 'reducir_gastos',
  wealth: 'abono_extra',
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
  const { data, loading, error, reload } = useApi(() => healthApi.score(), [], { cacheKey: 'health-score' });
  const recs = useApi(() => recommendationsApi.list(), []);
  const home = useApi(() => dashboardApi.home(), [], { cacheKey: 'home' }); // DEC-0040 §7: patrimonio y ahorro viven aquí
  const plan = useApi(() => debtsApi.cashflowPlan(), [], { cacheKey: 'cashflow-plan' }); // FIN-045: la jugada con deudas es el plan de flujo
  const reloadRecs = recs.reload;
  const reloadHome = home.reload;
  const reloadPlan = plan.reload;

  useFocusEffect(
    React.useCallback(() => {
      void reload();
      void reloadRecs();
      void reloadHome();
      void reloadPlan();
    }, [reload, reloadRecs, reloadHome, reloadPlan]),
  );

  const worst = data ? worstIndicator(data.indicators) : null;
  const refresh = React.useCallback(
    () => Promise.all([reload(), reloadRecs(), reloadHome(), reloadPlan()]),
    [reload, reloadRecs, reloadHome, reloadPlan],
  );

  return (
    <FormScroll onRefresh={refresh}>
      {error && !data ? <ErrorState message={error} onRetry={() => void refresh()} /> : null}
      <ScoreCard data={data} loading={loading} worst={worst} />
      {/* FIN-027 (DEC-0027 §5.1): costo de honestidad, requisito del DEC — el
          Score usa ingreso neto; esto explica por qué, sin sonar a regaño. */}
      {data?.netIncomeNotice ? (
        <Card style={{ borderColor: colors.primary, borderWidth: 1, paddingVertical: 12 }}>
          <Row style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
            <View style={{ marginTop: 2 }}>
              <Ico name="bulb-outline" size={15} color={colors.primary} />
            </View>
            <Text style={{ color: colors.textMuted, ...type.small, flex: 1 }}>{data.netIncomeNotice}</Text>
          </Row>
        </Card>
      ) : null}
      <JugadaCard recs={recs.data ?? []} worst={worst} hasScore={!!data?.score} plan={plan.data} />
      {/* Salud · opción J (Fundador, 2026-09-29): indicadores en una lista; el
          detalle (acción, simulador, cálculo) se abre al tocar cada uno. */}
      {data?.indicators.length ? (
        <>
          <GroupLabel title="Tus indicadores" />
          <Card style={{ paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' }}>
            {data.indicators.map((ind, i) => (
              <IndicatorRow key={ind.key} ind={ind} first={i === 0} />
            ))}
          </Card>
          <Text style={{ color: colors.textFaint, ...type.caption, marginTop: -spacing.xs, marginBottom: spacing.sm }}>
            Toca un indicador para ver cómo se calcula y cómo mejorarlo.
          </Text>
        </>
      ) : null}
      <WealthSection d={home.data} />
      <HistorySection />
      <CopilotBridge />
      {data ? (
        <Text style={{ color: colors.textMuted, ...type.caption, textAlign: 'center', marginVertical: spacing.lg, marginHorizontal: spacing.sm }}>
          {data.disclaimer}
        </Text>
      ) : null}
    </FormScroll>
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
  // BT-006: si el Score no está disponible (p. ej. gate legal en producción → 503,
  // o un error transitorio), NUNCA un "—" mudo. Se explica con contexto.
  if (!data && !loading) {
    return (
      <Card>
        <ScoreCardTitle title="Tu Score financiero está en preparación" />
        <Text style={{ color: colors.textMuted, ...type.body, marginTop: spacing.sm }}>
          Muy pronto verás aquí un número de 0 a 1.000 que resume tu salud financiera — y qué
          lo mueve. Estamos afinando los últimos detalles antes de mostrártelo.
        </Text>
        <View style={{ marginTop: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 12 }}>
          <Text style={{ color: colors.text, ...type.small }}>
            Mientras tanto, sigue registrando tus movimientos: son la base con la que se calcula.
          </Text>
        </View>
      </Card>
    );
  }

  // P5 — cold-start: estado de construcción, nunca un "—" mudo.
  if (data && data.score === null) {
    const days = Math.max(1, data.coldStart?.remainingDays ?? 0);
    return (
      <Card>
        <ScoreCardTitle title="Tu Score se está construyendo" />
        <Text style={{ color: colors.textMuted, ...type.body, marginTop: spacing.sm }}>
          Te faltan ~{days} días de historia. Cuando esté listo verás un número de 0 a
          1.000 que resume tu salud financiera — y qué lo mueve.
        </Text>
        {/* La escala vacía anticipa dónde aparecerá el número. */}
        <View style={{ marginTop: spacing.md }}>
          <ScoreScale score={null} />
        </View>
        <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.md }}>
          Mientras tanto, ya puedes:
        </Text>
        <View style={{ gap: 6, marginTop: 6 }}>
          <Row style={{ gap: 6 }}>
            <Ico name="checkmark-circle-outline" size={15} color={colors.primary} />
            <Text style={{ color: colors.text, ...type.small, flex: 1 }}>Registrar tus movimientos de cada día</Text>
          </Row>
          <Row style={{ gap: 6 }}>
            <Ico name="checkmark-circle-outline" size={15} color={colors.primary} />
            <Text style={{ color: colors.text, ...type.small, flex: 1 }}>Marcar tu fondo de emergencia en Cuentas</Text>
          </Row>
        </View>
      </Card>
    );
  }

  const band = data?.band ? BAND_META[data.band] : null;
  const score = data?.score ?? null;
  const next = score != null ? BAND_FLOORS.find((b) => b.from > score) ?? null : null;
  return (
    // FIN-060: el aro de color se vuelve una cifra protagonista sobre una escala
    // segmentada de un solo verde con marcador dorado. Los pilares siguen NEUTROS
    // (P1 ruta b: el semáforo vive solo en los indicadores).
    <Card>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ flexShrink: 1 }}>
          <Text style={{ color: colors.textFaint, ...type.label }}>Score Millo</Text>
          <Row style={{ alignItems: 'baseline', gap: 4, marginTop: 2 }}>
            <Text style={{ color: colors.text, ...type.hero }}>
              {score != null ? formatPoints(score) : loading ? '…' : '—'}
            </Text>
            <Text style={{ color: colors.textFaint, ...type.body, fontWeight: '500' }}>/ 1.000</Text>
          </Row>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6, paddingTop: 2 }}>
          {band ? <Pill label={band.label} tone={band.tone} /> : null}
          {data?.delta != null && data.delta !== 0 ? (
            <Text style={{ color: colors.textMuted, ...type.small }}>
              {data.delta > 0 ? '+' : '−'}
              {Math.abs(data.delta)} este mes
            </Text>
          ) : null}
        </View>
      </Row>

      {score != null ? (
        <View style={{ marginTop: spacing.md }}>
          <ScoreScale score={score} />
        </View>
      ) : null}
      {score != null && next ? (
        <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.sm }}>
          Te faltan <Text style={{ color: colors.text, fontWeight: '600' }}>{formatPoints(next.from - score)} puntos</Text> para{' '}
          {BAND_META[next.band].label}
        </Text>
      ) : null}
      <Text style={{ color: colors.textFaint, ...type.caption, marginTop: spacing.xs }}>No es un puntaje crediticio</Text>

      {data?.pillars?.length ? (
        <View style={{ marginTop: spacing.md, gap: 8 }}>
          {data.pillars.map((p) => (
            <Row key={p.key} style={{ gap: 8 }}>
              <Text style={{ color: colors.textMuted, ...type.small, width: 92 }}>{PILLAR_LABEL[p.key] ?? p.label}</Text>
              <View style={{ flex: 1 }}>
                <ProgressBar value={Math.max(0, Math.min(100, p.value ?? 0)) / 100} color={colors.primary} track={colors.surfaceAlt} height={6} label={PILLAR_LABEL[p.key] ?? p.label} />
              </View>
              <Text style={{ color: colors.text, ...type.small, fontWeight: '600', width: 28, textAlign: 'right' }}>
                {p.value != null ? Math.round(p.value) : '—'}
              </Text>
            </Row>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

/** Encabezado de los estados sin Score: hoja de marca en círculo suave + título. */
function ScoreCardTitle({ title }: { title: string }) {
  return (
    <Row style={{ gap: 10 }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ico name="leaf-outline" size={17} color={colors.primary} />
      </View>
      <Text style={{ color: colors.text, ...type.title, flex: 1 }}>{title}</Text>
    </Row>
  );
}

/**
 * FIN-060 · Escala 0–1.000 en tramos proporcionales a cada banda, en tonos de un
 * solo verde, con un marcador dorado en el puntaje. Solo Views (sin SVG).
 * `score = null` dibuja la escala vacía (cold-start) con solo los extremos.
 */
function ScoreScale({ score }: { score: number | null }) {
  const pct = score != null ? Math.max(0, Math.min(1, score / SCORE_MAX)) * 100 : null;
  const LABEL_W = 36;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Escala del Score Millo"
      accessibilityValue={score != null ? { min: 0, max: SCORE_MAX, now: score } : undefined}
    >
      <View style={{ height: 16, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 2, height: 8, borderRadius: 4, overflow: 'hidden' }}>
          {BAND_FLOORS.map((b, i) => {
            const to = BAND_FLOORS[i + 1]?.from ?? SCORE_MAX;
            return (
              <View
                key={b.band}
                style={{
                  flex: to - b.from,
                  backgroundColor: score != null ? colors.primary : colors.surfaceAlt,
                  opacity: score != null ? SEGMENT_OPACITY[i] : 1,
                }}
              />
            );
          })}
        </View>
        {pct != null ? (
          <View
            style={{
              position: 'absolute',
              left: `${pct}%`,
              marginLeft: -4,
              top: 0,
              width: 8,
              height: 16,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: colors.surface,
              backgroundColor: colors.gold,
            }}
          />
        ) : null}
      </View>
      <View style={{ height: 14, marginTop: 2 }}>
        <Text style={{ position: 'absolute', left: 0, color: colors.textFaint, fontSize: 10 }}>0</Text>
        {score != null
          ? BAND_FLOORS.slice(1).map((b) => (
              <Text
                key={b.band}
                style={{
                  position: 'absolute',
                  left: `${(b.from / SCORE_MAX) * 100}%`,
                  marginLeft: -LABEL_W / 2,
                  width: LABEL_W,
                  textAlign: 'center',
                  color: colors.textFaint,
                  fontSize: 10,
                }}
              >
                {formatPoints(b.from)}
              </Text>
            ))
          : null}
        {/* Con puntaje, el "1.000" ya está en la cifra ("/ 1.000") y chocaría con "900". */}
        {score == null ? (
          <Text style={{ position: 'absolute', right: 0, color: colors.textFaint, fontSize: 10 }}>1.000</Text>
        ) : null}
      </View>
    </View>
  );
}

/** P2: LA acción de mayor impacto — recomendación top del motor (FIN-007),
 *  con el peor indicador como respaldo si el motor no tiene nada activo. */
function JugadaCard({
  recs,
  worst,
  hasScore,
  plan,
}: {
  recs: Recommendation[];
  worst: HealthIndicator | null;
  hasScore: boolean;
  plan: CashflowPlan | null;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  if (!hasScore) return null;

  // FIN-045 (Fundador, 2026-09-29): con deudas activas, la jugada NO es "simularlo"
  // sino el consejo concreto: a cuál abonar primero, con cuánto y qué libera.
  const step = plan?.steps[0];
  if (plan && step) {
    const worstLine = worst ? `${worst.title}: ${humanValue(worst.display)}.` : null;
    return (
      <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
        <Text style={{ color: colors.onPrimaryMuted, ...type.label }}>
          TU JUGADA DE MAYOR IMPACTO
        </Text>
        <Text style={{ color: colors.textInverse, fontSize: 18, fontWeight: '600', marginTop: 6 }}>
          {plan.toDebt > 0 ? `Termina primero ${step.name}` : `Cuando te sobre, empieza por ${step.name}`}
        </Text>
        {worstLine ? (
          <Text style={{ color: colors.onPrimaryMuted, ...type.small, marginTop: 4 }}>Lo que más te frena · {worstLine}</Text>
        ) : null}
        <Text style={{ color: colors.textInverse, fontSize: 14, lineHeight: 20, marginTop: 6 }}>
          {plan.toDebt > 0
            ? `Abónale ${formatMoney(plan.toDebt)} al mes y la terminas en ${monthsText(step.monthWithPlan)}: te libera ${formatMoney(step.payment)} cada mes.`
            : `Es la que más plata te libera: ${formatMoney(step.payment)} al mes.`}
          {plan.toColchon > 0 ? ` Y guarda ${formatMoney(plan.toColchon)} para tu colchón.` : ''}
        </Text>
        <Pressable
          onPress={() => navigation.navigate('CashflowPlan')}
          accessibilityRole="button"
          style={{ alignSelf: 'flex-start', marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: radius.full, paddingVertical: 10, paddingHorizontal: 18 }}
        >
          <Text style={{ color: colors.primaryDark, fontWeight: '600' }}>Ver mi plan</Text>
        </Pressable>
      </Card>
    );
  }

  const top = recs.find((r) => r.status === 'new' || r.status === 'seen') ?? recs[0] ?? null;
  // FIN-026 (DEC-0026 §5.1): mapa COMPLETO de kinds del motor — el abono ya no
  // cae al escenario equivocado.
  const SIM_BY_KIND: Record<string, string> = {
    estrategia: 'estrategia_deudas',
    recorte_categoria: 'reducir_gastos',
    fondo_emergencia: 'proyeccion_ahorro',
    abono_extra: 'abono_extra',
  };
  const goSimulator = (scenario?: string) =>
    navigation.navigate('Simulator', scenario ? { scenario } : undefined);

  if (!top && !worst) return null;

  const title = top ? top.title : `Mejora tu ${worst!.title.toLowerCase()}`;
  const body = top ? top.body : worst!.actions[0] ?? null;
  const worstLine = worst ? `${worst.title}: ${humanValue(worst.display)}.` : null;
  return (
    // Salud J: la jugada es el protagonista (verde institucional, como el hero de Mis deudas).
    <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
      <Text style={{ color: colors.onPrimaryMuted, ...type.label }}>
        TU JUGADA DE MAYOR IMPACTO
      </Text>
      <Text style={{ color: colors.textInverse, fontSize: 18, fontWeight: '600', marginTop: 6 }}>{title}</Text>
      {worstLine ? (
        <Text style={{ color: colors.onPrimaryMuted, ...type.small, marginTop: 4 }}>Lo que más te frena · {worstLine}</Text>
      ) : null}
      {body ? <Text style={{ color: colors.textInverse, fontSize: 14, lineHeight: 20, marginTop: 6 }}>{body}</Text> : null}
      <Pressable
        onPress={() => goSimulator(top ? SIM_BY_KIND[top.kind] : undefined)}
        accessibilityRole="button"
        style={{ alignSelf: 'flex-start', marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: radius.full, paddingVertical: 10, paddingHorizontal: 18 }}
      >
        <Text style={{ color: colors.primaryDark, fontWeight: '600' }}>Simularlo</Text>
      </Pressable>
    </Card>
  );
}

/** P3 (Salud J): fila con valor y barra; al tocar se abre qué significa, la
 *  palanca, el simulador y el cálculo — la acción ya no se repite en cada tarjeta. */
function IndicatorRow({ ind, first }: { ind: HealthIndicator; first: boolean }) {
  const [open, setOpen] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const needsAction = ind.level === 'rojo' || ind.level === 'amarillo';
  // Solo los valores en % tienen una barra honesta (0–100); meses, veces… no.
  const pct = /%\s*$/.test(ind.display) ? parseFloat(ind.display.replace(',', '.')) : NaN;

  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: colors.surfaceAlt, backgroundColor: open ? colors.bg : undefined }}>
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${ind.title}: ${humanValue(ind.display)}`}
        style={{ paddingVertical: 12, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
      >
        <View style={{ flex: 1, gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '600', color: colors.text, fontSize: 14 }}>{ind.title}</Text>
            <Text style={{ fontWeight: '600', color: LEVEL_COLOR[ind.level], fontSize: 14 }}>{humanValue(ind.display)}</Text>
          </Row>
          {Number.isFinite(pct) ? <ProgressBar value={pct / 100} color={LEVEL_BAR[ind.level]} height={6} label={ind.title} /> : null}
        </View>
        <Ico name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textFaint} />
      </Pressable>
      {open ? (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: 6 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>{ind.meaning}</Text>
          {ind.actions.map((a, i) => (
            <Row key={i} style={{ gap: 6, alignItems: 'flex-start' }}>
              <View style={{ marginTop: 2 }}>
                <Ico name="checkmark-circle-outline" color={colors.primary} />
              </View>
              <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>{a}</Text>
            </Row>
          ))}
          {needsAction ? (
            <Pressable onPress={() => navigation.navigate('Simulator', SCENARIO_BY_INDICATOR[ind.key] ? { scenario: SCENARIO_BY_INDICATOR[ind.key] } : undefined)} accessibilityRole="link">
              <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>Simularlo →</Text>
            </Pressable>
          ) : null}
          <Row style={{ gap: 6, alignItems: 'flex-start', marginTop: 4 }}>
            <View style={{ marginTop: 1 }}>
              <Ico name="calculator-outline" color={colors.textFaint} />
            </View>
            <Text style={{ color: colors.textMuted, ...type.small, flex: 1 }}>{ind.howComputed}</Text>
          </Row>
          <Text style={{ color: colors.textFaint, ...type.caption }}>{ind.ranges}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** P6: evolución con lectura narrativa (la lista es el detalle, no el mensaje). */
/**
 * DEC-0040 §7 · "Lo que tienes": patrimonio y ahorro salen de Inicio (que ahora solo
 * responde "¿cómo voy este ciclo?") y viven junto al Score, que ya los interpreta en
 * sus pilares "Lo que tienes" y "Tu ahorro".
 */
function WealthSection({ d }: { d: HomeDashboard | null }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  if (!d) return null;
  return (
    <>
      <GroupLabel title="Lo que tienes" />
      <Row style={{ gap: spacing.md, alignItems: 'stretch' }}>
        <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('Accounts')} accessibilityRole="button" accessibilityLabel="Cuentas y patrimonio">
          <Card style={{ flex: 1 }}>
            <Text style={{ color: colors.textMuted, ...type.small }}>Patrimonio</Text>
            <Money value={d.netWorth.netWorth} size={20} style={{ marginTop: spacing.xxs }} />
            <Text style={{ color: colors.textFaint, ...type.caption }}>lo tuyo, menos deudas</Text>
          </Card>
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('Simulator', { scenario: 'proyeccion_ahorro' })} accessibilityRole="button" accessibilityLabel="Proyectar mi ahorro">
          <Card style={{ flex: 1 }}>
            <Text style={{ color: colors.textMuted, ...type.small }}>Ahorro total</Text>
            <Money value={d.savings.total} size={20} style={{ marginTop: spacing.xxs }} />
            {d.interpretation.savings ? <Text style={{ color: colors.textFaint, ...type.caption }}>{d.interpretation.savings.text}</Text> : null}
            <Text style={{ color: colors.primary, ...type.caption, fontWeight: '600', marginTop: spacing.xxs }}>¿Cuánto tendrías en unos años? →</Text>
          </Card>
        </Pressable>
      </Row>
    </>
  );
}

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
      <Row style={{ gap: 6, marginBottom: spacing.sm }}>
        <Ico name="trending-up-outline" size={15} color={colors.textFaint} />
        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>Evolución de tu Score</Text>
      </Row>
      {history && history.length > 0 ? (
        <>
          <Text style={{ color: colors.text, fontWeight: '600', marginBottom: spacing.sm }}>
            {narrative()}
          </Text>
          {/* FIN-038 (BP-15): la evolución también se VE, no solo se lee. */}
          {history.length > 1 ? (
            <View style={{ marginBottom: spacing.sm }}>
              <Sparkline values={history.map((h) => h.score)} height={48} color={colors.gold} faded={colors.primary} label="Evolución del Score" />
            </View>
          ) : null}
          {history.map((h) => (
            <Row key={h.period} style={{ justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: colors.textMuted }}>{h.period}</Text>
              <Text style={{ fontWeight: '600', color: colors.text }}>{h.score}</Text>
            </Row>
          ))}
        </>
      ) : locked ? (
        <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ico name="lock-closed-outline" size={16} color={colors.goldText} />
          </View>
          <Text style={{ color: colors.text, textAlign: 'center', marginTop: spacing.sm }}>
            El histórico de tu Score es una función de Millo+.
          </Text>
          <Pressable
            onPress={() => navigation.navigate('MilloPlus', { source: 'score_history' })}
            accessibilityRole="button"
            style={{ marginTop: spacing.md, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.full, paddingVertical: 8, paddingHorizontal: 18 }}
          >
            <Text style={{ fontWeight: '600', color: colors.goldText }}>Conocer Millo+ →</Text>
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
      onPress={() => navigation.navigate('Copilot')}
    >
      <Card style={{ paddingVertical: spacing.sm }}>
        <Row style={{ gap: 6 }}>
          <Ico name="chatbubble-ellipses-outline" size={15} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13, flex: 1 }}>
            ¿Preguntas sobre tu Score? El copiloto te lo explica →
          </Text>
        </Row>
      </Card>
    </Pressable>
  );
}
