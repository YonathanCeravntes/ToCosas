import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/auth.store';
import { colors } from '../theme/colors';
import { AuthNavigator } from './AuthNavigator';
import { MainTabs } from './MainTabs';
import { LinkWhatsAppScreen } from '../screens/whatsapp/LinkWhatsAppScreen';
import { LinkTelegramScreen } from '../screens/telegram/LinkTelegramScreen';
import { AccountsScreen } from '../screens/AccountsScreen';
import { IncomeProfileScreen } from '../screens/IncomeProfileScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { CategoriesScreen } from '../screens/CategoriesScreen';
import { HouseholdScreen } from '../screens/HouseholdScreen';
import { SimulatorScreen } from '../screens/SimulatorScreen';
import { CashflowPlanScreen } from '../screens/CashflowPlanScreen';
import { AchievementsScreen } from '../screens/AchievementsScreen';
import { MilloPlusScreen } from '../screens/MilloPlusScreen';
import { BudgetScreen } from '../screens/BudgetScreen';
import { CopilotScreen } from '../screens/CopilotScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TransactionsScreen } from '../screens/transactions/TransactionsScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { registerForPush } from '../notifications/push';
import { RootStackParamList } from './types';
import { headerOptions } from './headerOptions';
import { useStackContentStyle } from './insets';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
  },
};

export function RootNavigator() {
  const { tokens, user, hydrated, hydrate } = useAuthStore();
  // BT-012: las pantallas del stack que no llevan barra de pestañas reservan el
  // espacio de la barra del sistema Android; `Main` no, porque su barra ya lo hace.
  const stackContent = useStackContentStyle();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Registra el push token una vez el usuario está autenticado (best-effort).
  useEffect(() => {
    if (tokens) void registerForPush();
  }, [tokens]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // FIN-038: solo un usuario NUEVO (onboardingDone === false) ve el recorrido
  // inicial. Usuarios Beta anteriores (bandera desconocida) entran directo.
  const needsOnboarding = !!tokens && user?.onboardingDone === false;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ ...headerOptions, headerShown: false, contentStyle: stackContent }}>
        {tokens ? (
          <>
            {needsOnboarding ? (
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            ) : null}
            <Stack.Screen name="Main" component={MainTabs} options={{ contentStyle: { backgroundColor: colors.bg } }} />
            <Stack.Screen name="Budget" component={BudgetScreen} options={{ headerShown: true, title: 'Mi mes' }} />
            <Stack.Screen name="Documents" component={DocumentsScreen} options={{ headerShown: true, title: 'Mis documentos' }} />
            <Stack.Screen name="Categories" component={CategoriesScreen} options={{ headerShown: true, title: 'En qué se te va' }} />
            <Stack.Screen name="Household" component={HouseholdScreen} options={{ headerShown: true, title: 'Millo en pareja' }} />
            <Stack.Screen name="Copilot" component={CopilotScreen} options={{ headerShown: true, title: 'Copiloto' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true, title: 'Ajustes' }} />
            <Stack.Screen
              name="Transactions"
              component={TransactionsScreen}
              options={{ headerShown: true, title: 'Tus movimientos' }}
            />
            <Stack.Screen
              name="LinkWhatsApp"
              component={LinkWhatsAppScreen}
              options={{ headerShown: true, title: 'Vincular WhatsApp', presentation: 'modal' }}
            />
            <Stack.Screen
              name="LinkTelegram"
              component={LinkTelegramScreen}
              options={{ headerShown: true, title: 'Vincular Telegram', presentation: 'modal' }}
            />
            <Stack.Screen
              name="Accounts"
              component={AccountsScreen}
              options={{ headerShown: true, title: 'Cuentas y patrimonio' }}
            />
            <Stack.Screen
              name="IncomeProfile"
              component={IncomeProfileScreen}
              options={{ headerShown: true, title: 'Mi perfil de ingresos' }}
            />
            <Stack.Screen
              name="CashflowPlan"
              component={CashflowPlanScreen}
              options={{ headerShown: true, title: 'Tu plan para liberar plata' }}
            />
            <Stack.Screen
              name="Simulator"
              component={SimulatorScreen}
              options={{ headerShown: true, title: '¿Qué pasa si…?' }}
            />
            <Stack.Screen
              name="Achievements"
              component={AchievementsScreen}
              options={{ headerShown: true, title: 'Tu progreso' }}
            />
            <Stack.Screen
              name="MilloPlus"
              component={MilloPlusScreen}
              options={{ headerShown: true, title: 'Millo+' }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
