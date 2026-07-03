import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { DebtsListScreen } from '../screens/debts/DebtsListScreen';
import { DebtDetailScreen } from '../screens/debts/DebtDetailScreen';
import { AddDebtScreen } from '../screens/debts/AddDebtScreen';
import { DebtsStackParamList } from './types';

const Stack = createNativeStackNavigator<DebtsStackParamList>();

export function DebtsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textInverse,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="DebtsList" component={DebtsListScreen} options={{ title: 'Mis deudas' }} />
      <Stack.Screen
        name="DebtDetail"
        component={DebtDetailScreen}
        options={({ route }) => ({ title: route.params.name })}
      />
      <Stack.Screen name="AddDebt" component={AddDebtScreen} options={{ title: 'Nueva deuda' }} />
    </Stack.Navigator>
  );
}
