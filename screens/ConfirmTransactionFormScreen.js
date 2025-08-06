import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, TouchableOpacity, ActivityIndicator, Platform, Switch } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { format } from 'date-fns';
import { supabase } from '../utils/supabase';
import { screenStyles } from '../styles/screens';

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
      <View style={screenStyles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={screenStyles.container}>
      <Text style={screenStyles.label}>Name</Text>
      <TextInput
        style={[screenStyles.input, { backgroundColor: '#eee' }]}
        value={transactionData?.description || ''}
        editable={false}
      />

      <Text style={screenStyles.label}>Date</Text>
      <TextInput
        style={[screenStyles.input, { backgroundColor: '#eee' }]}
        value={transactionData?.forecasted_date || ''}
        editable={false}
      />

      <Text style={screenStyles.label}>Forecasted Amount</Text>
      <TextInput
        style={[screenStyles.input, { backgroundColor: '#eee' }]}
        value={`$${parseFloat(transactionData?.forecasted_amount || 0).toFixed(2)}`}
        editable={false}
      />

      <Text style={screenStyles.label}>Confirmed</Text>
      <Switch value={confirmed} onValueChange={setConfirmed} />

      <Text style={screenStyles.label}>Actual Amount</Text>
      <TextInput
        style={screenStyles.input}
        value={actualAmount}
        onChangeText={setActualAmount}
        keyboardType="decimal-pad"
      />

      <Text style={screenStyles.label}>Actual Date</Text>
      {Platform.OS === 'web' ? (
        <input
          type="date"
          value={date.toISOString().split('T')[0]}
          onChange={(e) => {
            const [year, month, day] = e.target.value.split('-').map(Number);
            setDate(new Date(year, month - 1, day));
          }}
          style={screenStyles.input}
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

      
      <View style={screenStyles.buttons}>
        <TouchableOpacity onPress={handleConfirm} style={screenStyles.primaryButton}>
          <Text style={screenStyles.primaryButtonText}>Confirm Transaction</Text>
        </TouchableOpacity>

        <TouchableOpacity
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
          style={screenStyles.secondaryButton}
        >
          <Text style={screenStyles.secondaryButtonText}>Delete Transaction</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}