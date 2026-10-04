import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DebtsListScreen } from '../screens/debts/DebtsListScreen';
import { DebtDetailScreen } from '../screens/debts/DebtDetailScreen';
import { AddDebtScreen } from '../screens/debts/AddDebtScreen';
import { RenegotiateDebtScreen } from '../screens/debts/RenegotiateDebtScreen';
import { EditDebtScreen } from '../screens/debts/EditDebtScreen';
import { CardHealthScreen } from '../screens/debts/CardHealthScreen';
import { DebtsStackParamList } from './types';
import { headerOptions } from './headerOptions';

const Stack = createNativeStackNavigator<DebtsStackParamList>();

export function DebtsNavigator() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="DebtsList" component={DebtsListScreen} options={{ title: 'Mis deudas' }} />
      <Stack.Screen
        name="DebtDetail"
        component={DebtDetailScreen}
        options={({ route }) => ({ title: route.params.name })}
      />
      <Stack.Screen name="AddDebt" component={AddDebtScreen} options={{ title: 'Nueva deuda' }} />
      <Stack.Screen name="RenegotiateDebt" component={RenegotiateDebtScreen} options={{ title: 'Renegociar' }} />
      <Stack.Screen name="CardHealth" component={CardHealthScreen} options={{ title: 'Salud de tu tarjeta' }} />
      <Stack.Screen name="EditDebt" component={EditDebtScreen} options={({ route }) => ({ title: `Editar ${route.params.name}` })} />
    </Stack.Navigator>
  );
}
