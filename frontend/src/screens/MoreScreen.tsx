import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '../components/AppText';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Card, IconName, Row } from '../components/ui';
import { colors, spacing, type } from '../theme/colors';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/auth.store';

type Item = { icon: IconName; title: string; sub: string; to: keyof RootStackParamList };
type Tone = 'brand' | 'neutral';

/** FIN-060: tono del cuadrito del ícono (verde en "Tu dinero", dorado solo en Millo+). */
function tileColors(tone: Tone, to: Item['to']): [string, string] {
  if (to === 'MilloPlus') return [colors.goldSoft, colors.gold];
  return tone === 'brand' ? [colors.primarySoft, colors.primary] : [colors.surfaceAlt, colors.textFaint];
}

const SECTIONS: Array<{ title: string; tone: Tone; items: Item[] }> = [
  {
    title: 'Tu dinero',
    tone: 'brand',
    items: [
      { icon: 'wallet-outline', title: 'Mi mes', sub: 'Lo que entra, lo comprometido y lo libre', to: 'Budget' },
      { icon: 'cafe-outline', title: 'Tus gustos este mes', sub: 'Si van a tu ritmo, sin culpas', to: 'Gustos' },
      { icon: 'calendar-outline', title: 'Plata del año', sub: 'Tu colchón, primas y gastos grandes', to: 'YearPlan' },
      { icon: 'list-outline', title: 'Movimientos', sub: 'Historial completo con filtros y búsqueda', to: 'Transactions' },
      { icon: 'business-outline', title: 'Cuentas y patrimonio', sub: 'Saldos, activos y fondo de emergencia', to: 'Accounts' },
      { icon: 'briefcase-outline', title: 'Mi perfil de ingresos', sub: 'Fuentes, deducciones y neto mensual', to: 'IncomeProfile' },
      { icon: 'git-compare-outline', title: 'Esencial y gustos', sub: 'Qué es esencial para ti y qué te sostiene', to: 'SpendClasses' },
      { icon: 'folder-open-outline', title: 'Mis documentos', sub: 'Facturas, extractos y certificados para tu renta', to: 'Documents' },
      { icon: 'heart-outline', title: 'Millo en pareja', sub: 'La plata de la casa, el aporte justo y sus metas', to: 'Household' },
    ],
  },
  {
    title: 'Decidir mejor',
    tone: 'neutral',
    items: [
      { icon: 'flask-outline', title: 'Simulador', sub: '¿Qué pasa si…? Prueba antes de decidir', to: 'Simulator' },
      { icon: 'chatbubble-ellipses-outline', title: 'Copiloto', sub: 'Te explica tus números y novedades', to: 'Copilot' },
      { icon: 'trophy-outline', title: 'Tu progreso', sub: 'Racha, nivel y logros', to: 'Achievements' },
    ],
  },
  {
    title: 'Cuenta',
    tone: 'neutral',
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
            <Text style={{ color: colors.primary, ...type.bodyLg, fontWeight: '600' }}>
              {(user?.fullName ?? user?.email ?? 'M').trim().charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, ...type.title }}>{user?.fullName ?? 'Tu cuenta'}</Text>
            <Text style={{ color: colors.textFaint, ...type.small }}>{user?.email}</Text>
          </View>
        </Row>
      </Card>

      {SECTIONS.map((s) => (
        <View key={s.title} style={{ marginBottom: spacing.sm }}>
          <Text accessibilityRole="header" style={{ color: colors.textFaint, ...type.label, marginBottom: spacing.sm, marginLeft: spacing.xs }}>
            {s.title}
          </Text>
          <Card style={{ paddingVertical: 0, paddingHorizontal: spacing.md }}>
            {s.items.map((it, i) => {
              const [tileBg, tileFg] = tileColors(s.tone, it.to);
              return (
              <Pressable
                key={it.to}
                onPress={() => navigation.navigate(it.to as never)}
                accessibilityRole="button"
                accessibilityLabel={it.title}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingVertical: 12,
                  minHeight: 56,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: tileBg, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={it.icon} size={18} color={tileFg} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>{it.title}</Text>
                  <Text style={{ color: colors.textFaint, ...type.small }}>{it.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </Pressable>
              );
            })}
          </Card>
        </View>
      ))}
    </ScrollView>
  );
}
