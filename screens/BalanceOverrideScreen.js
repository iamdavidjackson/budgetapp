

import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { BudgetContext } from '../context/BudgetContext';
import { format } from 'date-fns';

const BalanceOverrideScreen = () => {
  const { dispatch } = useContext(BudgetContext);
  const route = useRoute();
  const navigation = useNavigation();
  const { accountId } = route.params;

  const [date, setDate] = useState(new Date());
  const [amount, setAmount] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSave = () => {
    if (!amount) return;
    dispatch({
      type: 'ADD_BALANCE_OVERRIDE',
      payload: {
        accountId,
        date: format(date, 'yyyy-MM-dd'),
        amount: parseFloat(amount)
      }
    });
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Date</Text>
      <Button title={format(date, 'yyyy-MM-dd')} onPress={() => setShowDatePicker(true)} />
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}

      <Text style={styles.label}>Amount</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="Enter balance"
      />

      <Button title="Save Override" onPress={handleSave} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  label: {
    fontSize: 16,
    marginTop: 16
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 4,
    marginTop: 8
  }
});

export default BalanceOverrideScreen;