import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/auth.store';
import { colors } from '../theme/colors';
import { AuthNavigator } from './AuthNavigator';
import { MainTabs } from './MainTabs';
import { LinkWhatsAppScreen } from '../screens/whatsapp/LinkWhatsAppScreen';
import { LinkTelegramScreen } from '../screens/telegram/LinkTelegramScreen';
import { AccountsScreen } from '../screens/AccountsScreen';
import { SimulatorScreen } from '../screens/SimulatorScreen';
import { AchievementsScreen } from '../screens/AchievementsScreen';
import { MilloPlusScreen } from '../screens/MilloPlusScreen';
import { registerForPush } from '../notifications/push';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { tokens, hydrated, hydrate } = useAuthStore();

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

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {tokens ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
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
              name="Simulator"
              component={SimulatorScreen}
              options={{ headerShown: true, title: '¿Qué pasa si…?' }}
            />
            <Stack.Screen
              name="Achievements"
              component={AchievementsScreen}
              options={{ headerShown: true, title: 'Tu progreso' }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
