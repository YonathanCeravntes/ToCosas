import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { AuthStackParamList } from './types';
import { headerOptions } from './headerOptions';
import { useStackContentStyle } from './insets';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const stackContent = useStackContentStyle(); // BT-012
  return (
    <Stack.Navigator screenOptions={{ ...headerOptions, headerShown: false, contentStyle: stackContent }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ headerShown: true, title: 'Recuperar contraseña' }}
      />
    </Stack.Navigator>
  );
}
