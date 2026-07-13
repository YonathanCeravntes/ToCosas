import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { Button, Card, Row } from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';
import { billingApi } from '../api/endpoints';
import { BillingStatus } from '../api/types';
import { formatLocalDate } from '../utils/format';

const BENEFITS = [
  ['📈', 'Evolución completa de tu Score, mes a mes'],
  ['🤖', '100 mensajes de IA al día (vs 10)'],
  ['🧪', 'Simulaciones ilimitadas (vs 5 al mes)'],
];

export function MilloPlusScreen({ route }: { route?: { params?: { source?: string } } }) {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void billingApi.me().then(setStatus).catch(() => undefined);
    void billingApi
      .funnel('paywall_view', route?.params?.source)
      .catch(() => undefined);
  }, [route?.params?.source]);

  const redeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const r = await billingApi.redeem(code.trim());
      setMessage(`🎉 ¡Millo+ activado por ${r.days} días!`);
      setStatus(await billingApi.me());
      setCode('');
    } catch (e) {
      setMessage(`❌ ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const isPremium = status?.plan === 'premium';

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary, alignItems: 'center', paddingVertical: spacing.lg }}>
        <Text style={{ fontSize: 34 }}>✨</Text>
        <Text style={{ color: colors.textInverse, fontSize: 24, fontWeight: '800' }}>Millo+</Text>
        <Text style={{ color: colors.textInverse, opacity: 0.85, textAlign: 'center', marginTop: 4 }}>
          Toda la inteligencia de Millo, sin límites.
        </Text>
        {isPremium ? (
          <View style={{ marginTop: spacing.sm, backgroundColor: '#ffffff22', borderRadius: radius.full, paddingVertical: 6, paddingHorizontal: 14 }}>
            <Text style={{ color: colors.textInverse, fontWeight: '700' }}>
              {/* La vigencia es un instante real (fin de suscripción) → local. */}
              Activo{status?.until ? ` hasta ${formatLocalDate(status.until)}` : ''}
              {status?.status === 'trial' ? ' (prueba)' : ''}
            </Text>
          </View>
        ) : null}
      </Card>

      {BENEFITS.map(([emoji, text]) => (
        <Card key={text} style={{ paddingVertical: spacing.sm }}>
          <Row style={{ gap: spacing.sm }}>
            <Text style={{ fontSize: 20 }}>{emoji}</Text>
            <Text style={{ color: colors.text, flex: 1 }}>{text}</Text>
          </Row>
        </Card>
      ))}

      {!isPremium ? (
        <>
          <Card>
            <Text style={{ fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>
              🎟️ ¿Tienes un código?
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="MILLO-XXXXXXXX"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, color: colors.text, marginBottom: spacing.sm }}
            />
            <Button title="Canjear código" onPress={() => void redeem()} loading={loading} />
          </Card>
          <Card>
            <Text style={{ color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
              {status?.priceCop
                ? `Suscripción: ${status.priceCop.toLocaleString('es-CO')} COP/mes (próximamente en tiendas).`
                : 'La suscripción estará disponible próximamente en la tienda de aplicaciones.'}
            </Text>
            <Button
              title="Avísame cuando esté disponible"
              variant="secondary"
              onPress={() => {
                void billingApi.funnel('upgrade_intent', 'notify_me').catch(() => undefined);
                setMessage('✅ Te avisaremos apenas esté disponible.');
              }}
            />
          </Card>
        </>
      ) : null}

      {message ? (
        <Text style={{ textAlign: 'center', color: message.startsWith('❌') ? colors.danger : colors.success, marginTop: spacing.sm }}>
          {message}
        </Text>
      ) : null}
    </ScrollView>
  );
}
