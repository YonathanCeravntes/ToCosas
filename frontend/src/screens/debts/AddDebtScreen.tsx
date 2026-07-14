import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Field } from '../../components/ui';
import { colors, radius, spacing } from '../../theme/colors';
import { debtsApi } from '../../api/endpoints';
import { parseDecimal, parseAmount } from '../../utils/format';
import { DebtsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DebtsStackParamList, 'AddDebt'>;

export function AddDebtScreen({ navigation }: Props) {
  const [isCard, setIsCard] = useState(false);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
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
    // FIN-031: en una tarjeta el saldo real se DERIVA de sus compras; al crearla
    // arranca en 0 y lo que importa es el cupo. En una deuda normal, el saldo.
    const bal = amt(balance);
    const cupo = amt(creditLimit);
    if (!name) {
      setError('Ponle un nombre.');
      return;
    }
    if (isCard ? !cupo : !bal || !amt(term)) {
      setError(isCard ? 'Falta el cupo de la tarjeta.' : 'Completa saldo y plazo.');
      return;
    }
    const rateVal = parseDecimal(rate);
    setLoading(true);
    try {
      await debtsApi.create({
        name,
        debtType: isCard ? 'tarjeta_credito' : 'otro',
        originalAmount: isCard ? 0 : bal,
        currentBalance: isCard ? 0 : bal,
        startDate: new Date().toISOString().slice(0, 10),
        termMonths: isCard ? 24 : amt(term),
        interestRate: Number.isNaN(rateVal) ? 0 : rateVal,
        rateBasis: 'EA',
        paymentDay: paymentDay ? amt(paymentDay) : undefined,
        creditLimit: isCard ? cupo : undefined,
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
      {/* FIN-031: la tarjeta de crédito es un producto distinto — cupo, no saldo fijo. */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        {[
          { v: false, label: 'Crédito / préstamo' },
          { v: true, label: '💳 Tarjeta de crédito' },
        ].map((opt) => (
          <Pressable
            key={String(opt.v)}
            onPress={() => setIsCard(opt.v)}
            style={{
              flex: 1,
              padding: spacing.sm,
              borderRadius: radius.md,
              alignItems: 'center',
              backgroundColor: isCard === opt.v ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: isCard === opt.v ? colors.primary : colors.border,
            }}
          >
            <Text style={{ color: isCard === opt.v ? colors.textInverse : colors.text, fontSize: 13 }}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>

      <Field label="Nombre" value={name} onChangeText={setName} placeholder={isCard ? 'Visa, Mastercard…' : 'Crédito casa, libranza…'} />
      {isCard ? (
        <Field label="Cupo total" value={creditLimit} onChangeText={setCreditLimit} keyboardType="numeric" placeholder="3000000" />
      ) : (
        <>
          <Field label="Saldo pendiente" value={balance} onChangeText={setBalance} keyboardType="numeric" placeholder="3000000" />
          <Field label="Plazo (meses)" value={term} onChangeText={setTerm} keyboardType="numeric" placeholder="24" />
        </>
      )}
      <Field label="Tasa (% EA)" value={rate} onChangeText={setRate} keyboardType="numeric" placeholder="28" />
      <Field label="Día de pago (opcional)" value={paymentDay} onChangeText={setPaymentDay} keyboardType="numeric" placeholder="5" />

      {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
      <Button title={isCard ? 'Guardar tarjeta' : 'Guardar deuda'} onPress={onSubmit} loading={loading} />
    </ScrollView>
  );
}
