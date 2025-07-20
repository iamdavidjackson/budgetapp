import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { BudgetContext } from '../context/BudgetContext';

export default function ConfirmTransactionFormScreen({ route, navigation }) {
  const { forecastedTransaction: forecast } = route.params;
  const { dispatch } = useContext(BudgetContext);

  const [actualAmount, setActualAmount] = useState(forecast.amount?.toString() || '');

  const handleConfirm = () => {
    if (!actualAmount.trim()) return;

    dispatch({
      type: 'ADD_TRANSACTION',
      payload: {
        id: Date.now().toString(),
        name: forecast.name,
        date: forecast.date,
        amount: parseFloat(actualAmount),
        forecastedAmount: forecast.amount,
        category: forecast.category,
        type: forecast.type,
        accountId: forecast.accountId,
        transferToAccountId: forecast.transferToAccountId,
        sourceRecurringId: forecast.sourceRecurringId,
        forecastId: forecast.id,
      }
    });

    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Name</Text>
      <Text style={styles.value}>{forecast.name}</Text>

      <Text style={styles.label}>Date</Text>
      <Text style={styles.value}>{forecast.date}</Text>

      <Text style={styles.label}>Forecasted Amount</Text>
      <Text style={styles.value}>${parseFloat(forecast.amount).toFixed(2)}</Text>

      <Text style={styles.label}>Actual Amount</Text>
      <TextInput
        style={styles.input}
        value={actualAmount}
        onChangeText={setActualAmount}
        keyboardType="decimal-pad"
      />

      <Button title="Confirm Transaction" onPress={handleConfirm} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1
  },
  label: {
    marginTop: 16,
    fontWeight: 'bold'
  },
  value: {
    fontSize: 16,
    marginTop: 4
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginTop: 8,
    borderRadius: 4
  },
  error: {
    color: 'red',
    fontSize: 16
  }
});