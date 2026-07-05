import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Card, Field, Row } from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';
import { formatMoney } from '../utils/format';
import { SimulationResult, SimulationType } from '../api/types';
import { simulationsApi } from '../api/endpoints';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

const SCENARIOS: Array<{ key: SimulationType; label: string; emoji: string; fields: Array<{ name: string; label: string; placeholder: string }> }> = [
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
    fields: [{ name: 'extraBudget', label: 'Extra mensual para deudas', placeholder: '200000' }],
  },
];

const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

export function SimulatorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    setLoading(true);
    try {
      const params: Record<string, number> = {};
      for (const f of scenario.fields) {
        const v = parseFloat((values[f.name] ?? '').replace(/[^\d.]/g, ''));
        if (!v || v <= 0) throw new Error(`Ingresa un valor válido en "${f.label}"`);
        params[f.name] = v;
      }
      setResult(await simulationsApi.run({ type: scenario.key, ...params }));
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

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
        {SCENARIOS.map((s) => (
          <Pressable
            key={s.key}
            onPress={() => { setScenario(s); setResult(null); setValues({}); }}
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

      {scenario.fields.map((f) => (
        <Field
          key={f.name}
          label={f.label}
          value={values[f.name] ?? ''}
          onChangeText={(t) => setValues((prev) => ({ ...prev, [f.name]: t }))}
          keyboardType="numeric"
          placeholder={f.placeholder}
        />
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

      {result ? <ResultCard result={result} /> : null}
    </ScrollView>
  );
}

function ResultCard({ result }: { result: SimulationResult }) {
  const d = result.delta;
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
      <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: spacing.sm }}>
        📊 Impacto: antes → después
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
      {result.before.band !== result.after.band ? (
        <Text style={{ color: colors.warning, marginTop: 6, fontWeight: '600' }}>
          ⚠️ Tu banda cambiaría: {result.before.band} → {result.after.band}
        </Text>
      ) : null}
      {Object.entries(result.specifics)
        .filter(([, v]) => typeof v === 'number' && v !== 0)
        .slice(0, 4)
        .map(([k, v]) => (
          <Text key={k} style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
            {LABELS[k] ?? k}: {typeof v === 'number' && Math.abs(v) > 1000 ? formatMoney(v) : String(v)}
          </Text>
        ))}
    </Card>
  );
}

const LABELS: Record<string, string> = {
  monthlyPayment: 'Cuota mensual',
  totalInterest: 'Intereses totales',
  interestSaved: 'Intereses ahorrados',
  monthsSaved: 'Meses que te ahorras',
  freedMonthly: 'Liberado al mes',
  freedYearly: 'Liberado al año',
  avalancheInterest: 'Intereses (avalancha)',
  snowballInterest: 'Intereses (bola de nieve)',
  interestDifference: 'Diferencia entre estrategias',
  incomeDelta: 'Cambio de ingreso',
};
