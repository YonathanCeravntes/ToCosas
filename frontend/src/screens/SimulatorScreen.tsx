import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Button, Card, FormScroll, GroupLabel, Ico, IconName, Row } from '../components/ui';
import { colors, radius, spacing, type } from '../theme/colors';
import { formatLocalDate, formatMoney, parseAmount, parseDecimal } from '../utils/format';
import { RateInput } from '../components/RateInput';
import { RateUnit, toEA as rateToEA } from '../utils/rates';
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
 *
 * Rediseño opción 2 (Fundador, 2026-09-29, FIN-052): escenarios en fila de chips,
 * la pregunta como título, la deuda en lista con su tasa y montos rápidos.
 */
interface FieldDef {
  name: string;
  label: string;
  placeholder: string;
  /** DEC-0026 §5.2: el backend acepta 0 donde tiene sentido (extraBudget). */
  allowZero?: boolean;
  helper?: string;
  /** FIN-052: montos rápidos de un toque ("200 mil"). */
  quick?: number[];
  /** Unidad del campo: plata ($), meses o tasa (%). */
  unit?: 'money' | 'months' | 'pct';
}

interface ScenarioDef {
  key: SimulationType;
  label: string;
  /** Nombre corto para el chip. */
  short: string;
  icon: IconName;
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
    short: 'Abono extra',
    icon: 'cash-outline',
    needs: 'debt',
    fields: [{ name: 'extraMonthly', label: 'Abono extra al mes', placeholder: '200.000', unit: 'money', quick: [100_000, 200_000, 500_000, 1_000_000] }],
  },
  {
    key: 'nueva_deuda',
    label: '¿Y si tomo un crédito?',
    short: 'Crédito',
    icon: 'car-outline',
    fields: [
      { name: 'amount', label: 'Monto', placeholder: '20.000.000', unit: 'money', quick: [5_000_000, 10_000_000, 20_000_000, 50_000_000] },
      { name: 'termMonths', label: 'Plazo', placeholder: '60', unit: 'months', quick: [12, 24, 36, 60] },
      { name: 'ratePct', label: 'Tasa del crédito', placeholder: '18', unit: 'pct' },
    ],
  },
  {
    key: 'reducir_gastos',
    label: '¿Y si recorto gastos?',
    short: 'Recortar gastos',
    icon: 'cut-outline',
    fields: [{ name: 'monthlyAmount', label: 'Recorte al mes', placeholder: '300.000', unit: 'money', quick: [100_000, 300_000, 500_000, 1_000_000] }],
  },
  {
    key: 'cambio_ingreso',
    label: '¿Y si cambia mi ingreso?',
    short: 'Cambio de ingreso',
    icon: 'briefcase-outline',
    fields: [{ name: 'newMonthlyIncome', label: 'Nuevo ingreso al mes', placeholder: '6.000.000', unit: 'money' }],
  },
  {
    key: 'estrategia_deudas',
    label: '¿Avalancha o bola de nieve?',
    short: 'Avalancha o bola',
    icon: 'trail-sign-outline',
    needsTwoDebts: true,
    fields: [
      {
        name: 'extraBudget',
        label: 'Extra al mes para deudas',
        placeholder: '0',
        allowZero: true,
        unit: 'money',
        quick: [0, 200_000, 500_000, 1_000_000],
        // P2 (DEC-0022 §5.3 ante la usuaria): mismo contrato del bloque de Deudas.
        helper: 'Con $0 extra ves tu PISO (solo cuotas mínimas) — agrega un extra para ver el techo.',
      },
    ],
  },
  {
    key: 'refinanciar',
    label: '¿Y si refinancio una deuda?',
    short: 'Refinanciar',
    icon: 'repeat-outline',
    needs: 'debt',
    fields: [
      { name: 'newRatePct', label: 'Nueva tasa', placeholder: '14', unit: 'pct' },
      { name: 'newTermMonths', label: 'Nuevo plazo', placeholder: '36', unit: 'months', quick: [12, 24, 36, 60] },
    ],
  },
  {
    key: 'vender_activo',
    label: '¿Y si vendo un activo?',
    short: 'Vender activo',
    icon: 'home-outline',
    needs: 'asset',
    fields: [{ name: 'salePrice', label: 'Precio de venta', placeholder: '30.000.000', unit: 'money' }],
  },
  {
    key: 'proyeccion_ahorro',
    label: '¿Cuánto tendría ahorrando?',
    short: 'Ahorro',
    icon: 'wallet-outline',
    fields: [
      { name: 'monthlyContribution', label: 'Aporte al mes', placeholder: '200.000', unit: 'money', quick: [100_000, 200_000, 500_000] },
      { name: 'annualRatePct', label: 'Rentabilidad efectiva anual (tú la eliges)', placeholder: '8', unit: 'pct', quick: [5, 8, 10] },
      { name: 'months', label: 'Horizonte', placeholder: '36', unit: 'months', quick: [12, 36, 60] },
    ],
  },
];

const SCENARIO_ICON: Record<string, IconName> = Object.fromEntries(
  SCENARIOS.map((s) => [s.key, s.icon]),
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
  // FIN-056 (boceto 5): la tasa de un crédito se escribe como la conoce la persona.
  const [rateUnit, setRateUnit] = useState<RateUnit>('mensual');
  const isLoanRate = (name: string) => name === 'ratePct' || name === 'newRatePct';

  const debtsQ = useApi(() => debtsApi.list(), []);
  // FIN-045: la deuda por defecto es la primera del plan para liberar flujo (la regla vigente).
  const planQ = useApi(() => debtsApi.cashflowPlan(), []);
  const assetsQ = useApi(() => accountsApi.listAssets(), []);
  const historyQ = useApi(() => simulationsApi.history(), []);

  const debts = useMemo(() => (debtsQ.data ?? []).filter((d) => d.status === 'activa'), [debtsQ.data]);
  const assets = assetsQ.data ?? [];
  // "La más cara" = mayor tasa efectiva anual (las tasas MV/NMV se llevan a EA solo para comparar).
  const priciest = useMemo(() => {
    if (debts.length < 2) return null;
    return [...debts].sort((a, b) => toEA(b) - toEA(a))[0]?.id ?? null;
  }, [debts]);

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

  // Default §32 del selector de deuda: la MISMA deuda con la que empieza el plan para
  // liberar flujo (FIN-045, fuente única), no una heurística propia; sin plan, la primera activa.
  const planFirst = planQ.data?.steps?.[0]?.debtId ?? null;
  useEffect(() => {
    if (debtId || debts.length === 0) return;
    if (!planQ.data && !planQ.error) return; // espera el plan para no elegir otra y cambiarla después
    setDebtId(planFirst && debts.some((d) => d.id === planFirst) ? planFirst : debts[0].id);
  }, [debtId, debts, planFirst, planQ.data, planQ.error]);

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
      return { text: 'No tienes deudas activas: no hay nada que abonar.' };
    }
    if (scenario.needsTwoDebts && debts.length < 2) {
      return { text: 'Necesitas al menos 2 deudas activas para comparar órdenes de pago.' };
    }
    if (scenario.needs === 'asset' && assets.length === 0) {
      return {
        text: 'Registra un activo (carro, casa, inversión) para simular su venta.',
        cta: { label: 'Ir a Cuentas y patrimonio →', to: 'Accounts' as const },
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
        // §39: tasas con decimal regional ("1,5" = "1.5"); montos/meses enteros.
        const raw = values[f.name] ?? '';
        const v = /Pct$/.test(f.name) ? parseDecimal(raw) : parseAmount(raw);
        const invalid = Number.isNaN(v) || (f.allowZero ? v < 0 : v <= 0);
        if (invalid) throw new Error(`Ingresa un valor válido en "${f.label}"`);
        params[f.name] = isLoanRate(f.name) ? rateToEA(v, rateUnit) : v;
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
    <FormScroll>
      {/* FIN-052: escenarios en una fila de chips (el nombre corto); la pregunta va de título. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.md, marginTop: -spacing.xs }} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
        {SCENARIOS.map((s) => {
          const on = scenario.key === s.key;
          return (
            <Pressable
              key={s.key}
              onPress={() => pickScenario(s)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={s.label}
              style={{
                height: 36, paddingHorizontal: 14, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: on ? colors.primary : colors.surface, borderWidth: 1, borderColor: on ? colors.primary : colors.border,
              }}
            >
              <Ico name={s.icon} color={on ? colors.textInverse : colors.textMuted} />
              <Text style={{ color: on ? colors.textInverse : colors.text, fontSize: 13, fontWeight: on ? '700' : '600' }}>{s.short}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {unknownScenario ? (
        <Card style={{ borderColor: colors.warning, borderWidth: 1 }}>
          <Text style={{ color: colors.text, fontSize: 13 }}>
            <Ico name="warning-outline" color={colors.warningDeep} /> No encontré el escenario que buscabas: elige uno de la lista.
          </Text>
        </Card>
      ) : null}

      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginTop: spacing.sm }} accessibilityRole="header">{scenario.label}</Text>
      <Text style={{ color: colors.textMuted, ...type.small, marginBottom: spacing.xs }}>Nada de esto cambia tus datos reales.</Text>

      {emptyReason ? (
        <Card style={{ marginTop: spacing.sm }}>
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
            <RadioList
              label={scenario.key === 'abono_extra' ? '¿A cuál deuda?' : '¿Cuál deuda refinancias?'}
              options={debts.map((d) => ({
                id: d.id,
                title: d.name,
                sub: rateLabel(d) + (d.id === planFirst ? ' · tu plan empieza aquí' : d.id === priciest ? ' · la más cara' : ''),
                right: formatMoney(toNumber(d.currentBalance)),
              }))}
              selected={debtId}
              onSelect={setDebtId}
            />
          ) : null}
          {scenario.needs === 'asset' ? (
            <>
              <RadioList
                label="¿Cuál activo venderías?"
                options={assets.map((a) => ({ id: a.id, title: a.name, sub: 'Valor de hoy', right: formatMoney(toNumber(a.currentValue)) }))}
                selected={assetId}
                onSelect={setAssetId}
              />
              {debts.length > 0 ? (
                <RadioList
                  label="¿Le abonas a una deuda con la venta?"
                  options={[
                    { id: '', title: 'No, me quedo con la plata' },
                    ...debts.map((d) => ({ id: d.id, title: d.name, right: formatMoney(toNumber(d.currentBalance)) })),
                  ]}
                  selected={applyToDebtId ?? ''}
                  onSelect={(id) => setApplyToDebtId(id === '' ? null : id)}
                />
              ) : null}
            </>
          ) : null}

          {scenario.fields.map((f) =>
            isLoanRate(f.name) ? (
              <RateInput
                key={f.name}
                label={f.label}
                value={values[f.name] ?? ''}
                unit={rateUnit}
                onChange={(t, u) => { setValues((prev) => ({ ...prev, [f.name]: t })); setRateUnit(u); }}
              />
            ) : (
              <AmountField
                key={f.name}
                def={f}
                value={values[f.name] ?? ''}
                onChange={(t) => setValues((prev) => ({ ...prev, [f.name]: t }))}
              />
            ),
          )}
          {error ? (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ color: colors.danger }}>{error}</Text>
              {/(Millo+|simulaciones)/.test(error) ? (
                <Pressable onPress={() => navigation.navigate('MilloPlus', { source: 'simulations_limit' })}>
                  <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 4 }}><Ico name="sparkles-outline" color={colors.primary} /> Conocer Millo+ →</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <View style={{ marginTop: spacing.sm }}>
            <Button title="Simular" onPress={() => void run()} loading={loading} />
          </View>
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
    </FormScroll>
  );
}

/** Tasa llevada a efectiva anual (solo para ordenar cuál es "la más cara"). */
function toEA(d: Debt): number {
  const r = toNumber(d.interestRate) / 100;
  if (!r) return 0;
  if (d.rateBasis === 'MV') return Math.pow(1 + r, 12) - 1;
  if (d.rateBasis === 'NMV' || d.rateBasis === 'NAMV') return Math.pow(1 + r / 12, 12) - 1;
  return r;
}

function rateLabel(d: Debt): string {
  const r = toNumber(d.interestRate);
  if (!r) return 'Sin tasa registrada';
  return `${String(Math.round(r * 100) / 100).replace('.', ',')}% ${d.rateBasis}`;
}

/** "200 mil", "1 millón", "36 meses", "8%". */
function quickLabel(v: number, unit: FieldDef['unit']): string {
  if (unit === 'months') return `${v} meses`;
  if (unit === 'pct') return `${v}%`;
  if (v === 0) return '$0';
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `${String(m).replace('.', ',')} ${m === 1 ? 'millón' : 'millones'}`;
  }
  return `${v / 1000} mil`;
}

/** Lista de opción única en tarjeta blanca (la fila elegida se tiñe de verde suave). */
function RadioList({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: Array<{ id: string; title: string; sub?: string; right?: string }>;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <GroupLabel title={label} />
      <Card style={{ paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' }}>
        {options.map((o, i) => {
          const on = selected === o.id;
          return (
            <Pressable
              key={o.id || 'none'}
              onPress={() => onSelect(o.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 12, paddingHorizontal: spacing.md, minHeight: 52, backgroundColor: on ? colors.primarySoft : colors.surface, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceAlt }}
            >
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? colors.primary : colors.textFaint, alignItems: 'center', justifyContent: 'center' }}>
                {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{o.title}</Text>
                {o.sub ? <Text style={{ color: colors.textMuted, ...type.small }} numberOfLines={1}>{o.sub}</Text> : null}
              </View>
              {o.right ? <Text style={{ color: colors.text, fontWeight: '800' }}>{o.right}</Text> : null}
            </Pressable>
          );
        })}
      </Card>
    </>
  );
}

/** Campo grande con su unidad y montos rápidos de un toque. */
function AmountField({ def, value, onChange }: { def: FieldDef; value: string; onChange: (t: string) => void }) {
  const current = /Pct$/.test(def.name) ? parseDecimal(value) : parseAmount(value);
  return (
    <>
      <GroupLabel title={def.label} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md }}>
        {def.unit === 'money' ? <Text style={{ color: colors.textMuted, fontSize: 18, fontWeight: '800' }}>$</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder={def.placeholder}
          placeholderTextColor={colors.textFaint}
          accessibilityLabel={def.label}
          style={{ flex: 1, fontSize: 18, fontWeight: '800', color: colors.text, paddingVertical: 0 }}
        />
        {def.unit === 'months' ? <Text style={{ color: colors.textMuted, fontWeight: '700' }}>meses</Text> : null}
        {def.unit === 'pct' ? <Text style={{ color: colors.textMuted, fontWeight: '700' }}>% EA</Text> : null}
      </View>
      {def.quick ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
          {def.quick.map((q) => {
            const on = value.trim() !== '' && current === q;
            return (
              <Pressable
                key={q}
                onPress={() => onChange(def.unit === 'money' ? formatMoney(q).replace(/[^0-9.]/g, '') : String(q))}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={{ height: 34, paddingHorizontal: 12, borderRadius: 17, justifyContent: 'center', backgroundColor: on ? colors.primary : colors.surface, borderWidth: 1, borderColor: on ? colors.primary : colors.border }}
              >
                <Text style={{ color: on ? colors.textInverse : colors.text, fontSize: 13, fontWeight: on ? '700' : '600' }}>{quickLabel(q, def.unit)}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {def.helper ? <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.xs }}>{def.helper}</Text> : null}
    </>
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
        <Text style={{ fontWeight: '700', fontSize: 16 }}><Ico name="wallet-outline" size={16} /> Tu ahorro proyectado</Text>
        <Text style={{ fontSize: 30, fontWeight: '800', color: colors.primary, marginTop: 4 }}>
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
          <Ico name="scale-outline" color={colors.textMuted} /> {String(s.disclaimer)}
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
        <Ico name="stats-chart-outline" /> El detalle: antes → después
      </Text>
      {rows.map((r) => (
        <Row key={r.label} style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ color: colors.textMuted, flex: 1 }}>{r.label}</Text>
          <Text style={{ color: colors.text }}>{r.before} → </Text>
          <Text style={{ fontWeight: '800', color: r.good ? colors.primary : colors.dangerDeep }}>
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
        return go ? { label: 'Hazlo real: abonar a capital →', go } : null;
      }
      case 'estrategia_deudas':
        return {
          label: 'Ver tu orden de ataque →',
          go: () => navigation.navigate('Main', { screen: 'Debts', params: { screen: 'DebtsList' } }),
        };
      case 'reducir_gastos':
        return {
          label: 'Ajusta tus compromisos en Mi mes →',
          go: () => navigation.navigate('Budget'),
        };
      case 'vender_activo': {
        const go = goDebt(applyToDebtId);
        return go ? { label: 'Ver la deuda que abonarías →', go } : null;
      }
      // nueva_deuda / refinanciar / cambio_ingreso: no hay acción real en la
      // app — sin CTA fabricado (§29.1).
      default:
        return null;
    }
  })();
  if (!cta) return null;
  return (
    <Pressable
      onPress={cta.go}
      accessibilityRole="button"
      style={{ backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, alignItems: 'center' }}
    >
      <Text style={{ color: colors.textInverse, fontWeight: '800' }}>{cta.label}</Text>
    </Pressable>
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
          <Ico name="time-outline" /> {open ? 'Tus últimas simulaciones' : `Ver tus últimas simulaciones (${Math.min(history.length, 5)}) →`}
        </Text>
      </Pressable>
      {open
        ? history.slice(0, 5).map((h) => (
            <Pressable key={h.id} onPress={() => onPick(h)} style={{ marginTop: spacing.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>
                  <Ico name={SCENARIO_ICON[h.type] ?? 'flask-outline'} color={colors.textMuted} /> {SCENARIO_LABEL[h.type] ?? h.type}
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
