import React, { useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card } from '../../components/ui';
import { colors, radius, spacing } from '../../theme/colors';
import { telegramApi } from '../../api/endpoints';
import { StartTelegramLinkResult } from '../../api/types';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LinkTelegram'>;

export function LinkTelegramScreen(_props: Props) {
  const [link, setLink] = useState<StartTelegramLinkResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onStart = async () => {
    setError(null);
    setLoading(true);
    try {
      setLink(await telegramApi.startLink());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.primary }}>
        Registra por Telegram ✈️
      </Text>
      <Text style={{ color: colors.textMuted, marginTop: 6, marginBottom: spacing.lg, lineHeight: 20 }}>
        Vincula tu Telegram y registra movimientos escribiéndole al bot, como
        "Gasté $30.000 en almuerzo". También recibirás alertas de tus cuotas.
      </Text>

      <Button title="Generar código" onPress={onStart} loading={loading} />
      {error ? <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text> : null}

      {link ? (
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
              {link.otp}
            </Text>
          </View>
          <Text style={{ color: colors.text, textAlign: 'center', lineHeight: 20, marginBottom: spacing.md }}>
            Abre el bot y envíale este código, o pulsa el botón para abrir Telegram
            directamente. Vence en 10 minutos.
          </Text>
          <Button title={`Abrir @${link.botUsername}`} onPress={() => void Linking.openURL(link.deepLink)} />
        </Card>
      ) : null}
    </ScrollView>
  );
}
