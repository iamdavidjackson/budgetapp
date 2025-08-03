import React, { useContext, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { BudgetContext } from '../context/BudgetContext';
import { format, parseISO, parse } from 'date-fns';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';

export default function TransactionsScreen() {
  const { state, dispatch } = useContext(BudgetContext);
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      const fetchTransactions = async () => {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('forecasted_date', { ascending: true });

        if (error) {
          console.error('Error fetching transactions:', error);
        } else {
          dispatch({ type: 'SET_TRANSACTIONS', payload: data });
        }
      };

      fetchTransactions();
    }, [dispatch])
  );

  const transactions = useMemo(() => {
    const grouped = (state.transactions || []).reduce((acc, tx) => {
      const month = format(parseISO(tx.forecasted_date), 'MMMM yyyy');
      if (!acc[month]) acc[month] = [];
      acc[month].push(tx);
      return acc;
    }, {});

    const result = [];
    Object.entries(grouped)
      .sort(([a], [b]) => {
        const aDate = parse(`01 ${a}`, 'dd MMMM yyyy', new Date());
        const bDate = parse(`01 ${b}`, 'dd MMMM yyyy', new Date());
        return aDate - bDate;
      })
      .forEach(([month, txs]) => {
        result.push({ type: 'divider', month });
        txs
          .sort((a, b) => new Date(a.forecasted_date) - new Date(b.forecasted_date))
          .forEach(tx => {
            result.push({ type: 'transaction', ...tx });
          });
      });

    return result;
  }, [state.transactions]);

  const renderRightActions = (item) => {
    if (!item.forecasted) return null;

    return (
      <RectButton
        style={[styles.swipeButton, { backgroundColor: '#f44336' }]}
        onPress={() => {
          dispatch({
            type: 'DELETE_TRANSACTION',
            payload: { id: item.id }
          });
        }}
      >
        <Text style={styles.swipeText}>Delete</Text>
      </RectButton>
    );
  };

  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        {transactions.length === 0 ? (
          <Text style={styles.empty}>No forecasted transactions.</Text>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              if (item.type === 'divider') {
                return <Text style={styles.divider}>{item.month}</Text>;
              }
              return (
                <Swipeable renderRightActions={() => renderRightActions(item)}>
                  <RectButton
                    onPress={() =>
                      navigation.navigate('Confirm Transaction', {
                        forecastedTransaction: item
                      })
                    }
                    style={[
                      styles.transactionCard
                    ]}
                  >
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                          <Text style={styles.transactionName}>{item.description}</Text>
                          <Text style={styles.transactionDetails}>
                            {(state.accounts.find(acc => acc.id === item.account_id) || {}).name || ''} • {item.forecasted_date} -{' '}
                            {!item.forecasted && item.amount && parseFloat(item.amount) !== parseFloat(item.forecasted_amount) ? (
                              <>
                                <Text style={styles.strikethrough}>${item.forecasted_amount}</Text>{' '}
                                <Text>${parseFloat(item.amount).toFixed(2)}</Text>
                              </>
                            ) : (
                              `$${parseFloat(item.amount ?? item.forecasted_amount).toFixed(2)}`
                            )}
                          </Text>
                        </View>
                        {!item.forecasted && (
                          <MaterialIcons name="check-circle" size={24} color="green" />
                        )}
                      </View>
                    </View>
                  </RectButton>
                </Swipeable>
              );
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1, paddingBottom: 64, paddingTop: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  empty: { marginBottom: 20, color: 'gray' },
  accountCard: {
    backgroundColor: '#f2f2f2',
    padding: 12,
    marginBottom: 10,
    borderRadius: 6
  },
  accountName: { fontSize: 16, fontWeight: 'bold' },
  accountType: { fontSize: 14, color: '#666' },
  accountBalance: { marginTop: 4, fontWeight: '600' },
  buttonContainer: { marginTop: 20 },
  transactionCard: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  transactionName: {
    fontWeight: 'bold',
    fontSize: 16
  },
  transactionDetails: {
    color: '#666',
    marginTop: 4
  },
  divider: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#444'
  },
  swipeButton: {
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'flex-end',
    padding: 20,
    borderRadius: 6,
    marginBottom: 10
  },
  swipeText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: '#999'
  },
  deleteAllButton: {
    backgroundColor: '#ff3b30',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10
  },
  deleteAllText: {
    color: '#fff',
    fontWeight: 'bold'
  }
});