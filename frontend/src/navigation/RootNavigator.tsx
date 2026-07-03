import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/auth.store';
import { colors } from '../theme/colors';
import { AuthNavigator } from './AuthNavigator';
import { MainTabs } from './MainTabs';
import { LinkWhatsAppScreen } from '../screens/whatsapp/LinkWhatsAppScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { tokens, hydrated, hydrate } = useAuthStore();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

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
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
