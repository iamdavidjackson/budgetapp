import React, { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BudgetProvider } from './context/BudgetContext';
import { supabase } from './utils/supabase';
import AuthScreen from './screens/AuthScreen';

import AccountsStack from './navigation/AccountsStack';
import RecurringStack from './navigation/RecurringStack';
import HomeStack from './navigation/HomeStack';
import TransactionsStack from './navigation/TransactionsStack';
import SettingsStack from './navigation/SettingsStack';

const Tab = createBottomTabNavigator();

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const session = supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!user) {
    return <AuthScreen />;
  }

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
                  case 'Settings':
                    iconName = 'settings';
                    break;
                  default:
                    iconName = 'circle';
                }

                return <MaterialIcons name={iconName} size={size} color={color} />;
              },
              tabBarStyle: {
                paddingBottom: 20,
                height: 80,
              }
            })}
          >
            <Tab.Screen name="Home" component={HomeStack} />
            <Tab.Screen name="Transactions" component={TransactionsStack} />
            <Tab.Screen name="Recurring" component={RecurringStack} />
            <Tab.Screen name="Accounts" component={AccountsStack} />
            <Tab.Screen name="Settings" component={SettingsStack} />
          </Tab.Navigator>
        </NavigationContainer>
      </BudgetProvider>
    </GestureHandlerRootView>
  );
}