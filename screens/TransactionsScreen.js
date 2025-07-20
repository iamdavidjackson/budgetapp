import React, { useContext, useMemo, useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TouchableOpacity } from 'react-native';
import { BudgetContext } from '../context/BudgetContext';
import { addMonths, format, parseISO, parse } from 'date-fns';
import { generateForecast } from '../utils/forecastUtils';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

export default function TransactionsScreen() {
  const { state, dispatch } = useContext(BudgetContext);
  const navigation = useNavigation();
  const [locallyConfirmed, setLocallyConfirmed] = useState(new Set());

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => {
          dispatch({
            type: 'GENERATE_FORECASTED_ITEMS',
            payload: {
              generateForecast,
              endDate: addMonths(new Date(), 12)
            }
          });
        }}>
          <Ionicons name="refresh" size={28} color="#007AFF" />
        </Pressable>
      )
    });
  }, [navigation, dispatch]);

  const forecastedItems = useMemo(() => {
    const transactionMap = new Map(
      (state.transactions || []).map(
        tx => [`${tx.sourceRecurringId}-${tx.date}`, true]
      )
    );

    const grouped = (state.forecasted || []).reduce((acc, tx) => {
      const month = format(parseISO(tx.date), 'MMMM yyyy');
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
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .forEach(tx => {
            const key = `${tx.sourceRecurringId}-${tx.date}`;
            const confirmed = transactionMap.has(key);
            const transaction = state.transactions.find(t => t.sourceRecurringId === tx.sourceRecurringId && t.date === tx.date);
            const locally = locallyConfirmed.has(key);
            result.push({ type: 'transaction', ...tx, ...transaction, confirmed: confirmed || locally });
          });
      });
    return result;
  }, [state.forecasted, state.transactions, locallyConfirmed]);

  const renderRightActions = (item) => {
    const key = `${item.sourceRecurringId}-${item.date}`;
    if (!item.confirmed && !locallyConfirmed.has(key)) return null;

    return (
      <RectButton
        style={[styles.swipeButton, { backgroundColor: '#f44336' }]}
        onPress={() => {
          dispatch({
            type: 'DELETE_TRANSACTION',
            payload: { sourceRecurringId: item.sourceRecurringId, date: item.date }
          });
          setLocallyConfirmed(prev => {
            const newSet = new Set(prev);
            newSet.delete(key);
            return newSet;
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
        {forecastedItems.length === 0 ? (
          <Text style={styles.empty}>No forecasted transactions.</Text>
        ) : (
          <FlatList
            data={forecastedItems}
            keyExtractor={(item, idx) =>
              item.type === 'divider' ? `divider-${item.month}` : item.id
            }
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
                    enabled={!item.confirmed}
                    style={[
                      styles.transactionCard,
                      item.confirmed && { opacity: 0.5 }
                    ]}
                  >
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                          <Text style={styles.transactionName}>{item.name}</Text>
                          <Text style={styles.transactionDetails}>
                            {(state.accounts.find(acc => acc.id === item.accountId) || {}).name || ''} • {item.date} -{' '}
                            {item.confirmed && item.amount && parseFloat(item.amount) !== parseFloat(item.forecastedAmount) ? (
                              <>
                                <Text style={styles.strikethrough}>${item.forecastedAmount}</Text>{' '}
                                <Text>${parseFloat(item.amount).toFixed(2)}</Text>
                              </>
                            ) : (
                              `$${parseFloat(item.amount ?? item.forecastedAmount).toFixed(2)}`
                            )}
                          </Text>
                        </View>
                        {item.confirmed && (
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