import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, Row } from '../components/ui';
import { colors, spacing } from '../theme/colors';
import { useAuthStore } from '../store/auth.store';
import { billingApi, budgetApi, copilotApi, insightsApi } from '../api/endpoints';
import { BillingStatus } from '../api/types';
import { RootStackParamList } from '../navigation/types';

export function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [aiAccepted, setAiAccepted] = useState<boolean | null>(null);
  const [proactive, setProactive] = useState<boolean | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [cycleDay, setCycleDay] = useState<number>(1);

  useEffect(() => {
    void copilotApi
      .consentStatus()
      .then((s) => setAiAccepted(s.accepted))
      .catch(() => setAiAccepted(null));
    void billingApi.me().then(setBilling).catch(() => undefined);
    void budgetApi
      .monthly()
      .then((b) => setCycleDay(b.period?.cycleStartDay ?? 1))
      .catch(() => undefined);
    void insightsApi
      .preferences()
      .then((p) => setProactive(p.proactiveEnabled))
      .catch(() => setProactive(null));
  }, []);

  const changeCycleDay = async (delta: number) => {
    const next = Math.min(28, Math.max(1, cycleDay + delta));
    if (next === cycleDay) return;
    setCycleDay(next);
    await budgetApi.setCycleDay(next).catch(() => undefined);
  };

  const toggleProactive = async () => {
    const next = !(proactive ?? true);
    setProactive(next);
    await insightsApi.setProactive(next).catch(() => undefined);
  };

  const revokeAi = async () => {
    await copilotApi.revokeConsent();
    setAiAccepted(false);
  };

  const deleteHistory = () => {
    Alert.alert(
      'Borrar historial del Copiloto',
      'Se eliminarán todas tus conversaciones de forma definitiva. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: () => void copilotApi.deleteHistory(),
        },
      ],
    );
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      <Card>
        <Text style={{ color: colors.textMuted }}>Cuenta</Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
          {user?.fullName ?? 'Usuario'}
        </Text>
        <Text style={{ color: colors.textMuted }}>{user?.email}</Text>
      </Card>

      {/* FIN-027: perfil de ingresos — se configura una vez, Milla lo reutiliza
          en toda la app (§32). */}
      <Card>
        <Pressable onPress={() => navigation.navigate('IncomeProfile')}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={{ fontWeight: '700', color: colors.text }}>💼 Mi perfil de ingresos</Text>
              <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13 }}>
                Configura tu perfil laboral, fuentes de ingreso y deducciones — una sola vez.
              </Text>
            </View>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>→</Text>
          </Row>
        </Pressable>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>💬 WhatsApp</Text>
            <Text style={{ color: colors.textMuted, marginTop: 4 }}>
              Registra movimientos por chat.
            </Text>
          </View>
          <Button title="Vincular" variant="secondary" onPress={() => navigation.navigate('LinkWhatsApp')} />
        </Row>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>✈️ Telegram</Text>
            <Text style={{ color: colors.textMuted, marginTop: 4 }}>
              Registra movimientos y recibe alertas de cuotas.
            </Text>
          </View>
          <Button title="Vincular" variant="secondary" onPress={() => navigation.navigate('LinkTelegram')} />
        </Row>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>📅 Ciclo financiero</Text>
            <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13 }}>
              {cycleDay === 1
                ? 'Tu presupuesto sigue el mes calendario.'
                : `Tu ciclo empieza el día ${cycleDay} de cada mes (p. ej. tu fecha de pago).`}
            </Text>
            <Text style={{ color: colors.textMuted, marginTop: 2, fontSize: 11 }}>
              Aplica a Presupuesto e Inicio; tu Score sigue el mes calendario.
            </Text>
          </View>
          <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
            <Pressable
              onPress={() => void changeCycleDay(-1)}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 18, color: colors.text }}>−</Text>
            </Pressable>
            <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text, minWidth: 24, textAlign: 'center' }}>
              {cycleDay}
            </Text>
            <Pressable
              onPress={() => void changeCycleDay(1)}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 18, color: colors.text }}>+</Text>
            </Pressable>
          </Row>
        </Row>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>🔔 Avisos proactivos</Text>
            <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13 }}>
              Millo te avisa (máx. 1 al día) cuando detecta riesgos o logros.
            </Text>
          </View>
          <Button
            title={proactive === false ? 'Activar' : 'Desactivar'}
            variant="secondary"
            onPress={() => void toggleProactive()}
          />
        </Row>
      </Card>

      <Card>
        <Text style={{ fontWeight: '700', color: colors.text }}>🤖 Inteligencia artificial</Text>
        <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13 }}>
          {aiAccepted === null
            ? 'Estado no disponible.'
            : aiAccepted
              ? 'Activa: tus datos minimizados se usan para respuestas con IA. Puedes revocarlo cuando quieras.'
              : 'Inactiva: el Copiloto responde en modo básico. Actívala desde la pestaña Copiloto.'}
        </Text>
        {aiAccepted ? (
          <Button title="Revocar consentimiento de IA" variant="secondary" onPress={() => void revokeAi()} />
        ) : null}
        <Button title="Borrar historial del Copiloto" variant="secondary" onPress={deleteHistory} />
      </Card>

      <View style={{ marginTop: spacing.lg }}>
        <Button title="Cerrar sesión" variant="danger" onPress={() => void logout()} />
      </View>

      <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl }}>
        ToCosas v0.1.0
      </Text>
    </ScrollView>
  );
}
