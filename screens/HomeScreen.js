import React, { useContext, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, FlatList } from 'react-native';
import { BudgetContext } from '../context/BudgetContext';
import { generateForecast } from '../utils/forecastUtils';
import { addMonths, format, parseISO } from 'date-fns';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accounts Forecast</Text>
      <FlatList
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={[0, 1, 2]}
        keyExtractor={(item) => item.toString()}
        renderItem={({ item: monthOffset }) => {
          const monthDate = addMonths(new Date(), monthOffset);
          const monthLabel = format(monthDate, 'MMMM yyyy');

          return (
            <View style={styles.carouselPage}>
              <Text style={styles.monthLabel}>{monthLabel}</Text>
              {(state.accounts || []).map(account => {
                const starting = Math.floor(Math.random() * 1000) + 100;
                const ending = starting + Math.floor(Math.random() * 1000) - 500;
                const min = Math.min(starting, ending) - Math.floor(Math.random() * 200);
                const max = Math.max(starting, ending) + Math.floor(Math.random() * 200);

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
                  </View>
                );
              })}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1, paddingBottom: 64, paddingTop: 64 },
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
});
  