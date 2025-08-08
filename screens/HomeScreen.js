import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { addMonths, format, startOfDay, endOfDay } from 'date-fns';
import { RectButton } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { supabase } from '../utils/supabase';
import { Picker } from '@react-native-picker/picker';

function computeMonthlyAccountBalances(transactions, balanceOverrides, accounts) {
  const previousEndingBalances = new Map();
  return Array.from({ length: 12 }, (_, monthOffset) => {
    const monthDate = addMonths(new Date(), monthOffset);
    const monthLabel = format(monthDate, 'MMMM yyyy');
    const monthStart = startOfDay(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1));
    const monthEnd = endOfDay(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0));

    const overrideDateKey = format(monthStart, 'yyyy-MM-dd');
    const numDays = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const monthDays = Array.from({ length: numDays }, (_, i) =>
      format(new Date(monthDate.getFullYear(), monthDate.getMonth(), i + 1), 'yyyy-MM-dd')
    );

    const accountsData = accounts.map((account) => {
      const filtered = transactions.filter(
        tx =>
          (tx.account_id === account.id || tx.secondary_account_id === account.id) &&
          new Date(tx.date) >= monthStart &&
          new Date(tx.date) <= monthEnd
      );

      const accountOverrides = (balanceOverrides || []).filter(
        o => o.account_id === account.id && o.date === overrideDateKey
      );

      let starting = accountOverrides.length > 0
        ? parseFloat(accountOverrides[0].amount)
        : previousEndingBalances.get(account.id) ?? 2000;

      // Apply interest if no override and account has interest_rate
      let interestApplied = 0;
      if (accountOverrides.length === 0 && account.interest_rate) {
        const prevEnd = previousEndingBalances.get(account.id) ?? 2000;
        const monthlyInterest = (prevEnd * (parseFloat(account.interest_rate) / 12 / 100));
        starting += monthlyInterest;
        interestApplied = monthlyInterest;
      }

      // Build ledger entries for this month/account, including balance overrides as ledger entries
      let sortedTxs = [...filtered].sort((a, b) => new Date(a.date || a.forecasted_date) - new Date(b.date || b.forecasted_date));
      // Find all balance overrides for this account within this month
      const overridesInMonth = (balanceOverrides || []).filter(
        o =>
          o.account_id === account.id &&
          new Date(o.date) >= monthStart &&
          new Date(o.date) <= monthEnd
      );
      // Prepare override ledger entries
      let runningBalance = starting;
      // We'll build a combined list of txs and overrides, then sort by date
      let combinedEntries = [
        ...sortedTxs.map(tx => ({
          ...tx,
          _isOverride: false,
          _date: tx.date || tx.forecasted_date
        })),
        ...overridesInMonth.map(o => ({
          _isOverride: true,
          _overrideObj: o,
          _date: o.date
        }))
      ];
      combinedEntries.sort((a, b) => new Date(a._date) - new Date(b._date));
      const ledgerEntries = [];
      combinedEntries.forEach((entry) => {
        if (entry._isOverride) {
          // Create override ledger entry
          const o = entry._overrideObj;
          const overrideAmount = parseFloat(o.amount);
          const delta = overrideAmount - runningBalance;
          runningBalance = overrideAmount;
          ledgerEntries.push({
            id: `override-id-${o.id}`,
            date: o.date,
            description: "Balance Override",
            amount: delta,
            balance: runningBalance,
            type: "override",
          });
        } else {
          const tx = entry;
          const amt = parseFloat(tx.amount ?? tx.forecasted_amount ?? 0);
          let delta = 0;
          if (tx.type === 'income') {
            delta = amt;
          } else if (tx.type === 'expense') {
            delta = -amt;
          } else if (tx.type === 'transfer') {
            if (tx.account_id === account.id) {
              delta = -amt;
            } else if (tx.secondary_account_id === account.id) {
              delta = amt;
            }
          }
          runningBalance += delta;
          ledgerEntries.push({
            id: tx.id,
            date: tx.date || tx.forecasted_date,
            description: tx.description,
            amount: delta,
            balance: runningBalance,
            type: tx.type,
          });
        }
      });

      let balance = starting;
      // Add interest to all daily balances at the start of the month
      const dailyBalances = [balance];

      monthDays.slice(1).forEach(day => {
        const dailyTxs = filtered.filter(tx => format(new Date(tx.date), 'yyyy-MM-dd') === day);
        dailyTxs.forEach(tx => {
          const amount = parseFloat(tx.amount || tx.forecasted_amount || 0);
          let delta = 0;

          if (tx.type === 'income') {
            delta = amount;
          } else if (tx.type === 'expense') {
            delta = -amount;
          } else if (tx.type === 'transfer') {
            if (tx.account_id === account.id) {
              delta = -amount;
            } else if (tx.secondary_account_id === account.id) {
              delta = amount;
            }
          }

          balance += delta;
        });

        const override = (balanceOverrides || []).find(
          o => o.account_id === account.id && o.date === day
        );
        if (override) {
          balance = parseFloat(override.amount);
        }

        dailyBalances.push(balance);
      });

      // If interest was applied, adjust all dailyBalances by adding interestApplied at the start
      // (already added to starting, so only need to add to all other dailyBalances as well)
      if (interestApplied !== 0) {
        for (let i = 0; i < dailyBalances.length; i++) {
          dailyBalances[i] += interestApplied;
        }
      }

      const min = Math.min(...dailyBalances);
      const max = Math.max(...dailyBalances);
      const ending = dailyBalances[dailyBalances.length - 1];
      previousEndingBalances.set(account.id, ending);

      return {
        account,
        starting,
        ending,
        min,
        max,
        interest: interestApplied,
        dailyBalances,
        monthDays,
        ledgerEntries
      };
    });

    return { monthLabel, accountsData };
  });
}

export default function HomeScreen() {
  const [transactions, setTransactions] = useState([]);
  const [balanceOverrides, setBalanceOverrides] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [viewMode, setViewMode] = useState('chart'); // 'chart' | 'ledger'
  const navigation = useNavigation();

  useEffect(() => {
    const fetchAccounts = async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*');

      if (!error) {
        setAccounts(data);
      } else {
        console.error('Error fetching accounts', error);
      }
    };

    fetchAccounts();
  }, []);

  useEffect(() => {
    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('forecasted_date', { ascending: true });

      if (!error) {
        setTransactions(data);
      } else {
        console.error('Error fetching transactions', error);
      }
    };

    fetchTransactions();
  }, []);

  useEffect(() => {
    const fetchOverrides = async () => {
      const { data, error } = await supabase
        .from('balances')
        .select('*');

      if (!error) {
        setBalanceOverrides(data);
      } else {
        console.error('Error fetching balance overrides', error);
      }
    };

    fetchOverrides();
  }, []);

  // State for expanded months (first month expanded by default)
  const firstMonth = format(addMonths(new Date(), 0), 'MMMM yyyy');
  const [expandedMonths, setExpandedMonths] = useState({ [firstMonth]: true });

  const toggleExpanded = (monthLabel) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthLabel]: !prev[monthLabel]
    }));
  };

  const monthlyAccountData = useMemo(() => {
    return computeMonthlyAccountBalances(transactions, balanceOverrides, accounts);
  }, [transactions, balanceOverrides, accounts]);
  const [filteredMonthlyData, setFilteredMonthlyData] = useState(monthlyAccountData);

  useEffect(() => {
    if (selectedAccountId === null) {
      setFilteredMonthlyData(monthlyAccountData);
    } else {
      const filtered = monthlyAccountData.map(({ monthLabel, accountsData }) => {
        
        const data = {
          monthLabel,
          accountsData: []
        }

        accountsData.forEach(({ account, ...rest }) => {
          if (Number(account.id) === Number(selectedAccountId)) {
            data.accountsData.push({ account, ...rest });
          }
        });

        return data;
      });
      
      setFilteredMonthlyData(filtered);
    }
  }, [selectedAccountId, monthlyAccountData]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accounts Forecast</Text>
      <Picker
        selectedValue={selectedAccountId}
        onValueChange={(itemValue) => {
          setSelectedAccountId(itemValue)
        }}
        style={{ backgroundColor: '#fff', marginBottom: 12, borderRadius: 4 }}
      >
        <Picker.Item label="All Accounts" value={null} />
        {accounts.map((account) => (
          <Picker.Item key={account.id} label={account.name} value={account.id} />
        ))}
      </Picker>
      <View style={styles.viewToggle}>
        <TouchableOpacity
          onPress={() => setViewMode('chart')}
          style={[styles.toggleBtn, viewMode === 'chart' && styles.toggleBtnActive]}
        >
          <Text style={[styles.toggleText, viewMode === 'chart' && styles.toggleTextActive]}>Chart View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode('ledger')}
          style={[styles.toggleBtn, viewMode === 'ledger' && styles.toggleBtnActive]}
        >
          <Text style={[styles.toggleText, viewMode === 'ledger' && styles.toggleTextActive]}>Ledger View</Text>
        </TouchableOpacity>
      </View>
      <ScrollView>
        {filteredMonthlyData.map(({ monthLabel, accountsData }) => {
          const expanded = expandedMonths[monthLabel] || false;
          return (
            <View key={monthLabel} style={{ marginBottom: 12 }}>
              <RectButton onPress={() => toggleExpanded(monthLabel)} style={styles.accordionHeader}>
                <Text style={styles.monthLabel}>{monthLabel}</Text>
                <MaterialIcons
                  name={expanded ? 'expand-less' : 'expand-more'}
                  size={24}
                  color="#333"
                />
              </RectButton>
              {expanded &&
                (accountsData || [])
                  .map(({ account, starting, ending, min, max, interest, dailyBalances, monthDays, ledgerEntries }) => (
                    <View key={account.id} style={styles.accountCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.accountName}>{account.name}</Text>
                        <Text style={styles.minMax}>
                          Min: ${Math.round(min)} | Max: ${Math.round(max)}
                        </Text>
                      </View>
                      <View style={styles.balanceRow}>
                        <View style={styles.balanceColumn}>
                          <Text style={styles.balanceLabel}>Start</Text>
                          <Text style={styles.balanceValue}>${Math.round(starting)}</Text>
                        </View>
                        <View style={styles.balanceColumn}>
                          <Text style={styles.balanceLabel}>End</Text>
                          <Text style={styles.balanceValue}>${Math.round(ending)}</Text>
                        </View>
                        <View style={styles.balanceColumn}>
                          <Text style={styles.balanceLabel}>Interest</Text>
                          <Text style={styles.balanceValue}>${Math.round(interest)}</Text>
                        </View>
                      </View>
                      {viewMode === 'chart' ? (
                        <View style={styles.chartContainer}>
                          <LineChart
                            data={{
                              labels: monthDays.map((d, index) => {
                                const showEvery = Math.ceil(monthDays.length / 10);
                                return index % showEvery === 0 ? d.slice(-2) : '';
                              }),
                              datasets: [{ data: dailyBalances }]
                            }}
                            width={Dimensions.get('window').width - 60}
                            height={160}
                            chartConfig={{
                              backgroundColor: '#fff',
                              backgroundGradientFrom: '#fff',
                              backgroundGradientTo: '#fff',
                              decimalPlaces: 0,
                              color: () => '#007AFF',
                              labelColor: () => '#999',
                              formatYLabel: (yValue) => parseInt(yValue).toString(),
                              propsForDots: { r: '2' },
                              propsForBackgroundLines: { stroke: '#eee', strokeDasharray: '', strokeWidth: 1 },
                              propsForVerticalLabels: { opacity: 1 },
                              propsForHorizontalLabels: { opacity: 1 }
                            }}
                            bezier
                            style={{ marginVertical: 8, borderRadius: 8 }}
                          />
                        </View>
                      ) : (
                        <View style={styles.ledgerContainer}>
                          {ledgerEntries.length === 0 ? (
                            <Text style={styles.empty}>No transactions this month.</Text>
                          ) : (
                            ledgerEntries.map((entry) => {
                              const key = entry.id ?? `${account.id}-${entry.date}-${entry.description}`;
                              const tx = typeof entry.id === 'number' ? transactions.find(t => t.id === entry.id) : null;
                              const canOpen = tx?.forecasted === true; // only allow opening unconfirmed (forecasted) txs

                              const onPress = () => {
                                if (tx?.id) {
                                  navigation.navigate('Edit Transaction', { forecastedTransaction: tx });
                                }
                              };

                              return (
                                <TouchableOpacity key={key} onPress={onPress} activeOpacity={canOpen ? 0.6 : 1}>
                                  <View style={styles.ledgerRow}>
                                    <Text style={styles.ledgerDate}>{format(new Date(entry.date), 'MMM d')}</Text>
                                    <Text style={styles.ledgerDesc} numberOfLines={1}>
                                      {entry.description}
                                    </Text>
                                    <Text style={[styles.ledgerAmount, entry.amount >= 0 ? styles.amountPos : styles.amountNeg]}>
                                      {entry.amount >= 0 ? `+${entry.amount.toFixed(2)}` : entry.amount.toFixed(2)}
                                    </Text>
                                    <Text style={styles.ledgerBalance}>{`$${Math.round(entry.balance)}`}</Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            })
                          )}
                        </View>
                      )}
                    </View>
                  ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1, paddingBottom: 0, paddingTop: 0 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, marginTop: 16 },
  empty: { marginBottom: 20, color: 'gray' },
  accountCard: {
    backgroundColor: '#f2f2f2',
    padding: 12,
    marginBottom: 10,
    borderRadius: 6
  },
  accountName: { fontSize: 16, fontWeight: 'bold' },
  minMax: {
    fontSize: 12,
    color: '#666'
  },
  // accountType removed
  // accountBalance removed
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
  carouselPage: {
    width: 300,
    marginRight: 16
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  balanceColumn: {
    flex: 1,
    alignItems: 'center'
  },
  balanceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '600'
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#eee',
    borderRadius: 4
  },
  chartContainer: {
    backgroundColor: '#fff',
    padding: 10,
    paddingLeft: 0,
    borderRadius: 8,
    marginTop: 10
  },
  viewToggle: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#ddd', overflow: 'hidden', marginBottom: 12 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#e6f5ec' },
  toggleText: { color: '#333', fontWeight: '600' },
  toggleTextActive: { color: '#2e7d32' },
  ledgerContainer: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee', paddingVertical: 6, marginTop: 8 },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  ledgerDate: { width: 64, color: '#666' },
  ledgerDesc: { flex: 1, marginHorizontal: 8 },
  ledgerAmount: { width: 90, textAlign: 'right', fontVariant: ['tabular-nums'] },
  ledgerBalance: { width: 80, textAlign: 'right', color: '#333', fontWeight: '600' },
  amountPos: { color: '#2e7d32' },
  amountNeg: { color: '#c62828' },
});