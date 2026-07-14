import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, Field, Row } from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';
import { formatMoney } from '../utils/format';
import { IncomeSource, NetIncomeSummary, WorkProfile, toNumber } from '../api/types';
import { incomeApi } from '../api/endpoints';
import { useApi } from '../utils/useApi';

/**
 * FIN-027 · Mi perfil de ingresos (DEC-0027). El usuario lo configura UNA vez;
 * Milla reutiliza bruto → deducciones → neto en toda la app (§32,
 * `NetIncomeService`). Fijas y variables COEXISTEN (n fuentes); la base de
 * cada deducción es configurable (total o parcial — requisito duro).
 */
const PROFILES: Array<{ key: WorkProfile; label: string; emoji: string }> = [
  { key: 'empleado', label: 'Empleado', emoji: '💼' },
  { key: 'independiente', label: 'Independiente', emoji: '🧑‍💻' },
  { key: 'empresario', label: 'Empresario', emoji: '🏢' },
  { key: 'pensionado', label: 'Pensionado', emoji: '🧓' },
  { key: 'estudiante', label: 'Estudiante', emoji: '🎓' },
  { key: 'otro', label: 'Otro', emoji: '➕' },
];

export function IncomeProfileScreen() {
  const profile = useApi(() => incomeApi.getProfile(), []);
  const sources = useApi(() => incomeApi.listSources(), []);
  const summary = useApi(() => incomeApi.summary(), []);

  const refresh = React.useCallback(() => {
    void profile.reload();
    void sources.reload();
    void summary.reload();
  }, [profile.reload, sources.reload, summary.reload]);

  useFocusEffect(React.useCallback(() => refresh(), [refresh]));

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.sm, fontSize: 13 }}>
        Configúralo una vez — Millo calcula tu ingreso neto disponible automáticamente en
        toda la app, sin que repitas cálculos cada mes.
      </Text>

      <NetSummaryCard summary={summary.data} />

      <Card>
        <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: spacing.sm }}>¿De qué vives?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {PROFILES.map((p) => (
            <Pressable
              key={p.key}
              onPress={() => void incomeApi.setProfile(p.key).then(refresh)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: radius.full,
                backgroundColor: profile.data?.workProfile === p.key ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: profile.data?.workProfile === p.key ? colors.primary : colors.border,
              }}
            >
              <Text style={{ color: profile.data?.workProfile === p.key ? colors.textInverse : colors.text, fontSize: 13 }}>
                {p.emoji} {p.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <NewSourceForm onSaved={refresh} />

      {(sources.data ?? []).map((s) => (
        <SourceCard key={s.id} source={s} onChanged={refresh} />
      ))}
    </ScrollView>
  );
}

function NetSummaryCard({ summary }: { summary: NetIncomeSummary | null }) {
  if (!summary || (summary.grossFixedTotal === 0 && summary.grossVariableEstimate === 0)) {
    return (
      <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
        <Text style={{ color: colors.textInverse, opacity: 0.9 }}>
          Aún no registras tus fuentes de ingreso — agrégalas abajo.
        </Text>
      </Card>
    );
  }
  return (
    <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
      <Text style={{ color: colors.textInverse, opacity: 0.85 }}>Tu ingreso neto disponible</Text>
      <Text style={{ color: colors.textInverse, fontSize: 30, fontWeight: '800' }}>
        {formatMoney(summary.netMonthlyEstimate)}
      </Text>
      {summary.hasDeductions ? (
        <Text style={{ color: colors.textInverse, opacity: 0.85, marginTop: 4, fontSize: 13 }}>
          Ya descontamos tus deducciones — este es lo que de verdad puedes usar.
        </Text>
      ) : null}
      {summary.grossVariableEstimate > 0 ? (
        <Text style={{ color: colors.textInverse, opacity: 0.7, marginTop: 2, fontSize: 12 }}>
          Incluye ~{formatMoney(summary.grossVariableEstimate)} estimados de fuentes variables.
        </Text>
      ) : null}
    </Card>
  );
}

function NewSourceForm({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [isVariable, setIsVariable] = useState(false);
  const [saving, setSaving] = useState(false);

  const add = async () => {
    const value = parseFloat(amount.replace(/[^\d.]/g, ''));
    if (!name.trim() || !value) return;
    setSaving(true);
    try {
      await incomeApi.createSource({ name: name.trim(), amount: value, isVariable });
      setName('');
      setAmount('');
      setIsVariable(false);
      setOpen(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <Pressable onPress={() => setOpen((v) => !v)}>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>
          ➕ Nueva fuente de ingreso {open ? '' : '(fija o variable) →'}
        </Text>
      </Pressable>
      {open ? (
        <View style={{ marginTop: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            {[
              { v: false, label: 'Fija (monto estable)' },
              { v: true, label: 'Variable (varía cada mes)' },
            ].map((opt) => (
              <Pressable
                key={String(opt.v)}
                onPress={() => setIsVariable(opt.v)}
                style={{
                  flex: 1,
                  padding: spacing.sm,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  backgroundColor: isVariable === opt.v ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: isVariable === opt.v ? colors.primary : colors.border,
                }}
              >
                <Text style={{ color: isVariable === opt.v ? colors.textInverse : colors.text, fontSize: 12 }}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Field label="Nombre" value={name} onChangeText={setName} placeholder="Salario, comisiones, honorarios…" />
          <Field
            label={isVariable ? 'Monto mensual ESTIMADO' : 'Monto mensual'}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="4200000"
          />
          <Button title="Agregar" onPress={() => void add()} loading={saving} />
        </View>
      ) : null}
    </Card>
  );
}

const DEDUCTION_LABEL: Record<string, string> = { salud: 'Salud', pension: 'Pensión', otra: 'Otra' };

function SourceCard({ source, onChanged }: { source: IncomeSource; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [percent, setPercent] = useState('');
  const [base, setBase] = useState<'total' | 'parcial'>('total');
  const [baseAmount, setBaseAmount] = useState('');
  const [withheldAtSource, setWithheldAtSource] = useState(true);
  const [saving, setSaving] = useState(false);

  const addDeduction = async () => {
    const pct = parseFloat(percent.replace(/[^\d.]/g, ''));
    if (!name.trim() || !pct) return;
    setSaving(true);
    try {
      await incomeApi.createDeduction(source.id, {
        name: name.trim(),
        percent: pct,
        base,
        baseAmount: base === 'parcial' ? parseFloat(baseAmount.replace(/[^\d.]/g, '')) || undefined : undefined,
        withheldAtSource,
      });
      setName('');
      setPercent('');
      setBaseAmount('');
      setShowForm(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: colors.text }}>{source.name}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {source.isVariable ? 'Variable (estimado)' : 'Fija'}
          </Text>
        </View>
        <Text style={{ fontWeight: '700', color: colors.success }}>{formatMoney(toNumber(source.amount))}</Text>
        <Pressable
          onPress={() => void incomeApi.removeSource(source.id).then(onChanged)}
          style={{ marginLeft: spacing.sm }}
        >
          <Text style={{ fontSize: 16 }}>🗑️</Text>
        </Pressable>
      </Row>

      {source.deductions.map((d) => (
        <Row key={d.id} style={{ justifyContent: 'space-between', marginTop: spacing.sm, opacity: d.isActive ? 1 : 0.5 }}>
          <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>
            {DEDUCTION_LABEL[d.kind] ?? d.name} · {d.base === 'parcial' ? 'base parcial' : 'base total'} ·{' '}
            {d.withheldAtSource ? 'retenida' : 'la pagas tú'}
          </Text>
          <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 13 }}>
            {d.percent != null ? `${d.percent}%` : formatMoney(toNumber(d.fixedAmount))}
          </Text>
          <Pressable onPress={() => void incomeApi.removeDeduction(d.id).then(onChanged)} style={{ marginLeft: spacing.sm }}>
            <Text style={{ fontSize: 14 }}>🗑️</Text>
          </Pressable>
        </Row>
      ))}

      {!source.isVariable ? (
        showForm ? (
          <View style={{ marginTop: spacing.sm }}>
            <Field label="Nombre" value={name} onChangeText={setName} placeholder="Salud (EPS)" />
            <Field label="% de la base" value={percent} onChangeText={setPercent} keyboardType="numeric" placeholder="4" />
            <Row style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
              {[
                { v: 'total' as const, label: 'Base total' },
                { v: 'parcial' as const, label: 'Base parcial' },
              ].map((opt) => (
                <Pressable
                  key={opt.v}
                  onPress={() => setBase(opt.v)}
                  style={{
                    flex: 1,
                    padding: spacing.sm,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    backgroundColor: base === opt.v ? colors.primary : colors.surface,
                    borderWidth: 1,
                    borderColor: base === opt.v ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ color: base === opt.v ? colors.textInverse : colors.text, fontSize: 12 }}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </Row>
            {base === 'parcial' ? (
              <Field
                label="Monto de la base parcial"
                value={baseAmount}
                onChangeText={setBaseAmount}
                keyboardType="numeric"
                placeholder="2500000"
              />
            ) : null}
            <Row style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
              {[
                { v: true, label: 'Retenida (no sale de tu bolsillo)' },
                { v: false, label: 'La pagas tú (compromiso del ciclo)' },
              ].map((opt) => (
                <Pressable
                  key={String(opt.v)}
                  onPress={() => setWithheldAtSource(opt.v)}
                  style={{
                    flex: 1,
                    padding: spacing.sm,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    backgroundColor: withheldAtSource === opt.v ? colors.primary : colors.surface,
                    borderWidth: 1,
                    borderColor: withheldAtSource === opt.v ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ color: withheldAtSource === opt.v ? colors.textInverse : colors.text, fontSize: 11 }}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </Row>
            <Button title="Agregar deducción" onPress={() => void addDeduction()} loading={saving} />
          </View>
        ) : (
          <Pressable onPress={() => setShowForm(true)} style={{ marginTop: spacing.sm }}>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
              ➕ Agregar deducción (salud, pensión…) →
            </Text>
          </Pressable>
        )
      ) : null}
    </Card>
  );
}
