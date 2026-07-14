import React, { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Field } from '../../components/ui';
import { colors, spacing } from '../../theme/colors';
import { debtsApi } from '../../api/endpoints';
import { parseDecimal, parseAmount } from '../../utils/format';
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

  // BT-001: montos en COP → entero (descarta miles); tasa → decimal regional
  // ("15,35"/"15.35"). Antes un solo helper borraba la coma y "15,35" viajaba
  // como 1535 → desbordaba Decimal(7,4) en el backend → 500.
  const amt = (s: string) => { const n = parseAmount(s); return Number.isNaN(n) ? 0 : n; };

  const onSubmit = async () => {
    setError(null);
    const bal = amt(balance);
    if (!name || !bal || !amt(term)) {
      setError('Completa nombre, saldo y plazo.');
      return;
    }
    const rateVal = parseDecimal(rate);
    setLoading(true);
    try {
      await debtsApi.create({
        name,
        debtType: 'otro',
        originalAmount: bal,
        currentBalance: bal,
        startDate: new Date().toISOString().slice(0, 10),
        termMonths: amt(term),
        interestRate: Number.isNaN(rateVal) ? 0 : rateVal,
        rateBasis: 'EA',
        paymentDay: paymentDay ? amt(paymentDay) : undefined,
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
