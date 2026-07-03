import React, { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Field } from '../../components/ui';
import { colors, spacing } from '../../theme/colors';
import { debtsApi } from '../../api/endpoints';
import { DebtsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DebtsStackParamList, 'AddDebt'>;

export function AddDebtScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [rate, setRate] = useState('');
  const [term, setTerm] = useState('');
  const [paymentDay, setPaymentDay] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = (s: string) => parseFloat(s.replace(/[^\d.]/g, '')) || 0;

  const onSubmit = async () => {
    setError(null);
    const bal = num(balance);
    if (!name || !bal || !num(term)) {
      setError('Completa nombre, saldo y plazo.');
      return;
    }
    setLoading(true);
    try {
      await debtsApi.create({
        name,
        debtType: 'otro',
        originalAmount: bal,
        currentBalance: bal,
        startDate: new Date().toISOString().slice(0, 10),
        termMonths: num(term),
        interestRate: num(rate),
        rateBasis: 'EA',
        paymentDay: paymentDay ? num(paymentDay) : undefined,
      });
      navigation.goBack();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      <Field label="Nombre" value={name} onChangeText={setName} placeholder="Tarjeta Visa, Crédito casa…" />
      <Field label="Saldo pendiente" value={balance} onChangeText={setBalance} keyboardType="numeric" placeholder="3000000" />
      <Field label="Tasa (% EA)" value={rate} onChangeText={setRate} keyboardType="numeric" placeholder="28" />
      <Field label="Plazo (meses)" value={term} onChangeText={setTerm} keyboardType="numeric" placeholder="24" />
      <Field label="Día de pago (opcional)" value={paymentDay} onChangeText={setPaymentDay} keyboardType="numeric" placeholder="5" />

      {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
      <Button title="Guardar deuda" onPress={onSubmit} loading={loading} />
    </ScrollView>
  );
}
