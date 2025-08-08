import React, { useMemo, useState, useCallback, useLayoutEffect, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { format, parseISO, parse, set } from 'date-fns';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';

// Parse a YYYY-MM-DD string as a local date to avoid TZ shifting
const parseLocalDateStr = (str) => {
  if (!str || typeof str !== 'string') return new Date();
  const parts = str.split('-').map(Number);
  if (parts.length >= 3) {
    const [y, m, d] = parts;
    return new Date(y, (m || 1) - 1, d || 1);
  }
  // Fallback
  return new Date(str);
};

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);

  const [expandedMonths, setExpandedMonths] = useState({});
  const toggleMonth = (month) => {
    setExpandedMonths((prev) => ({ ...prev, [month]: !(prev[month] ?? false) }));
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Add Transaction')}
          style={{
            marginRight: 20,
            backgroundColor: '#4CAF50',
            borderRadius: 20,
            width: 30,
            height: 30,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <MaterialIcons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const fetchTransactions = async () => {
        setLoading(true);
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: true });

        const { data: accountsData, error: accountsError } = await supabase
          .from('accounts')
          .select('*');

        if (transactionsError) {
          console.error('Error fetching transactions:', transactionsError);
        } else {
          setTransactions(transactionsData);
        }

        if (accountsError) {
          console.error('Error fetching accounts:', accountsError);
        } else {
          setAccounts(accountsData);
        }

        setLoading(false);
      };

      fetchTransactions();
    }, [])
  );

  const groupedTransactions = useMemo(() => {
    const grouped = (transactions || []).reduce((acc, tx) => {
      const month = format(parseLocalDateStr(tx.forecasted_date), 'MMMM yyyy');
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
          .sort((a, b) => parseLocalDateStr(a.forecasted_date) - parseLocalDateStr(b.forecasted_date))
          .forEach(tx => {
            result.push({ type: 'transaction', month, ...tx });
          });
      });

    return result;
  }, [transactions]);

  // Set expandedMonths so that only the first month is expanded by default
  useEffect(() => {
    // Find all divider months in groupedTransactions
    const dividerMonths = groupedTransactions
      .filter(item => item.type === 'divider')
      .map(item => item.month);
    if (dividerMonths.length === 0) return;
    const firstMonth = dividerMonths[0];
    // Set expanded state: first month true, others false
    setExpandedMonths(() => {
      const newExpanded = {};
      dividerMonths.forEach((m, idx) => {
        newExpanded[m] = idx === 0; // only first open by default
      });
      return newExpanded;
    });
  }, [groupedTransactions]);

  const renderRightActions = (item) => {
    if (!item.forecasted) return null;

    return (
      <RectButton
        style={[styles.swipeButton, { backgroundColor: '#f44336' }]}
        onPress={async () => {
          try {
            setLoading(true);
            const { error } = await supabase
              .from('transactions')
              .delete()
              .eq('id', item.id);

            if (error) {
              console.error('Error deleting transaction:', error);
              return;
            }

            setTransactions(prev => prev.filter(tx => tx.id !== item.id));
            setLoading(false);
          } catch (err) {
            console.error('Unexpected error deleting transaction:', err);
            setLoading(false);
          }
        }}
      >
        <Text style={styles.swipeText}>Delete</Text>
      </RectButton>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        {groupedTransactions.length === 0 ? (
          <Text style={styles.empty}>No forecasted transactions.</Text>
        ) : (
          <FlatList
            data={groupedTransactions}
            keyExtractor={(item) => item.id || item.month}
            renderItem={({ item }) => {
              if (item.type === 'divider') {
                const isExpanded = expandedMonths[item.month] ?? false;
                return (
                  <RectButton onPress={() => toggleMonth(item.month)} style={styles.dividerRow}>
                    <Text style={styles.divider}>{item.month}</Text>
                    <MaterialIcons name={isExpanded ? 'expand-less' : 'expand-more'} size={22} color="#444" />
                  </RectButton>
                );
              }
              const isExpanded = expandedMonths[item.month] ?? false;
              if (!isExpanded) return null;
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
                        <View style={{ flex: 1 }}>
                          <Text style={styles.transactionDate}>
                           {format(parseLocalDateStr(item.date || item.forecasted_date), 'EEEE, do')}
                          </Text>
                          <Text style={styles.transactionName}>{item.description}</Text>
                          <Text style={styles.transactionDetails}>
                            {(() => {
                              const accountFrom = accounts.find(acc => acc.id === item.account_id)?.name || 'Unknown Account';
                              const accountTo = accounts.find(acc => acc.id === item.secondary_account_id)?.name || 'Unknown Account';
                              const amountDisplay = !item.forecasted && item.amount && parseFloat(item.amount) !== parseFloat(item.forecasted_amount) ? (
                                <>
                                  <Text style={styles.strikethrough}>${item.forecasted_amount}</Text>{' '}
                                  <Text>${parseFloat(item.amount).toFixed(2)}</Text>
                                </>
                              ) : (
                                <Text>${parseFloat(item.amount ?? item.forecasted_amount).toFixed(2)}</Text>
                              );

                              switch (item.type) {
                                case 'income':
                                  return (
                                    <>
                                      <Text>Income to {accountFrom}: </Text>
                                      {amountDisplay}
                                    </>
                                  );
                                case 'expense':
                                  return (
                                    <>
                                      <Text>Expense from {accountFrom}: </Text>
                                      {amountDisplay}
                                    </>
                                  );
                                case 'transfer':
                                  return (
                                    <>
                                      <Text>Transfer from {accountFrom} to {accountTo}: </Text>
                                      {amountDisplay}
                                    </>
                                  );
                                default:
                                  return (
                                    <>
                                      <Text>{accountFrom}: </Text>
                                      {amountDisplay}
                                    </>
                                  );
                              }
                            })()}
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
  container: { padding: 16, flex: 1, paddingBottom: 0, paddingTop: 0 },
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
  transactionDate: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});