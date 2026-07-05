import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, Row } from '../components/ui';
import { colors, spacing } from '../theme/colors';
import { useAuthStore } from '../store/auth.store';
import { copilotApi } from '../api/endpoints';
import { RootStackParamList } from '../navigation/types';

export function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [aiAccepted, setAiAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    void copilotApi
      .consentStatus()
      .then((s) => setAiAccepted(s.accepted))
      .catch(() => setAiAccepted(null));
  }, []);

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
