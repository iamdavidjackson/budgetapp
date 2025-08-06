import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';

import { supabase } from '../utils/supabase';

const BalanceOverrideScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { accountId } = route.params;

  const [date, setDate] = useState(new Date());
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirm = (selectedDate) => {
    setDate(selectedDate);
    hideDatePicker();
  };

  const handleSave = async () => {
    if (!amount) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('balances').insert([
      {
        account_id: accountId,
        date: format(date, 'yyyy-MM-dd'),
        amount: parseFloat(amount),
        user_id: user.id
      }
    ]);

    if (error) {
      console.error('Error saving balance to Supabase:', error);
      setLoading(false);
      return;
    }

    setLoading(false);
    navigation.goBack();
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
      <Text style={styles.label}>Date</Text>
      {Platform.OS === 'web' ? (
        <input
          type="date"
          value={format(date, 'yyyy-MM-dd')}
          onChange={(e) => setDate(new Date(e.target.value))}
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
          <Button title={format(date, 'yyyy-MM-dd')} onPress={showDatePicker} />
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="date"
            date={date}
            onConfirm={handleConfirm}
            onCancel={hideDatePicker}
          />
        </>
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
    padding: 16,
    paddingBottom: 0,
    paddingTop: 0
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default BalanceOverrideScreen;