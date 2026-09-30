import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Card, IconName, Row } from '../components/ui';
import { colors, spacing, type } from '../theme/colors';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/auth.store';

type Item = { icon: IconName; title: string; sub: string; to: keyof RootStackParamList };

const SECTIONS: Array<{ title: string; items: Item[] }> = [
  {
    title: 'Tu dinero',
    items: [
      { icon: 'wallet-outline', title: 'Mi mes', sub: 'Lo que entra, lo comprometido y lo libre', to: 'Budget' },
      { icon: 'list-outline', title: 'Movimientos', sub: 'Historial completo con filtros y búsqueda', to: 'Transactions' },
      { icon: 'business-outline', title: 'Cuentas y patrimonio', sub: 'Saldos, activos y fondo de emergencia', to: 'Accounts' },
      { icon: 'briefcase-outline', title: 'Mi perfil de ingresos', sub: 'Fuentes, deducciones y neto mensual', to: 'IncomeProfile' },
      { icon: 'folder-open-outline', title: 'Mis documentos', sub: 'Facturas, extractos y certificados para tu renta', to: 'Documents' },
    ],
  },
  {
    title: 'Decidir mejor',
    items: [
      { icon: 'flask-outline', title: 'Simulador', sub: '¿Qué pasa si…? Prueba antes de decidir', to: 'Simulator' },
      { icon: 'chatbubble-ellipses-outline', title: 'Copiloto', sub: 'Te explica tus números y novedades', to: 'Copilot' },
      { icon: 'trophy-outline', title: 'Tu progreso', sub: 'Racha, nivel y logros', to: 'Achievements' },
    ],
  },
  {
    title: 'Cuenta',
    items: [
      { icon: 'sparkles-outline', title: 'Millo+', sub: 'Historial de Score, IA y simulaciones sin límite', to: 'MilloPlus' },
      { icon: 'settings-outline', title: 'Ajustes', sub: 'Canales, ciclo, avisos, privacidad y datos', to: 'Settings' },
    ],
  },
];

/** FIN-038 · Pestaña "Más": todo lo que no cabe en las 4 pestañas principales. */
export function MoreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((s) => s.user);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      <Card>
        <Row style={{ gap: spacing.md }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.primaryDark, fontWeight: '800', ...type.bodyLg }}>
              {(user?.fullName ?? user?.email ?? 'M').trim().charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, ...type.title }}>{user?.fullName ?? 'Tu cuenta'}</Text>
            <Text style={{ color: colors.textMuted, ...type.small }}>{user?.email}</Text>
          </View>
        </Row>
      </Card>

      {SECTIONS.map((s) => (
        <View key={s.title} style={{ marginBottom: spacing.sm }}>
          <Text style={{ color: colors.textMuted, ...type.small, fontWeight: '700', marginBottom: spacing.sm, marginLeft: spacing.xs }}>
            {s.title.toUpperCase()}
          </Text>
          <Card style={{ padding: 0 }}>
            {s.items.map((it, i) => (
              <Pressable
                key={it.to}
                onPress={() => navigation.navigate(it.to as never)}
                accessibilityRole="button"
                accessibilityLabel={it.title}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.md,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                  backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
                })}
              >
                <Ionicons name={it.icon} size={22} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, ...type.body, fontWeight: '700' }}>{it.title}</Text>
                  <Text style={{ color: colors.textMuted, ...type.small }}>{it.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </Pressable>
            ))}
          </Card>
        </View>
      ))}
    </ScrollView>
  );
}
