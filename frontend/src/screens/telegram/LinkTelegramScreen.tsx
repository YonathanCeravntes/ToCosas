import React, { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { Text } from '../../components/AppText';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Ico, Row } from '../../components/ui';
import { colors, radius, spacing, type } from '../../theme/colors';
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
      <Row style={{ gap: spacing.sm }}>
        <Text accessibilityRole="header" style={{ color: colors.text, ...type.heading }}>Registra por Telegram</Text>
        <Ico name="paper-plane-outline" size={18} color={colors.primary} />
      </Row>
      <Text style={{ color: colors.textMuted, ...type.body, marginTop: 6, marginBottom: spacing.lg }}>
        Vincula tu Telegram y registra movimientos escribiéndole al bot, como
        "Gasté $30.000 en almuerzo". También recibirás alertas de tus cuotas.
      </Text>

      <Button title="Generar código" onPress={onStart} loading={loading} />
      {error ? <Text style={{ color: colors.danger, ...type.body, marginTop: 8 }}>{error}</Text> : null}

      {link ? (
        <Card style={{ marginTop: spacing.lg, alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, ...type.small }}>Tu código de vinculación</Text>
          <View
            style={{
              backgroundColor: colors.surfaceAlt,
              borderRadius: radius.md,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.xl,
              marginVertical: spacing.md,
            }}
          >
            <Text style={{ fontSize: 32, lineHeight: 38, fontWeight: '600', letterSpacing: 7, color: colors.primary }} accessibilityLabel={`Código ${link.otp.split('').join(' ')}`}>
              {link.otp}
            </Text>
          </View>
          <Text style={{ color: colors.text, textAlign: 'center', ...type.body, marginBottom: spacing.xs }}>
            Abre el bot y envíale este código, o pulsa el botón para abrir Telegram
            directamente. Vence en 10 minutos.
          </Text>
          <View style={{ alignSelf: 'stretch' }}>
            <Button title={`Abrir @${link.botUsername}`} onPress={() => void Linking.openURL(link.deepLink)} />
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}
