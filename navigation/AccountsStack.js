import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AccountsScreen from '../screens/AccountsScreen';
import AccountFormScreen from '../screens/AccountFormScreen';

const Stack = createNativeStackNavigator();

export default function AccountsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Accounts List" component={AccountsScreen} />
      <Stack.Screen name="Add Account" component={AccountFormScreen} />
    </Stack.Navigator>
  );
}