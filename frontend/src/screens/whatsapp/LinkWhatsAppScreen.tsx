import React, { useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Field } from '../../components/ui';
import { colors, radius, spacing, type } from '../../theme/colors';
import { whatsappApi } from '../../api/endpoints';
import { StartLinkResult } from '../../api/types';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LinkWhatsApp'>;

export function LinkWhatsAppScreen(_props: Props) {
  const [phone, setPhone] = useState('+57');
  const [result, setResult] = useState<StartLinkResult | null>(null);
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
      setResult(await whatsappApi.startLink(phone));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // BP-06: abrir WhatsApp con el código ya escrito, al número correcto.
  const openWhatsApp = async () => {
    if (!result?.botPhoneE164) return;
    const digits = result.botPhoneE164.replace(/\D/g, '');
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(result.otp)}`;
    try {
      await Linking.openURL(url);
    } catch {
      setError('No pude abrir WhatsApp. Copia el código y envíalo manualmente.');
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      <Text style={{ color: colors.primary, ...type.heading }}>Registra por WhatsApp</Text>
      <Text style={{ color: colors.textMuted, ...type.body, marginTop: spacing.xs, marginBottom: spacing.lg }}>
        Vincula tu número y podrás registrar gastos escribiendo mensajes normales, como
        "Pagué $250.000 al crédito de Bancolombia".
      </Text>

      <Field label="Tu número de WhatsApp" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+573001112222" />
      {error ? <Text style={{ color: colors.danger, ...type.body, marginBottom: spacing.sm }}>{error}</Text> : null}
      <Button title="Generar código" onPress={onStart} loading={loading} />

      {result ? (
        <Card style={{ marginTop: spacing.lg, alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, ...type.body }}>Tu código de vinculación</Text>
          <View style={{ backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, marginVertical: spacing.md }}>
            <Text style={{ fontSize: 34, fontWeight: '800', letterSpacing: 8, color: colors.primary }} accessibilityLabel={`Código ${result.otp.split('').join(' ')}`}>
              {result.otp}
            </Text>
          </View>
          {result.botPhoneE164 ? (
            <>
              <Text style={{ color: colors.text, textAlign: 'center', ...type.body }}>
                Envíalo por WhatsApp al número de Millo <Text style={{ fontWeight: '800' }}>{result.botPhoneE164}</Text>. Vence en 10 minutos.
              </Text>
              <View style={{ alignSelf: 'stretch' }}>
                <Button title="Abrir WhatsApp con el código" icon="logo-whatsapp" onPress={() => void openWhatsApp()} />
              </View>
            </>
          ) : (
            <Text style={{ color: colors.textMuted, textAlign: 'center', ...type.body }}>
              El canal de WhatsApp de Millo aún no está conectado en esta versión. Mientras tanto puedes
              registrar por Telegram (Ajustes → Telegram) o desde la app.
            </Text>
          )}
        </Card>
      ) : null}
    </ScrollView>
  );
}
