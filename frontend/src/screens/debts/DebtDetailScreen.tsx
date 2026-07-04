import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Field, Row } from '../../components/ui';
import { colors, spacing } from '../../theme/colors';
import { formatDate, formatMoney } from '../../utils/format';
import { toNumber } from '../../api/types';
import { debtsApi, SimulateResult } from '../../api/endpoints';
import { useApi } from '../../utils/useApi';
import { DebtsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DebtsStackParamList, 'DebtDetail'>;

export function DebtDetailScreen({ route }: Props) {
  const { debtId } = route.params;
  const { data, loading } = useApi(() => debtsApi.get(debtId), [debtId]);
  const [extra, setExtra] = useState('');
  const [sim, setSim] = useState<SimulateResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  const runSim = async () => {
    const value = parseFloat(extra.replace(/\D/g, ''));
    if (!value) return;
    setSimLoading(true);
    try {
      setSim(await debtsApi.simulateExtra(debtId, value));
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

      {/* Datos del crédito: plazo, inicio y fin */}
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: colors.textMuted }}>Plazo</Text>
          <Text style={{ fontWeight: '700' }}>{amort.length} cuotas</Text>
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ color: colors.textMuted }}>Inicio</Text>
          <Text style={{ fontWeight: '700' }}>{formatDate(data.startDate)}</Text>
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ color: colors.textMuted }}>Terminas de pagar</Text>
          <Text style={{ fontWeight: '700', color: colors.primary }}>
            {amort.length ? formatDate(amort[amort.length - 1].dueDate) : '—'}
          </Text>
        </Row>
      </Card>

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
            {/* Antes vs. después para que los números tengan contexto */}
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Sin abono extra</Text>
                <Text style={{ fontWeight: '700' }}>{sim.baseline.months} cuotas</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {formatDate(sim.baseline.payoffDate)}
                </Text>
              </View>
              <Text style={{ fontSize: 18, marginHorizontal: 8 }}>→</Text>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Con tu abono</Text>
                <Text style={{ fontWeight: '700', color: colors.primary }}>
                  {sim.withExtra.months} cuotas
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {formatDate(sim.withExtra.payoffDate)}
                </Text>
              </View>
            </Row>
            <View
              style={{
                backgroundColor: '#EAF7F1',
                borderRadius: 10,
                padding: spacing.md,
                marginTop: spacing.md,
              }}
            >
              <Text style={{ color: colors.primaryDark, fontWeight: '700' }}>
                🎉 Te ahorras {sim.monthsSaved} cuotas y {formatMoney(sim.interestSaved)} en intereses.
              </Text>
            </View>
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
