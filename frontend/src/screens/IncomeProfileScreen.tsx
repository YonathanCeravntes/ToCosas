import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, ErrorState, Field, FormScroll, GroupLabel, Ico, IconButton, IconName, Row, SegmentBar } from '../components/ui';
import { colors, radius, spacing, type } from '../theme/colors';
import { formatMoney, parseAmount, parseDecimal } from '../utils/format';
import { IncomeSource, NetIncomeSummary, WorkProfile, toNumber } from '../api/types';
import { incomeApi } from '../api/endpoints';
import { useApi } from '../utils/useApi';
import { confirmRemove } from '../utils/confirm';
import { PROFILE_PRESETS, ProfilePresets, presetSummary } from '../utils/deductionPresets';

/**
 * FIN-027 · Mi perfil de ingresos (DEC-0027), rediseñado en la opción 2 "De bruto a neto"
 * (Fundador, 2026-09-29, FIN-051):
 *  - La cuenta a la vista: bruto − deducciones (+ variables estimados) = neto disponible.
 *  - Fuentes separadas en FIJOS y VARIABLES (coexisten, n fuentes).
 *  - "¿De qué vives?" ahora sirve: sugiere las deducciones típicas del perfil y se
 *    agregan con un toque (la base de cada deducción sigue siendo total o parcial).
 * Esta pantalla no calcula el neto: viene de `NetIncomeService` (§32).
 */
const PROFILES: Array<{ key: WorkProfile; label: string; icon: IconName }> = [
  { key: 'empleado', label: 'Empleado', icon: 'briefcase-outline' },
  { key: 'independiente', label: 'Independiente', icon: 'laptop-outline' },
  { key: 'empresario', label: 'Empresario', icon: 'business-outline' },
  { key: 'pensionado', label: 'Pensionado', icon: 'person-outline' },
  { key: 'estudiante', label: 'Estudiante', icon: 'school-outline' },
  { key: 'otro', label: 'Otro', icon: 'ellipsis-horizontal-circle-outline' },
];

export function IncomeProfileScreen() {
  const profile = useApi(() => incomeApi.getProfile(), []);
  const sources = useApi(() => incomeApi.listSources(), []);
  const summary = useApi(() => incomeApi.summary(), []);

  const refresh = React.useCallback(
    () => Promise.all([profile.reload(), sources.reload(), summary.reload()]),
    [profile.reload, sources.reload, summary.reload],
  );

  useFocusEffect(React.useCallback(() => { void refresh(); }, [refresh]));

  const loadError = sources.data ? null : sources.error ?? summary.error;
  const workProfile = profile.data?.workProfile ?? null;
  const presets = workProfile ? PROFILE_PRESETS[workProfile] ?? null : null;
  const fixed = (sources.data ?? []).filter((s) => !s.isVariable);
  const variable = (sources.data ?? []).filter((s) => s.isVariable);

  return (
    <FormScroll onRefresh={refresh}>
      {loadError ? <ErrorState message={loadError} onRetry={() => void refresh()} /> : null}

      <NetCard summary={summary.data} />

      <GroupLabel title="¿De qué vives?" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs }}>
        {PROFILES.map((p) => {
          const on = workProfile === p.key;
          return (
            <Pressable
              key={p.key}
              onPress={() => void incomeApi.setProfile(p.key).then(refresh)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, minHeight: 40, borderRadius: radius.full,
                backgroundColor: on ? colors.primarySoft : colors.surface, borderWidth: on ? 2 : 1, borderColor: on ? colors.primary : colors.border,
              }}
            >
              <Ico name={p.icon} color={on ? colors.primaryDark : colors.textMuted} />
              <Text style={{ color: on ? colors.primaryDark : colors.text, fontSize: 13, fontWeight: on ? '800' : '600' }}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ color: colors.textFaint, ...type.caption, marginBottom: spacing.sm }}>
        {presets
          ? `Con esto te sugerimos tus deducciones: ${presetSummary(presets)}.`
          : workProfile
            ? 'Para este perfil no hay deducciones típicas; si te descuentan algo, agrégalo en tu ingreso.'
            : 'Elige tu perfil y te sugerimos las deducciones típicas (salud, pensión).'}
      </Text>

      <GroupLabel title="Fijos" />
      {fixed.length === 0 ? (
        <EmptyBox title="Aún no tienes ingresos fijos" sub="Tu salario, mesada o lo que te llega igual cada mes." />
      ) : (
        fixed.map((s) => <SourceCard key={s.id} source={s} presets={presets} onChanged={refresh} />)
      )}

      <GroupLabel title="Variables" />
      {variable.length === 0 ? (
        <EmptyBox title="Aún no tienes ingresos variables" sub="Comisiones, trabajos extra o ventas. Se suman como estimado del mes." />
      ) : (
        <Card style={{ paddingVertical: 0 }}>
          {variable.map((s, i) => (
            <Row key={s.id} style={{ paddingVertical: 12, gap: spacing.sm, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceAlt }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{s.name}</Text>
                <Text style={{ color: colors.textMuted, ...type.small }}>Estimado al mes</Text>
              </View>
              <Text style={{ color: colors.primary, fontWeight: '800' }}>~{formatMoney(toNumber(s.amount))}</Text>
              <IconButton
                icon="trash-outline"
                label={`Eliminar ${s.name}`}
                onPress={() => confirmRemove(s.name, 'Dejará de contar en tu ingreso.', () => incomeApi.removeSource(s.id).then(refresh))}
              />
            </Row>
          ))}
        </Card>
      )}

      <NewSourceForm onSaved={refresh} />
    </FormScroll>
  );
}

/** De bruto a neto, a la vista (tarjeta blanca como Inicio G / Mi mes). */
function NetCard({ summary }: { summary: NetIncomeSummary | null }) {
  if (!summary || (summary.grossFixedTotal === 0 && summary.grossVariableEstimate === 0)) {
    return (
      <Card>
        <Text style={{ color: colors.textMuted, ...type.small }}>Tu ingreso neto disponible</Text>
        <Text style={{ color: colors.text, fontSize: 32, fontWeight: '800', marginTop: 2 }}>$0</Text>
        <Text style={{ color: colors.textMuted, ...type.small }}>Agrega abajo lo que te entra: Millo calcula lo que de verdad puedes usar cada mes.</Text>
      </Card>
    );
  }
  const deductions = summary.deductions.reduce((a, d) => a + d.amount, 0);
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ color: colors.textMuted, ...type.small }}>Tu ingreso neto disponible</Text>
        <Text style={{ color: colors.textMuted, ...type.small }}>al mes</Text>
      </Row>
      <Text style={{ color: colors.text, fontSize: 32, fontWeight: '800', marginTop: 2, marginBottom: spacing.sm }}>
        {formatMoney(summary.netMonthlyEstimate)}
      </Text>
      <SegmentBar
        parts={[
          { key: 'neto', label: 'Te llega', value: summary.netFixedTotal, color: colors.primary },
          { key: 'var', label: 'Variable estimado', value: summary.grossVariableEstimate, color: colors.primaryLight },
          { key: 'ded', label: 'Deducciones', value: deductions, color: colors.warning },
        ]}
      />
      <Text style={{ color: colors.textFaint, ...type.small, marginTop: spacing.sm }}>
        Fijo {formatMoney(summary.grossFixedTotal)} − deducciones {formatMoney(deductions)}
        {summary.grossVariableEstimate > 0 ? ` + variables ~${formatMoney(summary.grossVariableEstimate)}` : ''}.
        {summary.selfPaidDeductionsTotal > 0 ? ` Las que pagas tú (${formatMoney(summary.selfPaidDeductionsTotal)}) quedan apartadas en Mi mes.` : ''}
      </Text>
    </Card>
  );
}

function EmptyBox({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.textFaint, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm }}>
      <Text style={{ color: colors.text, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: colors.textMuted, ...type.small, marginTop: 2 }}>{sub}</Text>
    </View>
  );
}

function NewSourceForm({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [isVariable, setIsVariable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const add = async () => {
    const value = parseAmount(amount); // §39
    if (!name.trim() || !value) return setErr('Escribe el nombre y el monto.');
    const d = !isVariable && day.trim() ? parseInt(day, 10) : undefined;
    if (d !== undefined && (Number.isNaN(d) || d < 1 || d > 31)) return setErr('El día debe estar entre 1 y 31.');
    setSaving(true);
    setErr(null);
    try {
      await incomeApi.createSource({ name: name.trim(), amount: value, isVariable, dayOfMonth: d });
      setName(''); setAmount(''); setDay(''); setIsVariable(false); setOpen(false);
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return <Button title="Nueva fuente de ingreso" icon="add" onPress={() => setOpen(true)} />;

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <Text style={{ fontWeight: '800', fontSize: 15, color: colors.text }}>Nueva fuente de ingreso</Text>
        <Pressable onPress={() => { setOpen(false); setErr(null); }} accessibilityRole="button"><Text style={{ color: colors.primary, fontWeight: '700' }}>Cerrar</Text></Pressable>
      </Row>
      <Row style={{ gap: spacing.sm, marginBottom: spacing.md }}>
        {[
          { v: false, l: 'Fija', s: 'Llega igual cada mes' },
          { v: true, l: 'Variable', s: 'Cambia cada mes' },
        ].map((o) => {
          const on = isVariable === o.v;
          return (
            <Pressable
              key={String(o.v)}
              onPress={() => setIsVariable(o.v)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={{ flex: 1, padding: spacing.sm, minHeight: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.primarySoft : colors.surface, borderWidth: on ? 2 : 1, borderColor: on ? colors.primary : colors.border }}
            >
              <Text style={{ color: on ? colors.primaryDark : colors.text, fontWeight: on ? '800' : '600' }}>{o.l}</Text>
              <Text style={{ color: colors.textMuted, ...type.caption }}>{o.s}</Text>
            </Pressable>
          );
        })}
      </Row>
      <Field label="Nombre" value={name} onChangeText={setName} placeholder={isVariable ? 'Comisiones, ventas, trabajos extra…' : 'Salario, mesada, honorarios…'} />
      <Row style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
        <View style={{ flex: 2 }}>
          <Field label={isVariable ? 'Estimado al mes' : 'Monto mensual (bruto)'} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="4.200.000" />
        </View>
        {!isVariable ? (
          <View style={{ flex: 1 }}>
            <Field label="Día que llega" value={day} onChangeText={setDay} keyboardType="numeric" placeholder="1" />
          </View>
        ) : null}
      </Row>
      {err ? <Text style={{ color: colors.danger, marginBottom: 6 }}>{err}</Text> : null}
      <Button title="Agregar" onPress={() => void add()} loading={saving} />
    </Card>
  );
}

const DEDUCTION_LABEL: Record<string, string> = { salud: 'Salud', pension: 'Pensión', otra: 'Otra' };

function SourceCard({ source, presets, onChanged }: { source: IncomeSource; presets: ProfilePresets | null; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const amount = toNumber(source.amount);
  const active = source.deductions.filter((d) => d.isActive);
  // Sugerencia del perfil: solo las que aún no tiene (por tipo).
  const missing = (presets?.items ?? []).filter((p) => !active.some((d) => d.kind === p.kind));

  const addPresets = async () => {
    setAdding(true);
    try {
      for (const p of missing) {
        await incomeApi.createDeduction(source.id, {
          kind: p.kind,
          name: p.name,
          percent: p.percent,
          base: p.baseShare < 1 ? 'parcial' : 'total',
          baseAmount: p.baseShare < 1 ? Math.round(amount * p.baseShare) : undefined,
          withheldAtSource: p.withheldAtSource,
        });
      }
      onChanged();
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card style={{ paddingVertical: 0 }}>
      <Row style={{ paddingVertical: 12, gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{source.name}</Text>
          <Text style={{ color: colors.textMuted, ...type.small }}>{source.dayOfMonth ? `Llega el día ${source.dayOfMonth}` : 'Cada mes'} · bruto</Text>
        </View>
        <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 15 }}>{formatMoney(amount)}</Text>
        <IconButton
          icon="trash-outline"
          label={`Eliminar ${source.name}`}
          onPress={() => confirmRemove(source.name, 'Dejará de contar en tu ingreso.', () => incomeApi.removeSource(source.id).then(onChanged))}
        />
      </Row>

      {active.map((d) => {
        const base = d.base === 'parcial' ? toNumber(d.baseAmount) : amount;
        const value = d.percent != null ? (base * Number(d.percent)) / 100 : toNumber(d.fixedAmount);
        return (
          <Row key={d.id} style={{ paddingVertical: 10, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.surfaceAlt }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                {DEDUCTION_LABEL[d.kind] ?? d.name}{d.percent != null ? ` ${String(d.percent).replace('.', ',')}%` : ''}
              </Text>
              <Text style={{ color: colors.textMuted, ...type.small }} numberOfLines={1}>
                {d.base === 'parcial' ? `sobre ${formatMoney(base)}` : 'sobre el total'} · {d.withheldAtSource ? 'te la descuentan' : 'la pagas tú'}
              </Text>
            </View>
            <Text style={{ color: colors.warningDeep, fontWeight: '800' }}>−{formatMoney(value)}</Text>
            <IconButton
              icon="trash-outline"
              size={18}
              label={`Eliminar ${DEDUCTION_LABEL[d.kind] ?? d.name}`}
              onPress={() => confirmRemove(DEDUCTION_LABEL[d.kind] ?? d.name, 'Tu ingreso neto se recalculará.', () => incomeApi.removeDeduction(d.id).then(onChanged))}
            />
          </Row>
        );
      })}

      {presets && missing.length > 0 && !showForm ? (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.surfaceAlt, paddingVertical: 12 }}>
          <View style={{ backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md }}>
            <Text style={{ color: colors.primaryDark, fontWeight: '800' }}>{presets.intro}:</Text>
            <Text style={{ color: colors.text, marginTop: 4 }}>
              {missing.map((p) => `${p.name} ${String(p.percent).replace('.', ',')}% (${formatMoney((amount * p.baseShare * p.percent) / 100)})`).join(' · ')}
            </Text>
            {presets.note ? <Text style={{ color: colors.textMuted, ...type.small, marginTop: 4 }}>{presets.note}</Text> : null}
            <Row style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              <Pressable
                onPress={() => void addPresets()}
                disabled={adding}
                accessibilityRole="button"
                style={{ backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: 9, paddingHorizontal: 16, opacity: adding ? 0.6 : 1 }}
              >
                <Text style={{ color: colors.textInverse, fontWeight: '800' }}>{adding ? 'Agregando…' : missing.length > 1 ? `Agregar las ${missing.length}` : 'Agregarla'}</Text>
              </Pressable>
              <Pressable onPress={() => setShowForm(true)} accessibilityRole="button" style={{ paddingVertical: 9, paddingHorizontal: 8 }}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Otra deducción</Text>
              </Pressable>
            </Row>
          </View>
        </View>
      ) : showForm ? (
        <DeductionForm sourceId={source.id} onDone={() => { setShowForm(false); onChanged(); }} onCancel={() => setShowForm(false)} />
      ) : (
        <Row style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.surfaceAlt }}>
          <Text style={{ color: colors.textMuted, ...type.small, flex: 1 }}>{active.length === 0 ? 'Deducciones: ninguna' : 'Salud, pensión u otra'}</Text>
          <Pressable onPress={() => setShowForm(true)} accessibilityRole="button">
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>+ Agregar deducción</Text>
          </Pressable>
        </Row>
      )}
    </Card>
  );
}

/** Deducción manual: % sobre base total o parcial; retenida o pagada por la persona. */
function DeductionForm({ sourceId, onDone, onCancel }: { sourceId: string; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [percent, setPercent] = useState('');
  const [base, setBase] = useState<'total' | 'parcial'>('total');
  const [baseAmount, setBaseAmount] = useState('');
  const [withheldAtSource, setWithheldAtSource] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const add = async () => {
    const pct = parseDecimal(percent); // §39: "4,5" y "4.5" son lo mismo
    if (!name.trim() || !pct) return setErr('Escribe el nombre y el porcentaje.');
    setSaving(true);
    setErr(null);
    try {
      await incomeApi.createDeduction(sourceId, {
        name: name.trim(),
        percent: pct,
        base,
        baseAmount: base === 'parcial' ? parseAmount(baseAmount) || undefined : undefined,
        withheldAtSource,
      });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const Toggle = <T,>({ value, set, options }: { value: T; set: (v: T) => void; options: Array<{ v: T; l: string }> }) => (
    <Row style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
      {options.map((o) => {
        const on = value === o.v;
        return (
          <Pressable
            key={String(o.v)}
            onPress={() => set(o.v)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={{ flex: 1, padding: spacing.sm, minHeight: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.primarySoft : colors.surface, borderWidth: on ? 2 : 1, borderColor: on ? colors.primary : colors.border }}
          >
            <Text style={{ color: on ? colors.primaryDark : colors.text, fontSize: 12, fontWeight: on ? '800' : '600', textAlign: 'center' }}>{o.l}</Text>
          </Pressable>
        );
      })}
    </Row>
  );

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.surfaceAlt, paddingVertical: 12 }}>
      <Row style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
        <View style={{ flex: 2 }}>
          <Field label="Nombre" value={name} onChangeText={setName} placeholder="Salud (EPS)" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="%" value={percent} onChangeText={setPercent} keyboardType="numeric" placeholder="4" />
        </View>
      </Row>
      <Toggle value={base} set={setBase} options={[{ v: 'total' as const, l: 'Sobre el total' }, { v: 'parcial' as const, l: 'Sobre una parte' }]} />
      {base === 'parcial' ? (
        <Field label="¿Sobre cuánto?" value={baseAmount} onChangeText={setBaseAmount} keyboardType="numeric" placeholder="2.500.000" />
      ) : null}
      <Toggle value={withheldAtSource} set={setWithheldAtSource} options={[{ v: true, l: 'Te la descuentan' }, { v: false, l: 'La pagas tú' }]} />
      {err ? <Text style={{ color: colors.danger, marginBottom: 6 }}>{err}</Text> : null}
      <Row style={{ gap: spacing.sm }}>
        <View style={{ flex: 1 }}><Button title="Cancelar" variant="secondary" onPress={onCancel} /></View>
        <View style={{ flex: 1 }}><Button title="Agregar" onPress={() => void add()} loading={saving} /></View>
      </Row>
    </View>
  );
}
