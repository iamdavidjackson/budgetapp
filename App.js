import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BudgetProvider } from './context/BudgetContext';

import AccountsStack from './navigation/AccountsStack';
import RecurringStack from './navigation/RecurringStack';
import HomeStack from './navigation/HomeStack';
import TransactionsStack from './navigation/TransactionsStack';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BudgetProvider>
        <NavigationContainer>
          <Tab.Navigator screenOptions={{ headerShown: false }}>
            <Tab.Screen name="Home" component={HomeStack} />
            <Tab.Screen name="Transactions" component={TransactionsStack} />
            <Tab.Screen name="Recurring" component={RecurringStack} />
            <Tab.Screen name="Accounts" component={AccountsStack} />
          </Tab.Navigator>
        </NavigationContainer>
      </BudgetProvider>
    </GestureHandlerRootView>
  );
}