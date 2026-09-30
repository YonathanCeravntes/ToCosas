import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Card, ErrorState, FormScroll, GroupLabel, Ico, ProgressBar, Row, Sparkline } from '../components/ui';
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

const BAND_META: Record<ScoreBand, { label: string; text: string; soft: string }> = {
  critico: { label: 'Crítico', text: colors.dangerDeep, soft: colors.dangerSoft },
  fragil: { label: 'Frágil', text: colors.warningDeep, soft: colors.warningSoft },
  estable: { label: 'Estable', text: colors.primaryDark, soft: colors.primarySoft },
  saludable: { label: 'Saludable', text: colors.primaryDark, soft: colors.primarySoft },
  elite: { label: 'Élite', text: colors.primaryDark, soft: colors.primarySoft },
};

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
        <Card style={{ borderColor: colors.primary, borderWidth: 1 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>
            <Ico name="bulb-outline" color={colors.primary} /> {data.netIncomeNotice}
          </Text>
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
        <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginVertical: spacing.lg, lineHeight: 18 }}>
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
      <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
        <Text style={{ color: colors.textInverse, fontWeight: '700', fontSize: 18 }}>
          <Ico name="leaf-outline" size={18} color={colors.textInverse} /> Tu Score financiero está en preparación
        </Text>
        <Text style={{ color: colors.textInverse, opacity: 0.9, marginTop: 6, lineHeight: 20 }}>
          Muy pronto verás aquí un número de 0 a 1.000 que resume tu salud financiera — y qué
          lo mueve. Estamos afinando los últimos detalles antes de mostrártelo.
        </Text>
        <Text style={{ color: colors.textInverse, opacity: 0.9, marginTop: 8 }}>
          Mientras tanto, sigue registrando tus movimientos: son la base con la que se calcula.
        </Text>
      </Card>
    );
  }

  // P5 — cold-start: estado de construcción, nunca un "—" mudo.
  if (data && data.score === null) {
    const days = Math.max(1, data.coldStart?.remainingDays ?? 0);
    return (
      <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
        <Text style={{ color: colors.textInverse, fontWeight: '700', fontSize: 18 }}>
          <Ico name="leaf-outline" size={18} color={colors.textInverse} /> Tu Score se está construyendo
        </Text>
        <Text style={{ color: colors.textInverse, opacity: 0.9, marginTop: 6, lineHeight: 20 }}>
          Te faltan ~{days} días de historia. Cuando esté listo verás un número de 0 a
          1.000 que resume tu salud financiera — y qué lo mueve.
        </Text>
        <Text style={{ color: colors.textInverse, opacity: 0.9, marginTop: 8 }}>
          Mientras tanto, ya puedes:
        </Text>
        <Text style={{ color: colors.textInverse, opacity: 0.9, marginTop: 2 }}>
          <Ico name="checkmark-circle-outline" color={colors.textInverse} /> Registrar tus movimientos de cada día
        </Text>
        <Text style={{ color: colors.textInverse, opacity: 0.9 }}>
          <Ico name="checkmark-circle-outline" color={colors.textInverse} /> Marcar tu fondo de emergencia en Cuentas
        </Text>
      </Card>
    );
  }

  const band = data?.band ? BAND_META[data.band] : null;
  return (
    // Salud J: tarjeta blanca compacta. La banda solo tiñe el aro y su palabra;
    // los pilares siguen NEUTROS (P1 ruta b: el semáforo vive en los indicadores).
    <Card>
      <Row style={{ gap: spacing.md }}>
        <View
          style={{
            width: 76, height: 76, borderRadius: 38, borderWidth: 6,
            borderColor: band ? band.soft : colors.border,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{data?.score ?? (loading ? '…' : '—')}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 10 }}>de 1.000</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.textMuted, ...type.small }}>Score Millo</Text>
          {band ? <Text style={{ color: band.text, fontSize: 18, fontWeight: '800' }}>{band.label}</Text> : null}
          {data?.delta != null && data.delta !== 0 ? (
            <Text style={{ color: colors.textMuted, ...type.small }}>
              {data.delta > 0 ? '+' : '−'}
              {Math.abs(data.delta)} este mes
            </Text>
          ) : null}
          <Text style={{ color: colors.textFaint, ...type.caption }}>No es un puntaje crediticio</Text>
        </View>
      </Row>

      {data?.pillars?.length ? (
        <View style={{ marginTop: spacing.md, gap: 8 }}>
          {data.pillars.map((p) => (
            <Row key={p.key} style={{ gap: 8 }}>
              <Text style={{ color: colors.textMuted, fontSize: 12, width: 92 }}>{PILLAR_LABEL[p.key] ?? p.label}</Text>
              <View style={{ flex: 1 }}>
                <ProgressBar value={Math.max(0, Math.min(100, p.value ?? 0)) / 100} color={colors.primary} height={6} label={PILLAR_LABEL[p.key] ?? p.label} />
              </View>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', width: 28, textAlign: 'right' }}>
                {p.value != null ? Math.round(p.value) : '—'}
              </Text>
            </Row>
          ))}
        </View>
      ) : null}
    </Card>
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
        <Text style={{ color: colors.onPrimaryMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 }}>
          TU JUGADA DE MAYOR IMPACTO
        </Text>
        <Text style={{ color: colors.textInverse, fontSize: 18, fontWeight: '800', marginTop: 6 }}>
          {plan.toDebt > 0 ? `Termina primero ${step.name}` : `Cuando te sobre, empieza por ${step.name}`}
        </Text>
        {worstLine ? (
          <Text style={{ color: colors.onPrimaryMuted, fontSize: 13, marginTop: 4 }}>Lo que más te frena · {worstLine}</Text>
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
          <Text style={{ color: colors.primaryDark, fontWeight: '800' }}>Ver mi plan</Text>
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
      <Text style={{ color: colors.onPrimaryMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 }}>
        TU JUGADA DE MAYOR IMPACTO
      </Text>
      <Text style={{ color: colors.textInverse, fontSize: 18, fontWeight: '800', marginTop: 6 }}>{title}</Text>
      {worstLine ? (
        <Text style={{ color: colors.onPrimaryMuted, fontSize: 13, marginTop: 4 }}>Lo que más te frena · {worstLine}</Text>
      ) : null}
      {body ? <Text style={{ color: colors.textInverse, fontSize: 14, lineHeight: 20, marginTop: 6 }}>{body}</Text> : null}
      <Pressable
        onPress={() => goSimulator(top ? SIM_BY_KIND[top.kind] : undefined)}
        accessibilityRole="button"
        style={{ alignSelf: 'flex-start', marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: radius.full, paddingVertical: 10, paddingHorizontal: 18 }}
      >
        <Text style={{ color: colors.primaryDark, fontWeight: '800' }}>Simularlo</Text>
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
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: colors.surfaceAlt }}>
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${ind.title}: ${humanValue(ind.display)}`}
        style={{ paddingVertical: 12, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
      >
        <View style={{ flex: 1, gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '700', color: colors.text, fontSize: 14 }}>{ind.title}</Text>
            <Text style={{ fontWeight: '800', color: LEVEL_COLOR[ind.level], fontSize: 14 }}>{humanValue(ind.display)}</Text>
          </Row>
          {Number.isFinite(pct) ? <ProgressBar value={pct / 100} color={LEVEL_BAR[ind.level]} height={6} label={ind.title} /> : null}
        </View>
        <Ico name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textFaint} />
      </Pressable>
      {open ? (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: 6 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>{ind.meaning}</Text>
          {ind.actions.map((a, i) => (
            <Text key={i} style={{ color: colors.text, fontSize: 13 }}>
              <Ico name="checkmark-circle-outline" color={colors.primary} /> {a}
            </Text>
          ))}
          {needsAction ? (
            <Pressable onPress={() => navigation.navigate('Simulator', SCENARIO_BY_INDICATOR[ind.key] ? { scenario: SCENARIO_BY_INDICATOR[ind.key] } : undefined)} accessibilityRole="link">
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Simularlo →</Text>
            </Pressable>
          ) : null}
          <Text style={{ color: colors.text, fontSize: 12, marginTop: 4 }}>
            <Ico name="calculator-outline" color={colors.textMuted} /> {ind.howComputed}
          </Text>
          <Text style={{ color: colors.textFaint, fontSize: 12 }}>{ind.ranges}</Text>
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
            <Text style={{ color: colors.text, ...type.title, fontVariant: ['tabular-nums'] }}>{formatMoney(d.netWorth.netWorth)}</Text>
            <Text style={{ color: colors.textFaint, ...type.caption }}>lo tuyo, menos deudas</Text>
          </Card>
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('Simulator', { scenario: 'proyeccion_ahorro' })} accessibilityRole="button" accessibilityLabel="Proyectar mi ahorro">
          <Card style={{ flex: 1 }}>
            <Text style={{ color: colors.textMuted, ...type.small }}>Ahorro total</Text>
            <Text style={{ color: colors.success, ...type.title, fontVariant: ['tabular-nums'] }}>{formatMoney(d.savings.total)}</Text>
            {d.interpretation.savings ? <Text style={{ color: colors.textFaint, ...type.caption }}>{d.interpretation.savings.text}</Text> : null}
            <Text style={{ color: colors.primary, ...type.caption, fontWeight: '700', marginTop: spacing.xxs }}>¿Cuánto tendrías en unos años? →</Text>
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
      <Text style={{ fontWeight: '700', fontSize: 15, marginBottom: spacing.sm }}><Ico name="trending-up-outline" size={15} /> Evolución de tu Score</Text>
      {history && history.length > 0 ? (
        <>
          <Text style={{ color: colors.text, fontWeight: '600', marginBottom: spacing.sm }}>
            {narrative()}
          </Text>
          {/* FIN-038 (BP-15): la evolución también se VE, no solo se lee. */}
          {history.length > 1 ? (
            <View style={{ marginBottom: spacing.sm }}>
              <Sparkline values={history.map((h) => h.score)} height={48} label="Evolución del Score" />
            </View>
          ) : null}
          {history.map((h) => (
            <Row key={h.period} style={{ justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: colors.textMuted }}>{h.period}</Text>
              <Text style={{ fontWeight: '700', color: colors.text }}>{h.score}</Text>
            </Row>
          ))}
        </>
      ) : locked ? (
        <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
          <Ico name="lock-closed-outline" size={24} color={colors.textMuted} />
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
      onPress={() => navigation.navigate('Copilot')}
    >
      <Card style={{ paddingVertical: spacing.sm }}>
        <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
          <Ico name="chatbubble-ellipses-outline" color={colors.primary} /> ¿Preguntas sobre tu Score? El copiloto te lo explica →
        </Text>
      </Card>
    </Pressable>
  );
}
