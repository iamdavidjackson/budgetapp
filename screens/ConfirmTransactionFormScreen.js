import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Platform, Switch } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { format } from 'date-fns';
import { supabase } from '../utils/supabase';

export default function ConfirmTransactionFormScreen({ route, navigation }) {
  const { forecastedTransaction } = route.params;
  
  const [transactionData, setTransactionData] = useState(null);
  const [actualAmount, setActualAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date());
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const fetchTransaction = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', forecastedTransaction.id)
        .single();

      if (!error && data) {
        setTransactionData(data);
        setActualAmount(data.amount?.toString() || '');
        if (data.date) {
          setDate(new Date(data.date));
        }
        setConfirmed(!data.forecasted);
      }
      setLoading(false);
    };

    fetchTransaction();
  }, [forecastedTransaction]);

  const handleConfirm = async () => {
    if (!actualAmount.trim() || !transactionData) return;
    setLoading(true);
    const { error } = await supabase
      .from('transactions')
      .update({
        amount: confirmed ? parseFloat(actualAmount) : null,
        forecasted: !confirmed,
        date: date.toISOString().split('T')[0]
      })
      .eq('id', transactionData.id);

    setLoading(false);
    if (!error) {
      navigation.goBack();
    } else {
      console.error('Error updating transaction:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Name</Text>
      <Text style={styles.value}>{transactionData?.description}</Text>

      <Text style={styles.label}>Date</Text>
      <Text style={styles.value}>{transactionData?.forecasted_date}</Text>

      <Text style={styles.label}>Forecasted Amount</Text>
      <Text style={styles.value}>${parseFloat(transactionData?.forecasted_amount || 0).toFixed(2)}</Text>

      <Text style={styles.label}>Confirmed</Text>
      <Switch value={confirmed} onValueChange={setConfirmed} />

      <Text style={styles.label}>Actual Amount</Text>
      <TextInput
        style={styles.input}
        value={actualAmount}
        onChangeText={setActualAmount}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Actual Date</Text>
      {Platform.OS === 'web' ? (
        <input
          type="date"
          value={date.toISOString().split('T')[0]}
          onChange={(e) => {
            const [year, month, day] = e.target.value.split('-').map(Number);
            setDate(new Date(year, month - 1, day));
          }}
          style={{
            padding: 8,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: '#ccc',
            marginTop: 8,
            fontSize: 16,
          }}
        />
      ) : (
        <>
          <Button title={format(date, 'yyyy-MM-dd')} onPress={() => setDatePickerVisible(true)} />
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="date"
            date={date}
            onConfirm={(selectedDate) => {
              setDatePickerVisible(false);
              setDate(selectedDate);
            }}
            onCancel={() => setDatePickerVisible(false)}
          />
        </>
      )}

      <Button title="Confirm Transaction" onPress={handleConfirm} />

      <View style={{ marginTop: 24 }}>
        <Button
          title="Delete Transaction"
          color="red"
          onPress={async () => {
            if (!transactionData) return;
            setLoading(true);
            const { error } = await supabase
              .from('transactions')
              .delete()
              .eq('id', transactionData.id);

            setLoading(false);
            if (!error) {
              navigation.goBack();
            } else {
              console.error('Error deleting transaction:', error);
            }
          }}
        />
      </View>
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