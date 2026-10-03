import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, PressableProps, View } from 'react-native';
import { BottomTabBarButtonProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
import { Text } from '../components/AppText';
import { useRegisterForm } from '../store/registerForm.store';

const Tab = createBottomTabNavigator<MainTabsParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const tabIcon =
  (active: IoniconName, inactive: IoniconName) =>
  ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );

const FAB_LIFT = Platform.OS === 'ios' ? -14 : -18;

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
        marginTop: FAB_LIFT,
        borderWidth: 3,
        borderColor: colors.surface,
      }}
    >
      <Ionicons name="add" size={30} color={colors.textInverse} />
    </View>
  );
}

/**
 * FIN-060 · Botón central de Registrar. Fuera del formulario es el "+" de siempre (navega).
 * Con la pestaña Registrar enfocada y su formulario activo se vuelve "✓ Guardar":
 * gris y deshabilitado mientras falta algo (al tocar avisa qué falta, no guarda) y verde
 * con la etiqueta "Registrar" cuando está listo (al tocar guarda). Todo JS (Animated).
 */
function RegisterTabButton(props: BottomTabBarButtonProps) {
  // Props propias del PlatformPressable de react-navigation que Pressable no conoce.
  const { children, style, onPress, href: _href, pressOpacity: _po, hoverEffect: _he, ...rest } = props as BottomTabBarButtonProps & {
    pressOpacity?: number;
    hoverEffect?: unknown;
  };
  const focused = !!props['aria-selected'];
  const { active, ready, submit, nudge } = useRegisterForm();
  const check = focused && active;
  const mode = check ? (ready ? 'ready' : 'blocked') : 'plus';

  const scale = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    scale.setValue(0.82);
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
  }, [mode, scale]);
  const pressTo = (v: number) => Animated.timing(scale, { toValue: v, duration: 90, useNativeDriver: true }).start();

  if (!check) {
    return (
      <Pressable {...(rest as PressableProps)} onPress={onPress} onPressIn={() => pressTo(0.92)} onPressOut={() => pressTo(1)} style={style}>
        <Animated.View style={{ alignItems: 'center', transform: [{ scale }] }}>{children}</Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={rest.testID}
      onPress={() => (ready ? submit?.() : nudge?.())}
      onPressIn={() => pressTo(0.92)}
      onPressOut={() => pressTo(1)}
      accessibilityRole="button"
      accessibilityLabel="Guardar gasto"
      accessibilityHint={ready ? undefined : 'Falta información para guardar'}
      accessibilityState={{ disabled: !ready }}
      style={style}
    >
      <Animated.View style={{ alignItems: 'center', transform: [{ scale }] }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: radius.full,
            backgroundColor: ready ? colors.primary : colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: FAB_LIFT,
            borderWidth: 3,
            borderColor: colors.surface,
          }}
        >
          <Ionicons name="checkmark" size={30} color={ready ? colors.textInverse : colors.textFaint} />
        </View>
        {ready ? <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary, marginTop: 2 }}>Registrar</Text> : null}
      </Animated.View>
    </Pressable>
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
        // FIN-060: con el teclado abierto la barra se oculta; el botón del formulario
        // queda justo encima del teclado.
        tabBarHideOnKeyboard: true,
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
          tabBarButton: (props) => <RegisterTabButton {...props} />,
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
