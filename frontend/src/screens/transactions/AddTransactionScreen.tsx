import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Card, Field } from '../../components/ui';
import { colors, radius, spacing } from '../../theme/colors';
import { transactionsApi } from '../../api/endpoints';
import { TxKind } from '../../api/types';

const KINDS: Array<{ key: TxKind; label: string; emoji: string }> = [
  { key: 'gasto', label: 'Gasto', emoji: '🛒' },
  { key: 'ingreso', label: 'Ingreso', emoji: '💵' },
  { key: 'pago_deuda', label: 'Pago deuda', emoji: '💳' },
];

export function AddTransactionScreen() {
  const [kind, setKind] = useState<TxKind>('gasto');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const onSubmit = async () => {
    const value = parseFloat(amount.replace(/[^\d.]/g, '')) || 0;
    if (!value) {
      setFeedback('Ingresa un monto válido.');
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      await transactionsApi.create({
        kind,
        amount: value,
        occurredAt: new Date().toISOString(),
        note: note || undefined,
      });
      setFeedback('✅ Movimiento registrado');
      setAmount('');
      setNote('');
    } catch (e) {
      setFeedback((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: spacing.md }}>
        Registrar movimiento
      </Text>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        {KINDS.map((k) => (
          <Pressable
            key={k.key}
            onPress={() => setKind(k.key)}
            style={{
              flex: 1,
              padding: spacing.md,
              borderRadius: radius.md,
              alignItems: 'center',
              backgroundColor: kind === k.key ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: kind === k.key ? colors.primary : colors.border,
            }}
          >
            <Text style={{ fontSize: 22 }}>{k.emoji}</Text>
            <Text
              style={{
                marginTop: 4,
                fontWeight: '600',
                color: kind === k.key ? colors.textInverse : colors.text,
              }}
            >
              {k.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Field label="Monto" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="45000" />
      <Field label="Nota (opcional)" value={note} onChangeText={setNote} placeholder="almuerzo, arriendo…" />

      {feedback ? (
        <Text
          style={{
            color: feedback.startsWith('✅') ? colors.success : colors.danger,
            marginBottom: 8,
          }}
        >
          {feedback}
        </Text>
      ) : null}

      <Button title="Registrar" onPress={onSubmit} loading={loading} />

      <Card style={{ marginTop: spacing.lg, backgroundColor: '#EAF7F1', borderColor: colors.primaryLight }}>
        <Text style={{ fontWeight: '700', color: colors.primaryDark }}>💬 ¿Sabías que…?</Text>
        <Text style={{ color: colors.text, marginTop: 4 }}>
          También puedes registrar por WhatsApp. Escribe "Gasté $45.000 en almuerzo" a tu número de
          ToCosas y listo. Vincúlalo en Ajustes.
        </Text>
      </Card>
    </ScrollView>
  );
}
