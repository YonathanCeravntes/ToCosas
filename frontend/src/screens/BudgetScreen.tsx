import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Button, Card, Field, Row } from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';
import { formatMoney } from '../utils/format';
import { FixedKind, MonthlyBudget, toNumber } from '../api/types';
import { budgetApi } from '../api/endpoints';
import { useApi } from '../utils/useApi';

const KINDS: Array<{ key: FixedKind; label: string; emoji: string }> = [
  { key: 'gasto', label: 'Gasto fijo', emoji: '🏠' },
  { key: 'ingreso', label: 'Ingreso fijo', emoji: '💵' },
];

export function BudgetScreen() {
  const { data, loading, reload } = useApi(() => budgetApi.monthly(), []);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [kind, setKind] = useState<FixedKind>('gasto');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onAdd = async () => {
    const value = parseFloat(amount.replace(/[^\d.]/g, '')) || 0;
    if (!name.trim() || !value) return;
    setSaving(true);
    try {
      await budgetApi.createFixed({
        kind,
        name: name.trim(),
        amount: value,
        dayOfMonth: day ? Math.min(31, Math.max(1, parseInt(day, 10))) : undefined,
      });
      setName('');
      setAmount('');
      setDay('');
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const onRemove = async (id: string) => {
    await budgetApi.removeFixed(id);
    await reload();
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      {/* Tarjeta principal: disponible */}
      <BudgetHeader data={data} loading={loading} />

      <Button
        title="🏦 Cuentas y patrimonio"
        variant="secondary"
        onPress={() => navigation.navigate('Accounts')}
      />

      {/* Alta de compromiso fijo */}
      <Card>
        <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: spacing.sm }}>
          ➕ Nuevo compromiso fijo
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          {KINDS.map((k) => (
            <Pressable
              key={k.key}
              onPress={() => setKind(k.key)}
              style={{
                flex: 1,
                padding: spacing.sm,
                borderRadius: radius.md,
                alignItems: 'center',
                backgroundColor: kind === k.key ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: kind === k.key ? colors.primary : colors.border,
              }}
            >
              <Text style={{ fontSize: 18 }}>{k.emoji}</Text>
              <Text
                style={{
                  marginTop: 2,
                  fontSize: 12,
                  fontWeight: '600',
                  color: kind === k.key ? colors.textInverse : colors.text,
                }}
              >
                {k.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Field label="Nombre" value={name} onChangeText={setName} placeholder="Arriendo, salario…" />
        <Field label="Monto mensual" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="1200000" />
        <Field label="Día del mes (opcional)" value={day} onChangeText={setDay} keyboardType="numeric" placeholder="5" />
        <Button title="Agregar" onPress={onAdd} loading={saving} />
      </Card>

      {/* Listas */}
      {data ? (
        <>
          <FixedList
            title="💵 Ingresos fijos"
            items={data.incomes}
            color={colors.success}
            onRemove={onRemove}
          />
          <FixedList
            title="🏠 Gastos fijos"
            items={data.expenses}
            color={colors.danger}
            onRemove={onRemove}
          />
          {data.debts.length > 0 ? (
            <Card>
              <Text style={{ fontWeight: '700', marginBottom: spacing.sm }}>
                💳 Cuotas de deuda (inflexibles)
              </Text>
              {data.debts.map((d) => (
                <Row key={d.debtId} style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: colors.text }}>{d.name}</Text>
                  <Text style={{ fontWeight: '700', color: colors.warning }}>
                    {formatMoney(d.amount)}
                  </Text>
                </Row>
              ))}
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                Se calculan automáticamente desde tus deudas.
              </Text>
            </Card>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

function BudgetHeader({ data, loading }: { data: MonthlyBudget | null; loading: boolean }) {
  if (!data) {
    return (
      <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
        <Text style={{ color: colors.textInverse, opacity: 0.9 }}>
          {loading ? 'Calculando tu presupuesto…' : 'Sin datos'}
        </Text>
      </Card>
    );
  }
  const negative = data.available < 0;
  const ratio = Math.min(100, Math.max(0, data.committedRatio));
  return (
    <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
      <Text style={{ color: colors.textInverse, opacity: 0.85 }}>
        Te queda este ciclo{data.period ? ` · ${data.period.label}` : ''}
      </Text>
      <Text style={{ color: negative ? colors.accent : colors.textInverse, fontSize: 34, fontWeight: '800' }}>
        {formatMoney(data.available)}
      </Text>
      <Text style={{ color: colors.textInverse, opacity: 0.8, marginBottom: spacing.sm }}>
        {data.committedRatio}% de tu ingreso está comprometido
      </Text>
      {/* Barra de comprometido */}
      <View style={{ height: 8, borderRadius: 4, backgroundColor: '#ffffff33', overflow: 'hidden' }}>
        <View style={{ width: `${ratio}%`, height: 8, backgroundColor: colors.accent }} />
      </View>
      <View style={{ marginTop: spacing.md, gap: 4 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: colors.textInverse, opacity: 0.85 }}>Ingresos fijos</Text>
          <Text style={{ color: colors.textInverse, fontWeight: '700' }}>{formatMoney(data.fixedIncome)}</Text>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: colors.textInverse, opacity: 0.85 }}>− Gastos fijos</Text>
          <Text style={{ color: colors.textInverse, fontWeight: '700' }}>{formatMoney(data.fixedExpense)}</Text>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: colors.textInverse, opacity: 0.85 }}>− Cuotas de deuda</Text>
          <Text style={{ color: colors.textInverse, fontWeight: '700' }}>{formatMoney(data.debtPayments)}</Text>
        </Row>
      </View>
    </Card>
  );
}

function FixedList({
  title,
  items,
  color,
  onRemove,
}: {
  title: string;
  items: Array<{ id: string; name: string; amount: number; dayOfMonth: number | null }>;
  color: string;
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <Card>
      <Text style={{ fontWeight: '700', marginBottom: spacing.sm }}>{title}</Text>
      {items.map((i) => (
        <Row key={i.id} style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text }}>{i.name}</Text>
            {i.dayOfMonth ? (
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Día {i.dayOfMonth}</Text>
            ) : null}
          </View>
          <Text style={{ fontWeight: '700', color }}>{formatMoney(toNumber(i.amount))}</Text>
          <Pressable onPress={() => onRemove(i.id)} style={{ marginLeft: spacing.md }}>
            <Text style={{ color: colors.textMuted, fontSize: 18 }}>🗑️</Text>
          </Pressable>
        </Row>
      ))}
    </Card>
  );
}
