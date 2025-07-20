import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import RecurringScreen from '../screens/RecurringScreen';
import RecurringFormScreen from '../screens/RecurringFormScreen';

const Stack = createNativeStackNavigator();

export default function RecurringStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Recurring Items" component={RecurringScreen} />
      <Stack.Screen name="Add Recurring Item" component={RecurringFormScreen} />
    </Stack.Navigator>
  );
}