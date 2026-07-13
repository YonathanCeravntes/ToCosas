import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Card, Field, Row } from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';
import { formatLocalDate, formatMoney } from '../utils/format';
import {
  Asset,
  Debt,
  SimulationHistoryEntry,
  SimulationResult,
  SimulationType,
  toNumber,
} from '../api/types';
import { accountsApi, debtsApi, simulationsApi } from '../api/endpoints';
import { useApi } from '../utils/useApi';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

/**
 * FIN-026 · Experiencia de Simulador (ARQ-0026, DEC-0026): los 8 escenarios del
 * motor (FIN-007) usables, con la pregunta precargada desde las jugadas, el
 * veredicto narrado (§29, titular liderado por el DELTA del Score) y el puente
 * de vuelta a la acción real. La pantalla NO calcula cifras — solo formatea.
 */
interface FieldDef {
  name: string;
  label: string;
  placeholder: string;
  /** DEC-0026 §5.2: el backend acepta 0 donde tiene sentido (extraBudget). */
  allowZero?: boolean;
  helper?: string;
}

interface ScenarioDef {
  key: SimulationType;
  label: string;
  emoji: string;
  fields: FieldDef[];
  /** Selector requerido: deuda (abono/refinanciación) o activo (venta). */
  needs?: 'debt' | 'asset';
  /** Escenario aplicable solo con 2+ deudas (estrategia). */
  needsTwoDebts?: boolean;
}

const SCENARIOS: ScenarioDef[] = [
  {
    // P1 (máxima prioridad DEC-0026): la jugada de abono por fin aterriza aquí.
    key: 'abono_extra',
    label: '¿Y si abono extra a una deuda?',
    emoji: '💸',
    needs: 'debt',
    fields: [{ name: 'extraMonthly', label: 'Abono extra mensual', placeholder: '200000' }],
  },
  {
    key: 'nueva_deuda',
    label: '¿Y si tomo un crédito?',
    emoji: '🚗',
    fields: [
      { name: 'amount', label: 'Monto', placeholder: '20000000' },
      { name: 'termMonths', label: 'Plazo (meses)', placeholder: '60' },
      { name: 'ratePct', label: 'Tasa % EA', placeholder: '18' },
    ],
  },
  {
    key: 'reducir_gastos',
    label: '¿Y si recorto gastos?',
    emoji: '✂️',
    fields: [{ name: 'monthlyAmount', label: 'Recorte mensual', placeholder: '300000' }],
  },
  {
    key: 'cambio_ingreso',
    label: '¿Y si cambia mi ingreso?',
    emoji: '💼',
    fields: [{ name: 'newMonthlyIncome', label: 'Nuevo ingreso mensual', placeholder: '6000000' }],
  },
  {
    key: 'estrategia_deudas',
    label: '¿Avalancha o bola de nieve?',
    emoji: '🏔️',
    needsTwoDebts: true,
    fields: [
      {
        name: 'extraBudget',
        label: 'Extra mensual para deudas',
        placeholder: '0',
        allowZero: true,
        // P2 (DEC-0022 §5.3 ante la usuaria): mismo contrato del bloque de Deudas.
        helper: 'Con $0 extra ves tu PISO (solo cuotas mínimas) — agrega un extra para ver el techo.',
      },
    ],
  },
  {
    key: 'refinanciar',
    label: '¿Y si refinancio una deuda?',
    emoji: '🔁',
    needs: 'debt',
    fields: [
      { name: 'newRatePct', label: 'Nueva tasa % EA', placeholder: '14' },
      { name: 'newTermMonths', label: 'Nuevo plazo (meses)', placeholder: '36' },
    ],
  },
  {
    key: 'vender_activo',
    label: '¿Y si vendo un activo?',
    emoji: '🏠',
    needs: 'asset',
    fields: [{ name: 'salePrice', label: 'Precio de venta', placeholder: '30000000' }],
  },
  {
    key: 'proyeccion_ahorro',
    label: '¿Cuánto tendría ahorrando?',
    emoji: '🐷',
    fields: [
      { name: 'monthlyContribution', label: 'Aporte mensual', placeholder: '200000' },
      { name: 'annualRatePct', label: 'Tasa % EA (tú la eliges, p. ej. 8)', placeholder: '8' },
      { name: 'months', label: 'Horizonte (meses)', placeholder: '36' },
    ],
  },
];

const SCENARIO_EMOJI: Record<string, string> = Object.fromEntries(
  SCENARIOS.map((s) => [s.key, s.emoji]),
);
const SCENARIO_LABEL: Record<string, string> = Object.fromEntries(
  SCENARIOS.map((s) => [s.key, s.label]),
);

const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

export function SimulatorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Simulator'>>();

  const requested = route.params?.scenario;
  const found = SCENARIOS.find((s) => s.key === requested);
  // DEC-0026 §5.1: NUNCA más fallback mudo — si el escenario pedido no existe,
  // se muestra el primero CON aviso visible.
  const [unknownScenario] = useState(Boolean(requested && !found));
  const [scenario, setScenario] = useState<ScenarioDef>(found ?? SCENARIOS[0]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [debtId, setDebtId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [applyToDebtId, setApplyToDebtId] = useState<string | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debtsQ = useApi(() => debtsApi.list(), []);
  const summaryQ = useApi(() => debtsApi.summary(), []);
  const assetsQ = useApi(() => accountsApi.listAssets(), []);
  const historyQ = useApi(() => simulationsApi.history(), []);

  const debts = useMemo(() => (debtsQ.data ?? []).filter((d) => d.status === 'activa'), [debtsQ.data]);
  const assets = assetsQ.data ?? [];

  // Precarga desde las jugadas (P1): params → campos y selectores.
  useEffect(() => {
    const p = route.params?.params;
    if (!p) return;
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(p)) {
      if (k === 'debtId') setDebtId(String(v));
      else if (v !== undefined) next[k] = String(v);
    }
    setValues((prev) => ({ ...next, ...prev }));
  }, [route.params?.params]);

  // Default §32 del selector de deuda: la MISMA deuda que el motor recomienda
  // atacar (attackOrder[0], FIN-022) — inyección de la fuente única, no heurística
  // propia; sin bloque de estrategia, la primera activa.
  useEffect(() => {
    if (debtId || debts.length === 0) return;
    const recommended = summaryQ.data?.strategy?.attackOrder?.[0]?.debtId;
    setDebtId(recommended && debts.some((d) => d.id === recommended) ? recommended : debts[0].id);
  }, [debtId, debts, summaryQ.data]);

  useEffect(() => {
    if (!assetId && assets.length > 0) setAssetId(assets[0].id);
  }, [assetId, assets]);

  const pickScenario = (s: ScenarioDef) => {
    setScenario(s);
    setResult(null);
    setError(null);
    setValues({});
  };

  // P6 — estados vacíos honestos (§29.1): el escenario explica qué necesita
  // ANTES de mostrar un formulario que simularía sobre el vacío.
  const emptyReason = (() => {
    if (scenario.needs === 'debt' && debts.length === 0) {
      return { text: 'No tienes deudas activas — nada que abonar 🎉' };
    }
    if (scenario.needsTwoDebts && debts.length < 2) {
      return { text: 'Necesitas al menos 2 deudas activas para comparar órdenes de pago.' };
    }
    if (scenario.needs === 'asset' && assets.length === 0) {
      return {
        text: 'Registra un activo (carro, casa, inversión) para simular su venta.',
        cta: { label: '🏦 Ir a Cuentas y patrimonio →', to: 'Accounts' as const },
      };
    }
    return null;
  })();

  const run = async () => {
    setError(null);
    setLoading(true);
    try {
      const params: Record<string, number | string> = {};
      for (const f of scenario.fields) {
        const raw = (values[f.name] ?? '').replace(/[^\d.]/g, '');
        const v = raw === '' ? NaN : parseFloat(raw);
        const invalid = Number.isNaN(v) || (f.allowZero ? v < 0 : v <= 0);
        if (invalid) throw new Error(`Ingresa un valor válido en "${f.label}"`);
        params[f.name] = v;
      }
      if (scenario.needs === 'debt') {
        if (!debtId) throw new Error('Elige la deuda');
        params.debtId = debtId;
      }
      if (scenario.key === 'refinanciar') params.newRateBasis = 'EA';
      if (scenario.key === 'vender_activo') {
        const asset = assets.find((a) => a.id === assetId);
        if (!asset) throw new Error('Elige el activo');
        params.assetValue = toNumber(asset.currentValue);
        if (applyToDebtId) params.applyToDebtId = applyToDebtId;
      }
      setResult(await simulationsApi.run({ type: scenario.key, ...params }));
      void historyQ.reload();
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.sm }}>
        Prueba decisiones antes de tomarlas — nada de esto modifica tus datos reales.
      </Text>

      {unknownScenario ? (
        <Card style={{ borderColor: colors.warning, borderWidth: 1 }}>
          <Text style={{ color: colors.text, fontSize: 13 }}>
            ⚠️ No encontré el escenario que buscabas — elige uno de la lista.
          </Text>
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
        {SCENARIOS.map((s) => (
          <Pressable
            key={s.key}
            onPress={() => pickScenario(s)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: radius.full,
              backgroundColor: scenario.key === s.key ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: scenario.key === s.key ? colors.primary : colors.border,
            }}
          >
            <Text style={{ color: scenario.key === s.key ? colors.textInverse : colors.text, fontSize: 13 }}>
              {s.emoji} {s.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {emptyReason ? (
        <Card>
          <Text style={{ color: colors.textMuted }}>{emptyReason.text}</Text>
          {emptyReason.cta ? (
            <Pressable onPress={() => navigation.navigate(emptyReason.cta!.to)} style={{ marginTop: spacing.sm }}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{emptyReason.cta.label}</Text>
            </Pressable>
          ) : null}
        </Card>
      ) : (
        <>
          {scenario.needs === 'debt' ? (
            <Picker
              label={scenario.key === 'abono_extra' ? '¿A cuál deuda?' : '¿Cuál deuda refinancias?'}
              options={debts.map((d) => ({
                id: d.id,
                label: `${d.name} · ${formatMoney(toNumber(d.currentBalance))}`,
              }))}
              selected={debtId}
              onSelect={setDebtId}
            />
          ) : null}
          {scenario.needs === 'asset' ? (
            <>
              <Picker
                label="¿Cuál activo venderías?"
                options={assets.map((a) => ({
                  id: a.id,
                  label: `${a.name} · ${formatMoney(toNumber(a.currentValue))}`,
                }))}
                selected={assetId}
                onSelect={setAssetId}
              />
              {debts.length > 0 ? (
                <Picker
                  label="¿Le abonas a una deuda con la venta? (opcional)"
                  options={[
                    { id: '', label: 'No, me quedo con la plata' },
                    ...debts.map((d) => ({ id: d.id, label: d.name })),
                  ]}
                  selected={applyToDebtId ?? ''}
                  onSelect={(id) => setApplyToDebtId(id === '' ? null : id)}
                />
              ) : null}
            </>
          ) : null}

          {scenario.fields.map((f) => (
            <View key={f.name}>
              <Field
                label={f.label}
                value={values[f.name] ?? ''}
                onChangeText={(t) => setValues((prev) => ({ ...prev, [f.name]: t }))}
                keyboardType="numeric"
                placeholder={f.placeholder}
              />
              {f.helper ? (
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: -6, marginBottom: spacing.sm }}>
                  {f.helper}
                </Text>
              ) : null}
            </View>
          ))}
          {error ? (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ color: colors.danger }}>{error}</Text>
              {/(Millo+|simulaciones)/.test(error) ? (
                <Pressable onPress={() => navigation.navigate('MilloPlus', { source: 'simulations_limit' })}>
                  <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 4 }}>✨ Conocer Millo+ →</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <Button title="Simular" onPress={() => void run()} loading={loading} />
        </>
      )}

      {result ? (
        <>
          <ResultCard result={result} />
          <NextStep result={result} debtId={debtId} applyToDebtId={applyToDebtId} debts={debts} />
        </>
      ) : null}

      <HistorySection
        history={historyQ.data ?? []}
        onPick={(h) => {
          const s = SCENARIOS.find((x) => x.key === h.type);
          if (!s) return;
          pickScenario(s);
          const next: Record<string, string> = {};
          for (const [k, v] of Object.entries(h.params ?? {})) {
            if (k === 'type' || v === undefined) continue;
            if (k === 'debtId') setDebtId(String(v));
            else if (k === 'applyToDebtId') setApplyToDebtId(String(v));
            else if (k !== 'assetValue' && k !== 'newRateBasis') next[k] = String(v);
          }
          setValues(next);
        }}
      />
    </ScrollView>
  );
}

function Picker({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: Array<{ id: string; label: string }>;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 6 }}>{label}</Text>
      <View style={{ gap: 6 }}>
        {options.map((o) => (
          <Pressable
            key={o.id || 'none'}
            onPress={() => onSelect(o.id)}
            style={{
              padding: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: selected === o.id ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: selected === o.id ? colors.primary : colors.border,
            }}
          >
            <Text style={{ color: selected === o.id ? colors.textInverse : colors.text, fontSize: 13 }} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** P3 — titular §29 desde `specifics` existentes; lidera el DELTA del Score
 *  ("pasaría de X a Y", nunca el absoluto — DEC-0026 §5.3). */
function headline(r: SimulationResult): string | null {
  const s = r.specifics;
  const n = (k: string) => Number(s[k] ?? 0);
  const scorePart =
    r.delta.score !== 0 ? `Tu Score pasaría de ${r.before.score} a ${r.after.score}` : '';
  const bandPart =
    r.before.band !== r.after.band ? ` y tu banda sería "${r.after.band}"` : '';
  const score = scorePart ? `${scorePart}${bandPart}.` : '';
  switch (r.type) {
    case 'abono_extra':
      return `Terminarías ${n('monthsSaved')} meses antes y te ahorras ${formatMoney(n('interestSaved'))} en intereses. ${score}`.trim();
    case 'nueva_deuda':
      return `La cuota sería ${formatMoney(n('monthlyPayment'))} al mes (${formatMoney(n('totalInterest'))} en intereses totales). ${score}`.trim();
    case 'reducir_gastos':
      return `Liberas ${formatMoney(n('freedMonthly'))} cada mes — ${formatMoney(n('freedYearly'))} al año. ${score}`.trim();
    case 'cambio_ingreso': {
      const d = n('incomeDelta');
      if (d === 0) return score || null;
      return `${d > 0 ? 'Entrarían' : 'Dejarían de entrar'} ${formatMoney(Math.abs(d))} al mes. ${score}`.trim();
    }
    case 'estrategia_deudas': {
      // Mismo copy honesto de FIN-022 §5.2 — misma cifra, misma redacción.
      const diff = n('interestDifference');
      const rec = String(s.recommended) === 'snowball' ? 'la más pequeña primero (bola de nieve)' : 'la más cara primero (avalancha)';
      const other = String(s.recommended) === 'snowball' ? 'la más cara primero (avalancha)' : 'la más pequeña primero (bola de nieve)';
      return diff >= 1000
        ? `Pagar ${rec} en vez de ${other} te ahorra ${formatMoney(diff)} en intereses.`
        : `Con tus deudas de hoy, ambos órdenes cuestan casi lo mismo — el recomendado es ${rec}.`;
    }
    case 'refinanciar': {
      const pd = n('paymentDelta');
      const id = n('interestDelta');
      const cuota = pd === 0 ? 'tu cuota quedaría igual' : `tu cuota ${pd < 0 ? 'bajaría' : 'subiría'} ${formatMoney(Math.abs(pd))}`;
      const inte = id === 0 ? '' : ` y pagarías ${formatMoney(Math.abs(id))} ${id < 0 ? 'menos' : 'más'} en intereses`;
      return `Con las nuevas condiciones, ${cuota}${inte}. ${score}`.trim();
    }
    case 'vender_activo': {
      const applied = n('appliedToDebt');
      return `${applied > 0 ? `Le quitas ${formatMoney(applied)} a tu deuda con la venta. ` : ''}${score}`.trim() || null;
    }
    default:
      return null;
  }
}

function ResultCard({ result }: { result: SimulationResult }) {
  const d = result.delta;
  // FIN-015: la proyección de ahorro es ilustrativa (no cambia tus métricas de hoy).
  if (result.type === 'proyeccion_ahorro') {
    const s = result.specifics;
    const years = Object.keys(s)
      .filter((k) => k.startsWith('valueYear'))
      .sort((a, b) => Number(a.slice(9)) - Number(b.slice(9)));
    return (
      <Card style={{ marginTop: spacing.md }}>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>🐷 Tu ahorro proyectado</Text>
        <Text style={{ fontSize: 30, fontWeight: '800', color: colors.success, marginTop: 4 }}>
          {formatMoney(Number(s.futureValue))}
        </Text>
        <Row style={{ justifyContent: 'space-between', marginTop: spacing.sm }}>
          <Text style={{ color: colors.textMuted }}>Aportarías</Text>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{formatMoney(Number(s.totalContributed))}</Text>
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ color: colors.textMuted }}>Interés ganado</Text>
          <Text style={{ color: colors.success, fontWeight: '700' }}>{formatMoney(Number(s.interestEarned))}</Text>
        </Row>
        {years.map((k) => (
          <Row key={k} style={{ justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Año {k.slice(9)}</Text>
            <Text style={{ color: colors.text, fontSize: 12 }}>{formatMoney(Number(s[k]))}</Text>
          </Row>
        ))}
        <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: spacing.sm, lineHeight: 15 }}>
          ⚖️ {String(s.disclaimer)}
        </Text>
      </Card>
    );
  }

  const title = headline(result);
  const rows: Array<{ label: string; before: string; after: string; good: boolean }> = [
    {
      label: 'Score Millo',
      before: String(result.before.score),
      after: `${result.after.score} (${d.score >= 0 ? '+' : ''}${d.score})`,
      good: d.score >= 0,
    },
    {
      label: 'Endeudamiento',
      before: pct(result.before.dti),
      after: pct(result.after.dti),
      good: d.dti <= 0,
    },
    {
      label: 'Flujo mensual',
      before: formatMoney(result.before.cashflow),
      after: formatMoney(result.after.cashflow),
      good: d.cashflow >= 0,
    },
    {
      label: 'Patrimonio',
      before: formatMoney(result.before.netWorth),
      after: formatMoney(result.after.netWorth),
      good: d.netWorth >= 0,
    },
  ];
  return (
    <Card style={{ marginTop: spacing.md }}>
      {title ? (
        <Text style={{ fontWeight: '700', fontSize: 16, lineHeight: 22, marginBottom: spacing.sm }}>
          {title}
        </Text>
      ) : null}
      <Text style={{ fontWeight: '600', color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm }}>
        📊 El detalle: antes → después
      </Text>
      {rows.map((r) => (
        <Row key={r.label} style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ color: colors.textMuted, flex: 1 }}>{r.label}</Text>
          <Text style={{ color: colors.text }}>{r.before} → </Text>
          <Text style={{ fontWeight: '800', color: r.good ? colors.success : colors.danger }}>
            {r.after}
          </Text>
        </Row>
      ))}
    </Card>
  );
}

/** P4 — el puente de vuelta: solo donde existe una acción REAL en la app. */
function NextStep({
  result,
  debtId,
  applyToDebtId,
  debts,
}: {
  result: SimulationResult;
  debtId: string | null;
  applyToDebtId: string | null;
  debts: Debt[];
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const goDebt = (id: string | null) => {
    const debt = debts.find((d) => d.id === id);
    if (!debt) return null;
    return () =>
      navigation.navigate('Main', {
        screen: 'Debts',
        params: { screen: 'DebtDetail', params: { debtId: debt.id, name: debt.name } },
      });
  };
  const cta = (() => {
    switch (result.type) {
      case 'abono_extra': {
        const go = goDebt(debtId);
        return go ? { label: '💸 Hazlo real: abonar a capital →', go } : null;
      }
      case 'estrategia_deudas':
        return {
          label: '🎯 Ver tu orden de ataque →',
          go: () => navigation.navigate('Main', { screen: 'Debts', params: { screen: 'DebtsList' } }),
        };
      case 'reducir_gastos':
        return {
          label: '🏠 Ajusta tus compromisos →',
          go: () => navigation.navigate('Main', { screen: 'Budget' }),
        };
      case 'vender_activo': {
        const go = goDebt(applyToDebtId);
        return go ? { label: '💳 Ver la deuda que abonarías →', go } : null;
      }
      // nueva_deuda / refinanciar / cambio_ingreso: no hay acción real en la
      // app — sin CTA fabricado (§29.1).
      default:
        return null;
    }
  })();
  if (!cta) return null;
  return (
    <Card style={{ borderColor: colors.primary, borderWidth: 2 }}>
      <Pressable onPress={cta.go}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>{cta.label}</Text>
      </Pressable>
    </Card>
  );
}

/** P5 — historial visible con tap honesto (anuncia su contenido) y re-ensayo. */
function HistorySection({
  history,
  onPick,
}: {
  history: SimulationHistoryEntry[];
  onPick: (h: SimulationHistoryEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  if (history.length === 0) return null;
  return (
    <Card style={{ marginTop: spacing.md }}>
      <Pressable onPress={() => setOpen((v) => !v)}>
        <Text style={{ fontWeight: '700', fontSize: 15 }}>
          🕘 {open ? 'Tus últimas simulaciones' : `Ver tus últimas simulaciones (${Math.min(history.length, 5)}) →`}
        </Text>
      </Pressable>
      {open
        ? history.slice(0, 5).map((h) => (
            <Pressable key={h.id} onPress={() => onPick(h)} style={{ marginTop: spacing.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>
                  {SCENARIO_EMOJI[h.type] ?? '🧪'} {SCENARIO_LABEL[h.type] ?? h.type}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {formatLocalDate(h.createdAt)} · repetir →
                </Text>
              </Row>
            </Pressable>
          ))
        : null}
    </Card>
  );
}
