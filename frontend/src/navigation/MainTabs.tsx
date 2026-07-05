import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/colors';
import { DashboardScreen } from '../screens/DashboardScreen';
import { HealthScreen } from '../screens/HealthScreen';
import { DebtsNavigator } from './DebtsNavigator';
import { AddTransactionScreen } from '../screens/transactions/AddTransactionScreen';
import { BudgetScreen } from '../screens/BudgetScreen';
import { CopilotScreen } from '../screens/CopilotScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { MainTabsParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

/** Íconos simples con emoji para no depender de librerías de íconos en el scaffold. */
const icon =
  (emoji: string) =>
  ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textInverse,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Inicio', tabBarIcon: icon('🏠') }}
      />
      <Tab.Screen
        name="Health"
        component={HealthScreen}
        options={{ title: 'Salud', tabBarIcon: icon('🩺') }}
      />
      <Tab.Screen
        name="Debts"
        component={DebtsNavigator}
        options={{ headerShown: false, title: 'Deudas', tabBarIcon: icon('💳') }}
      />
      <Tab.Screen
        name="Budget"
        component={BudgetScreen}
        options={{ title: 'Presupuesto', tabBarIcon: icon('💰') }}
      />
      <Tab.Screen
        name="Add"
        component={AddTransactionScreen}
        options={{ title: 'Registrar', tabBarIcon: icon('➕') }}
      />
      <Tab.Screen
        name="Insights"
        component={CopilotScreen}
        options={{ title: 'Copiloto', tabBarIcon: icon('🤖') }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Ajustes', tabBarIcon: icon('⚙️') }}
      />
    </Tab.Navigator>
  );
}
