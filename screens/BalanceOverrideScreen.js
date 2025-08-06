import { screenStyles } from '../styles/screens';
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';

import { supabase } from '../utils/supabase';

const BalanceOverrideScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { accountId } = route.params;

  const [date, setDate] = useState(new Date());
  const [amount, setAmount] = useState(0);
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
      setLoading(false);
      return;
    }

    setLoading(false);
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={screenStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={screenStyles.container}>
      <Text style={screenStyles.label}>Amount</Text>
      <TextInput
        style={screenStyles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />
      
      <Text style={screenStyles.label}>Date</Text>
      {Platform.OS === 'web' ? (
        <input
          type="date"
          value={format(date, 'yyyy-MM-dd')}
          onChange={(e) => setDate(new Date(e.target.value))}
          style={screenStyles.input}
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

      <View style={screenStyles.buttons}>
        <TouchableOpacity onPress={handleSave} style={screenStyles.primaryButton}>
          <Text style={screenStyles.primaryButtonText}>Save Balance</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default BalanceOverrideScreen;