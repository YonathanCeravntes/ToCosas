import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { Button, Card, FormScroll, Ico, IconName, Row } from '../components/ui';
import { colors, radius, spacing, type } from '../theme/colors';
import { billingApi } from '../api/endpoints';
import { BillingStatus } from '../api/types';
import { formatLocalDate } from '../utils/format';

const BENEFITS: Array<[IconName, string]> = [
  ['trending-up-outline', 'Evolución completa de tu Score, mes a mes'],
  ['sparkles-outline', '100 mensajes de IA al día (vs 10)'],
  ['flask-outline', 'Simulaciones ilimitadas (vs 5 al mes)'],
];

export function MilloPlusScreen({ route }: { route?: { params?: { source?: string } } }) {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
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
    setMessageIsError(false);
    try {
      const r = await billingApi.redeem(code.trim());
      setMessage(`¡Millo+ activado por ${r.days} días!`);
      setStatus(await billingApi.me());
      setCode('');
    } catch (e) {
      setMessageIsError(true);
      setMessage((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const isPremium = status?.plan === 'premium';

  return (
    <FormScroll>
      {/* FIN-060: hero blanco con filete y destello dorados (no bloque verde). */}
      <Card style={{ alignItems: 'center', paddingVertical: spacing.lg, borderColor: colors.gold, borderTopWidth: 3 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ico name="sparkles-outline" size={22} color={colors.goldText} />
        </View>
        <Text style={{ color: colors.text, ...type.heading, marginTop: spacing.sm }}>
          Millo<Text style={{ color: colors.goldText }}>+</Text>
        </Text>
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 2 }}>
          Toda la inteligencia de Millo, sin límites.
        </Text>
        {isPremium ? (
          <View style={{ marginTop: spacing.md, backgroundColor: colors.goldSoft, borderRadius: radius.full, paddingVertical: 5, paddingHorizontal: 14 }}>
            <Text style={{ color: colors.goldText, fontWeight: '600', ...type.small }}>
              {/* La vigencia es un instante real (fin de suscripción) → local. */}
              Activo{status?.until ? ` hasta ${formatLocalDate(status.until)}` : ''}
              {status?.status === 'trial' ? ' (prueba)' : ''}
            </Text>
          </View>
        ) : null}
      </Card>

      <Card style={{ paddingVertical: 0 }}>
        {BENEFITS.map(([icon, text], i) => (
          <Row key={text} style={{ gap: spacing.sm + 2, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceAlt }}>
            <Ico name={icon} size={18} color={colors.goldText} />
            <Text style={{ color: colors.text, flex: 1 }}>{text}</Text>
          </Row>
        ))}
      </Card>

      {!isPremium ? (
        <>
          <Card>
            <Row style={{ gap: 6, marginBottom: spacing.sm }}>
              <Ico name="ticket-outline" size={15} color={colors.textFaint} />
              <Text style={{ fontWeight: '600', color: colors.text, fontSize: 15 }}>¿Tienes un código?</Text>
            </Row>
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
                setMessageIsError(false);
                setMessage('Te avisaremos apenas esté disponible.');
              }}
            />
          </Card>
        </>
      ) : null}

      {message ? (
        <Text style={{ textAlign: 'center', fontWeight: '600', color: messageIsError ? colors.danger : colors.primary, marginTop: spacing.sm }}>
          {message}
        </Text>
      ) : null}
    </FormScroll>
  );
}
