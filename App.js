import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
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
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarIcon: ({ color, size }) => {
                let iconName;

                switch (route.name) {
                  case 'Home':
                    iconName = 'home';
                    break;
                  case 'Transactions':
                    iconName = 'receipt-long';
                    break;
                  case 'Recurring':
                    iconName = 'repeat';
                    break;
                  case 'Accounts':
                    iconName = 'account-balance-wallet';
                    break;
                  default:
                    iconName = 'circle';
                }

                return <MaterialIcons name={iconName} size={size} color={color} />;
              }
            })}
          >
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