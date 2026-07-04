import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Button, Field } from '../../components/ui';
import { colors, radius, spacing } from '../../theme/colors';
import { debtsApi } from '../../api/endpoints';
import { formatDate } from '../../utils/format';
import { DebtsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DebtsStackParamList, 'AddDebt'>;

export function AddDebtScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [rate, setRate] = useState('');
  const [term, setTerm] = useState('');
  const [paymentDay, setPaymentDay] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = (s: string) => parseFloat(s.replace(/[^\d.]/g, '')) || 0;

  // Estimación local del mes/año de finalización (solo informativa).
  const payoffEstimate = (() => {
    const months = num(term);
    if (!months) return null;
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + months);
    return d;
  })();

  const onChangeDate = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setShowPicker(false);
    if (event.type === 'set' && selected) setStartDate(selected);
  };

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
        startDate: startDate.toISOString().slice(0, 10),
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

      {/* Fecha de inicio del crédito */}
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6 }}>
        Fecha de inicio del crédito
      </Text>
      <Pressable
        onPress={() => setShowPicker(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: 12,
          marginBottom: spacing.md,
        }}
      >
        <Text style={{ fontSize: 16, color: colors.text }}>📅 {formatDate(startDate)}</Text>
        <Text style={{ color: colors.primary, fontWeight: '600' }}>Cambiar</Text>
      </Pressable>

      {showPicker ? (
        <View style={{ marginBottom: spacing.md }}>
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={onChangeDate}
            locale="es-CO"
          />
          {Platform.OS === 'ios' ? (
            <Button title="Listo" variant="secondary" onPress={() => setShowPicker(false)} />
          ) : null}
        </View>
      ) : null}

      <Field label="Día de pago (opcional)" value={paymentDay} onChangeText={setPaymentDay} keyboardType="numeric" placeholder="5" />

      {/* Vista previa de finalización */}
      {payoffEstimate ? (
        <View
          style={{
            backgroundColor: '#EAF7F1',
            borderRadius: radius.md,
            padding: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          <Text style={{ color: colors.primaryDark }}>
            🏁 Con {num(term)} cuotas desde esa fecha, terminarías de pagar aprox. en{' '}
            <Text style={{ fontWeight: '800' }}>{formatDate(payoffEstimate)}</Text>.
          </Text>
        </View>
      ) : null}

      {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
      <Button title="Guardar deuda" onPress={onSubmit} loading={loading} />
    </ScrollView>
  );
}
