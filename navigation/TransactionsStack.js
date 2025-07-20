import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TransactionsScreen from '../screens/TransactionsScreen';
import ConfirmTransactionFormScreen from '../screens/ConfirmTransactionFormScreen';

const Stack = createNativeStackNavigator();

export default function TransactionsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Transactions" component={TransactionsScreen} />
      <Stack.Screen name="Confirm Transaction" component={ConfirmTransactionFormScreen} />
    </Stack.Navigator>
  );
}