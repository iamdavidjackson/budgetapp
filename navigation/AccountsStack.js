import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AccountsScreen from '../screens/AccountsScreen';
import AccountFormScreen from '../screens/AccountFormScreen';
import AccountDetailsScreen from '../screens/AccountDetailsScreen';
import BalanceOverrideScreen from '../screens/BalanceOverrideScreen';

const Stack = createNativeStackNavigator();

export default function AccountsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Accounts" component={AccountsScreen} />
      <Stack.Screen name="Account Details" component={AccountDetailsScreen} />
      <Stack.Screen name="Add Account" component={AccountFormScreen} />
      <Stack.Screen name="Add Balance" component={BalanceOverrideScreen} />
    </Stack.Navigator>
  );
}