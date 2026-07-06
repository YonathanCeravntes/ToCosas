import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Field, Row } from '../../components/ui';
import { colors, radius, spacing } from '../../theme/colors';
import { formatDate, formatMoney } from '../../utils/format';
import { DebtInsurance, PaymentBreakdown, toNumber } from '../../api/types';
import { debtsApi, simulationsApi, SimulateResult } from '../../api/endpoints';
import { useApi } from '../../utils/useApi';
import { DebtsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DebtsStackParamList, 'DebtDetail'>;

export function DebtDetailScreen({ route }: Props) {
  const { debtId } = route.params;
  const { data, loading, reload } = useApi(() => debtsApi.get(debtId), [debtId]);
  const [extra, setExtra] = useState('');
  const [sim, setSim] = useState<SimulateResult | null>(null);
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  const runSim = async () => {
    const value = parseFloat(extra.replace(/\D/g, ''));
    if (!value) return;
    setSimLoading(true);
    try {
      setSim(await debtsApi.simulateExtra(debtId, value));
      // FIN-007: impacto en el Score vía el simulador unificado.
      const impact = await simulationsApi
        .run({ type: 'abono_extra', debtId, extraMonthly: value })
        .catch(() => null);
      setScoreDelta(impact ? impact.delta.score : null);
    } finally {
      setSimLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <ScrollView style={{ backgroundColor: colors.bg, padding: spacing.md }}>
        <Text style={{ color: colors.textMuted }}>Cargando…</Text>
      </ScrollView>
    );
  }

  const amort = data.amortization ?? [];

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
        <Text style={{ color: colors.textInverse, opacity: 0.8 }}>Saldo pendiente</Text>
        <Text style={{ color: colors.textInverse, fontSize: 30, fontWeight: '800' }}>
          {formatMoney(toNumber(data.currentBalance))}
        </Text>
        <Text style={{ color: colors.textInverse, opacity: 0.85, marginTop: 4 }}>
          Cuota mensual {formatMoney(toNumber(data.monthlyPayment))}
        </Text>
      </Card>

      {/* Resumen del crédito: cuándo termina, intereses y total a pagar */}
      {data.projection ? (
        <Card>
          <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: spacing.sm }}>
            📅 Resumen del crédito
          </Text>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textMuted }}>Terminas de pagar</Text>
            <Text style={{ fontWeight: '800', color: colors.text }}>
              {data.projection.payoffDate ? formatDate(data.projection.payoffDate) : '—'}
            </Text>
          </Row>
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ color: colors.textMuted }}>Cuotas restantes</Text>
            <Text style={{ fontWeight: '700', color: colors.text }}>
              {data.projection.numberOfPayments}
            </Text>
          </Row>
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ color: colors.textMuted }}>Total en intereses</Text>
            <Text style={{ fontWeight: '800', color: colors.danger }}>
              {formatMoney(data.projection.totalInterest)}
            </Text>
          </Row>
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ color: colors.textMuted }}>Total a pagar</Text>
            <Text style={{ fontWeight: '800', color: colors.text }}>
              {formatMoney(data.projection.totalPaid)}
            </Text>
          </Row>
        </Card>
      ) : null}

      {/* FIN-013: seguros del crédito y desglose de cuota real */}
      <InsuranceSection
        debtId={debtId}
        insurances={data.insurances ?? []}
        breakdown={data.paymentBreakdown}
        onChanged={() => void reload()}
      />

      {/* Simulador de abono extra */}
      <Card>
        <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: spacing.sm }}>
          💡 Simulador de abono extra
        </Text>
        <Field
          label="¿Cuánto extra al mes?"
          value={extra}
          onChangeText={setExtra}
          keyboardType="numeric"
          placeholder="100000"
        />
        <Button title="Calcular ahorro" onPress={runSim} loading={simLoading} />
        {sim ? (
          <View style={{ marginTop: spacing.md }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textMuted }}>Ahorro en intereses</Text>
              <Text style={{ fontWeight: '800', color: colors.success }}>
                {formatMoney(sim.interestSaved)}
              </Text>
            </Row>
            <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ color: colors.textMuted }}>Meses que te ahorras</Text>
              <Text style={{ fontWeight: '800', color: colors.primary }}>{sim.monthsSaved}</Text>
            </Row>
            <Text style={{ color: colors.textMuted, marginTop: 4 }}>
              Nueva liquidación: {formatDate(sim.withExtra.payoffDate)}
            </Text>
            {scoreDelta !== null ? (
              <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ color: colors.textMuted }}>Impacto en tu Score</Text>
                <Text style={{ fontWeight: '800', color: scoreDelta >= 0 ? colors.success : colors.danger }}>
                  {scoreDelta >= 0 ? '+' : ''}{scoreDelta} pts
                </Text>
              </Row>
            ) : null}
          </View>
        ) : null}
      </Card>

      {/* Tabla de amortización (primeras cuotas) */}
      <Text style={{ fontSize: 16, fontWeight: '700', marginVertical: spacing.sm }}>
        Plan de pago
      </Text>
      {amort.slice(0, 12).map((e) => (
        <Card key={e.periodNo} style={{ paddingVertical: spacing.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '600' }}>#{e.periodNo} · {formatDate(e.dueDate)}</Text>
            <Text style={{ fontWeight: '700' }}>{formatMoney(toNumber(e.payment))}</Text>
          </Row>
          <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              Capital {formatMoney(toNumber(e.principalPart))}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              Interés {formatMoney(toNumber(e.interestPart))}
            </Text>
          </Row>
        </Card>
      ))}
      {amort.length > 12 ? (
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg }}>
          … y {amort.length - 12} cuotas más
        </Text>
      ) : null}
    </ScrollView>
  );
}

const INSURANCE_KIND_LABEL: Record<string, string> = {
  vida_deudor: 'Vida deudor',
  incendio_terremoto: 'Incendio/terremoto',
  todo_riesgo: 'Todo riesgo',
  desempleo: 'Desempleo',
  otro: 'Otro',
};

function InsuranceSection({
  debtId,
  insurances,
  breakdown,
  onChanged,
}: {
  debtId: string;
  insurances: DebtInsurance[];
  breakdown?: PaymentBreakdown;
  onChanged: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [premium, setPremium] = useState('');
  const [financed, setFinanced] = useState(true);
  const [saving, setSaving] = useState(false);

  const add = async () => {
    const value = parseFloat(premium.replace(/\D/g, ''));
    if (!name.trim() || !value) return;
    setSaving(true);
    try {
      await debtsApi.createInsurance(debtId, {
        name: name.trim(),
        monthlyPremium: value,
        financed,
      });
      setName('');
      setPremium('');
      setShowForm(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (ins: DebtInsurance) => {
    await debtsApi.updateInsurance(ins.id, { active: !ins.active });
    onChanged();
  };

  const remove = async (ins: DebtInsurance) => {
    await debtsApi.removeInsurance(ins.id);
    onChanged();
  };

  return (
    <Card>
      <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: spacing.sm }}>
        🛡️ Seguros del crédito
      </Text>

      {breakdown && breakdown.insuranceMonthlyTotal > 0 ? (
        <View style={{ marginBottom: spacing.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textMuted }}>Cuota del crédito</Text>
            <Text style={{ color: colors.text }}>{formatMoney(breakdown.basePayment)}</Text>
          </Row>
          {breakdown.insuranceFinanced > 0 ? (
            <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ color: colors.textMuted }}>Seguros dentro de la cuota</Text>
              <Text style={{ color: colors.textMuted }}>{formatMoney(breakdown.insuranceFinanced)}</Text>
            </Row>
          ) : null}
          {breakdown.insuranceSeparate > 0 ? (
            <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ color: colors.textMuted }}>+ Seguros aparte</Text>
              <Text style={{ color: colors.text }}>{formatMoney(breakdown.insuranceSeparate)}</Text>
            </Row>
          ) : null}
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>Desembolso mensual real</Text>
            <Text style={{ fontWeight: '800', color: colors.text }}>
              {formatMoney(breakdown.totalMonthlyOutlay)}
            </Text>
          </Row>
        </View>
      ) : null}

      {insurances.map((ins) => (
        <Row key={ins.id} style={{ justifyContent: 'space-between', marginBottom: 6, opacity: ins.active ? 1 : 0.45 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{ins.name}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              {INSURANCE_KIND_LABEL[ins.kind] ?? ins.kind} · {ins.financed ? 'en la cuota' : 'aparte'}
              {ins.endorsed ? ' · endosado' : ''}
              {!ins.active ? ' · inactivo' : ''}
            </Text>
          </View>
          <Text style={{ fontWeight: '700', color: colors.text, marginRight: spacing.sm }}>
            {formatMoney(toNumber(ins.monthlyPremium))}
          </Text>
          <Pressable onPress={() => void toggleActive(ins)} style={{ marginRight: spacing.sm }}>
            <Text style={{ fontSize: 16 }}>{ins.active ? '⏸️' : '▶️'}</Text>
          </Pressable>
          <Pressable onPress={() => void remove(ins)}>
            <Text style={{ color: colors.textMuted, fontSize: 16 }}>🗑️</Text>
          </Pressable>
        </Row>
      ))}

      {insurances.length === 0 && !showForm ? (
        <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm }}>
          Registra los seguros del crédito (vida, incendio…) para ver tu cuota real. Si aportas tu
          propia póliza (endoso), aquí ves cuánto te ahorras.
        </Text>
      ) : null}

      {showForm ? (
        <View style={{ marginTop: spacing.sm }}>
          <Field label="Nombre del seguro" value={name} onChangeText={setName} placeholder="Seguro de vida deudor" />
          <Field
            label="Prima mensual"
            value={premium}
            onChangeText={setPremium}
            keyboardType="numeric"
            placeholder="45000"
          />
          <Row style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
            {[
              { v: true, label: 'Va dentro de la cuota' },
              { v: false, label: 'Se paga aparte' },
            ].map((opt) => (
              <Pressable
                key={String(opt.v)}
                onPress={() => setFinanced(opt.v)}
                style={{
                  flex: 1,
                  padding: spacing.sm,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  backgroundColor: financed === opt.v ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: financed === opt.v ? colors.primary : colors.border,
                }}
              >
                <Text style={{ color: financed === opt.v ? colors.textInverse : colors.text, fontSize: 12 }}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </Row>
          <Button title="Guardar seguro" onPress={() => void add()} loading={saving} />
        </View>
      ) : (
        <Button title="➕ Agregar seguro" variant="secondary" onPress={() => setShowForm(true)} />
      )}
    </Card>
  );
}
