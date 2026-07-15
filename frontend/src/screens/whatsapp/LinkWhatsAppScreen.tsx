import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Field } from '../../components/ui';
import { colors, radius, spacing } from '../../theme/colors';
import { whatsappApi } from '../../api/endpoints';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LinkWhatsApp'>;

export function LinkWhatsAppScreen(_props: Props) {
  const [phone, setPhone] = useState('+57');
  const [otp, setOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onStart = async () => {
    setError(null);
    if (!/^\+\d{8,15}$/.test(phone)) {
      setError('Escribe tu número en formato internacional, ej: +573001112222');
      return;
    }
    setLoading(true);
    try {
      const res = await whatsappApi.startLink(phone);
      setOtp(res.otp);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.primary }}>
        Registra por WhatsApp 💬
      </Text>
      <Text style={{ color: colors.textMuted, marginTop: 6, marginBottom: spacing.lg, lineHeight: 20 }}>
        Vincula tu número y podrás registrar gastos escribiendo mensajes normales, como
        "Pagué $250.000 al crédito de Bancolombia".
      </Text>

      <Field
        label="Tu número de WhatsApp"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+573001112222"
      />
      {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
      <Button title="Generar código" onPress={onStart} loading={loading} />

      {otp ? (
        <Card style={{ marginTop: spacing.lg, alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted }}>Tu código de vinculación</Text>
          <View
            style={{
              backgroundColor: colors.bg,
              borderRadius: radius.md,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.xl,
              marginVertical: spacing.md,
            }}
          >
            <Text style={{ fontSize: 34, fontWeight: '800', letterSpacing: 8, color: colors.primary }}>
              {otp}
            </Text>
          </View>
          <Text style={{ color: colors.text, textAlign: 'center', lineHeight: 20 }}>
            Abre WhatsApp y envía este código a tu número de ToCosas. Vence en 10 minutos.
          </Text>
        </Card>
      ) : null}
    </ScrollView>
  );
}
