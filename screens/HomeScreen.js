import React, { useContext, useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions } from 'react-native';
import { BudgetContext } from '../context/BudgetContext';
import { generateForecast } from '../utils/forecastUtils';
import { addMonths, format, parseISO } from 'date-fns';
import { RectButton } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

export default function HomeScreen() {
  const { state } = useContext(BudgetContext);
  const navigation = useNavigation();

  const forecastedItems = useMemo(() => {
    const endDate = addMonths(new Date(), 12);
    const forecast = generateForecast(state.recurring || [], endDate);

    // Build a lookup for confirmed transactions
    const transactionMap = new Map(
      (state.transactions || []).map(
        tx => [`${tx.sourceRecurringId}-${tx.date}`, true]
      )
    );

    const grouped = forecast.reduce((acc, tx) => {
      const month = format(parseISO(tx.date), 'MMMM yyyy');
      if (!acc[month]) acc[month] = [];
      acc[month].push(tx);
      return acc;
    }, {});

    const result = [];
    Object.entries(grouped).forEach(([month, txs]) => {
      result.push({ type: 'divider', month });
      txs.forEach(tx => {
        const key = `${tx.sourceRecurringId}-${tx.date}`;
        const confirmed = transactionMap.has(key);
        result.push({ type: 'transaction', ...tx, confirmed });
      });
    });

    return result;
  }, [state.recurring, state.transactions]);

  const renderRightActions = (item) => (
    <RectButton
      style={styles.swipeButton}
      onPress={() => navigation.navigate('Confirm Transaction', {
        forecastedTransaction: item
      })}
    >
      <Text style={styles.swipeText}>Confirm</Text>
    </RectButton>
  );

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
        {[0, 1, 2].map((monthOffset) => {
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
                      tx.accountId === account.id &&
                      new Date(tx.date) >= monthStart &&
                      new Date(tx.date) <= monthEnd
                  );
                  let starting = previousEndingBalances.get(account.id) ?? 2000;
                  let current = starting;
                  let min = current;
                  let max = current;

                  filtered
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .forEach(tx => {
                      const amount = parseFloat(tx.amount || tx.forecastedAmount || 0);
                      const isIncome = tx.type === 'income';
                      const delta = isIncome ? amount : -amount;
                      current += delta;
                      min = Math.min(min, current);
                      max = Math.max(max, current);
                    });

                  const ending = current;
                  previousEndingBalances.set(account.id, ending);

                  const monthDays = [];
                  const monthStartDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
                  const numDays = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
                  for (let i = 0; i < numDays; i++) {
                    const date = new Date(monthStartDate);
                    date.setDate(date.getDate() + i);
                    monthDays.push(format(date, 'yyyy-MM-dd'));
                  }

                  let balance = starting;
                  const dailyBalances = [];

                  monthDays.forEach(day => {
                    const dailyTxs = filtered.filter(tx => format(new Date(tx.date), 'yyyy-MM-dd') === day);
                    dailyTxs.forEach(tx => {
                      const amount = parseFloat(tx.amount || tx.forecastedAmount || 0);
                      const delta = tx.type === 'income' ? amount : -amount;
                      balance += delta;
                    });
                    dailyBalances.push(balance);
                  });

                  return (
                    <View key={account.id} style={styles.accountCard}>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <View style={styles.balanceRow}>
                        <View style={styles.balanceColumn}>
                          <Text style={styles.balanceLabel}>Start</Text>
                          <Text style={styles.balanceValue}>${starting}</Text>
                        </View>
                        <View style={styles.balanceColumn}>
                          <Text style={styles.balanceLabel}>End</Text>
                          <Text style={styles.balanceValue}>${ending}</Text>
                        </View>
                        <View style={styles.balanceColumn}>
                          <Text style={styles.balanceLabel}>Min</Text>
                          <Text style={styles.balanceValue}>${min}</Text>
                        </View>
                        <View style={styles.balanceColumn}>
                          <Text style={styles.balanceLabel}>Max</Text>
                          <Text style={styles.balanceValue}>${max}</Text>
                        </View>
                      </View>
                      <LineChart
                        data={{
                          labels: monthDays.map(d => d.slice(-2)),
                          datasets: [{ data: dailyBalances }]
                        }}
                        width={Dimensions.get('window').width - 40}
                        height={160}
                        chartConfig={{
                          backgroundColor: '#fff',
                          backgroundGradientFrom: '#fff',
                          backgroundGradientTo: '#fff',
                          decimalPlaces: 2,
                          color: () => '#007AFF',
                          labelColor: () => '#999',
                          propsForDots: { r: '2' }
                        }}
                        bezier
                        style={{ marginVertical: 8, borderRadius: 8 }}
                      />
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
});