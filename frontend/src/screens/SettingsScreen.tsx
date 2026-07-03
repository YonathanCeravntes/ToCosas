import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, Row } from '../components/ui';
import { colors, spacing } from '../theme/colors';
import { useAuthStore } from '../store/auth.store';
import { RootStackParamList } from '../navigation/types';

export function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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

      <View style={{ marginTop: spacing.lg }}>
        <Button title="Cerrar sesión" variant="danger" onPress={() => void logout()} />
      </View>

      <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl }}>
        ToCosas v0.1.0
      </Text>
    </ScrollView>
  );
}
