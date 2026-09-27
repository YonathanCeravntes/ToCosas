import React from 'react';
import { Platform, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme/colors';
import { DashboardScreen } from '../screens/DashboardScreen';
import { HealthScreen } from '../screens/HealthScreen';
import { DebtsNavigator } from './DebtsNavigator';
import { AddTransactionScreen } from '../screens/transactions/AddTransactionScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { MainTabsParamList } from './types';
import { headerOptions } from './headerOptions';
import { useBottomInset } from './insets';

const Tab = createBottomTabNavigator<MainTabsParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const tabIcon =
  (active: IoniconName, inactive: IoniconName) =>
  ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );

/** Botón central de Registrar: la acción más frecuente, siempre a un toque. */
function RegisterIcon({ focused }: { focused: boolean }) {
  return (
    <View
      style={{
        width: 52,
        height: 52,
        borderRadius: radius.full,
        backgroundColor: focused ? colors.primaryDark : colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Platform.OS === 'ios' ? -14 : -18,
        borderWidth: 3,
        borderColor: colors.surface,
      }}
    >
      <Ionicons name="add" size={30} color={colors.textInverse} />
    </View>
  );
}

/**
 * FIN-038 · Navegación 5 + 1. Cinco pestañas con íconos vectoriales (antes 7 con
 * emojis, que Android pinta distinto por fabricante) y el botón de Registrar en el
 * centro. Header neutro: el único bloque verde de cada pantalla es su hero.
 */
export function MainTabs() {
  // BT-012: en Android edge-to-edge la barra del sistema (◁ ○ □) se superpone a la
  // app; la altura fija anterior dejaba las pestañas debajo de esos botones. La
  // altura se calcula a partir del inset real del dispositivo (gestos = ~16–24 dp,
  // 3 botones = ~48 dp, iPhone con notch = 34 pt).
  const bottomInset = Math.max(useBottomInset(), 8);
  return (
    <Tab.Navigator
      screenOptions={{
        ...headerOptions,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 56 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Inicio', tabBarIcon: tabIcon('home', 'home-outline'), tabBarAccessibilityLabel: 'Inicio' }}
      />
      <Tab.Screen
        name="Debts"
        component={DebtsNavigator}
        options={{ headerShown: false, title: 'Deudas', tabBarIcon: tabIcon('card', 'card-outline'), tabBarAccessibilityLabel: 'Deudas' }}
      />
      <Tab.Screen
        name="Add"
        component={AddTransactionScreen}
        options={{
          title: 'Registrar',
          tabBarLabel: 'Registrar',
          tabBarIcon: ({ focused }) => <RegisterIcon focused={focused} />,
          tabBarAccessibilityLabel: 'Registrar un movimiento',
        }}
      />
      <Tab.Screen
        name="Health"
        component={HealthScreen}
        options={{ title: 'Salud', tabBarIcon: tabIcon('pulse', 'pulse-outline'), tabBarAccessibilityLabel: 'Salud financiera' }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{ title: 'Más', tabBarIcon: tabIcon('grid', 'grid-outline'), tabBarAccessibilityLabel: 'Más opciones' }}
      />
    </Tab.Navigator>
  );
}
