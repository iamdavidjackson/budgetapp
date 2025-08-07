import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions } from 'react-native';
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
        for (let i = 1; i < dailyBalances.length; i++) {
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
        monthDays
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
                  .map(({ account, starting, ending, min, max, interest, dailyBalances, monthDays }) => (
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
                            propsForBackgroundLines: {
                              stroke: '#eee',
                              strokeDasharray: '',
                              strokeWidth: 1
                            },
                            propsForVerticalLabels: {
                              opacity: 1
                            },
                            propsForHorizontalLabels: {
                              opacity: 1
                            }
                          }}
                          bezier
                          style={{ marginVertical: 8, borderRadius: 8 }}
                        />
                      </View>
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
});