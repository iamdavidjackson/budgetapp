import React, { useContext, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions } from 'react-native';
import { BudgetContext } from '../context/BudgetContext';
import { addMonths, format } from 'date-fns';
import { RectButton } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

export default function HomeScreen() {
  const { state } = useContext(BudgetContext);

  // State for expanded months (first month expanded by default)
  const firstMonth = format(addMonths(new Date(), 0), 'MMMM yyyy');
  const [expandedMonths, setExpandedMonths] = useState({ [firstMonth]: true });

  const toggleExpanded = (monthLabel) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthLabel]: !prev[monthLabel]
    }));
  };

  // Track previous ending balances for each account across months
  const previousEndingBalances = new Map();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accounts Forecast</Text>
      <ScrollView>
        {Array.from({ length: 12 }, (_, monthOffset) => {
          const monthDate = addMonths(new Date(), monthOffset);
          const monthLabel = format(monthDate, 'MMMM yyyy');
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
                (state.accounts || []).map((account) => {
                  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
                  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
                  const allTx = [...(state.transactions || []), ...(state.forecasted || [])];
                  const filtered = allTx.filter(
                    tx =>
                      (tx.accountId === account.id || tx.transferToAccountId === account.id) &&
                      new Date(tx.date) >= monthStart &&
                      new Date(tx.date) <= monthEnd
                  );

                  const overrideDateKey = format(monthStart, 'yyyy-MM-dd');
                  const accountOverrides = (state.balanceOverrides || []).filter(
                    o => o.accountId === account.id && o.date === overrideDateKey
                  );

                  const numDays = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
                  const monthDays = Array.from({ length: numDays }, (_, i) =>
                    format(new Date(monthDate.getFullYear(), monthDate.getMonth(), i + 1), 'yyyy-MM-dd')
                  );

                  let starting = accountOverrides.length > 0
                    ? parseFloat(accountOverrides[0].amount)
                    : previousEndingBalances.get(account.id) ?? 2000;

                  let balance = starting;
                  const dailyBalances = [balance];

                  monthDays.slice(1).forEach(day => {
                    const dailyTxs = filtered.filter(tx => format(new Date(tx.date), 'yyyy-MM-dd') === day);
                    dailyTxs.forEach(tx => {
                      const amount = parseFloat(tx.amount || tx.forecastedAmount || 0);
                      let delta = 0;

                      if (tx.type === 'income') {
                        delta = amount;
                      } else if (tx.type === 'expense') {
                        delta = -amount;
                      } else if (tx.type === 'transfer') {
                        if (tx.accountId === account.id) {
                          delta = -amount; // transfer out
                        } else if (tx.transferToAccountId === account.id) {
                          delta = amount; // transfer in
                        }
                      }
                      
                      balance += delta;
                    });

                    const override = (state.balanceOverrides || []).find(
                      o => o.accountId === account.id && o.date === day
                    );
                    if (override) {
                      balance = parseFloat(override.amount);
                    }

                    dailyBalances.push(balance);
                  });

                  const min = Math.min(...dailyBalances);
                  const max = Math.max(...dailyBalances);
                  const ending = dailyBalances[dailyBalances.length - 1];
                  previousEndingBalances.set(account.id, ending);

                  return (
                    <View key={account.id} style={styles.accountCard}>
                      <Text style={styles.accountName}>{account.name}</Text>
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
                          <Text style={styles.balanceLabel}>Min</Text>
                          <Text style={styles.balanceValue}>${Math.round(min)}</Text>
                        </View>
                        <View style={styles.balanceColumn}>
                          <Text style={styles.balanceLabel}>Max</Text>
                          <Text style={styles.balanceValue}>${Math.round(max)}</Text>
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
                              strokeDasharray: '', // solid line
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
                  );
                })}
            </View>
          );
        })}
      </ScrollView>
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