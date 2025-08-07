import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TextInput, Button, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../utils/supabase';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {screenStyles} from '../styles/screens';

export default function AddTransactionScreen({ navigation }) {
  const [accounts, setAccounts] = useState([]);

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [accountId, setAccountId] = useState('');
  const [transferToAccountId, setTransferToAccountId] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('accounts').select('*');
      if (error) {
        console.error('Error fetching accounts:', error);
      } else {
        setAccounts(data);
        if (!accountId && data.length > 0) {
          setAccountId(data[0].id);
        }
      }
      setLoading(false);
    };
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);
  const handleConfirm = (selectedDate) => {
    setDate(selectedDate);
    hideDatePicker();
  };

  const onSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!amount || !description || !category || !accountId) {
      alert('Please fill in all required fields.');
      return;
    }

    const { error } = await supabase.from('transactions').insert([
      {
        type,
        amount: parseFloat(amount),
        forecasted_amount: parseFloat(amount),
        category,
        description,
        date: date.toISOString().split('T')[0],
        forecasted_date: date.toISOString().split('T')[0],
        forecasted: false,
        account_id: accountId,
        secondary_account_id: type === 'transfer' ? transferToAccountId : null,
        recurring_id: null,
        user_id: user.id,
      }
    ]);

    if (error) {
      console.error('Error saving transaction:', error);
      alert('Failed to save transaction.');
    } else {
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <View style={screenStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={screenStyles.container}>
      <Text style={screenStyles.label}>Type</Text>
      <Picker selectedValue={type} onValueChange={setType} style={screenStyles.picker}>
        <Picker.Item label="Select a type" value="" />
        <Picker.Item label="Income" value="income" />
        <Picker.Item label="Expense" value="expense" />
        <Picker.Item label="Transfer" value="transfer" />
      </Picker>

      <Text style={screenStyles.label}>Amount</Text>
      <TextInput style={screenStyles.input} keyboardType="numeric" value={amount} onChangeText={setAmount} />

      <Text style={screenStyles.label}>Category</Text>
      <Picker selectedValue={category} onValueChange={setCategory} style={screenStyles.picker}>
        <Picker.Item label="Select a category" value="" />
        <Picker.Item label="Essential – Fixed (e.g. rent, salary)" value="essential_fixed" />
        <Picker.Item label="Essential – Variable (e.g. groceries, utilities)" value="essential_variable" />
        <Picker.Item label="Flexible – Regular but Optional (e.g. subscriptions)" value="flexible" />
        <Picker.Item label="Discretionary – Optional (e.g. entertainment)" value="discretionary" />
      </Picker>

      <Text style={screenStyles.label}>Description</Text>
      <TextInput style={screenStyles.input} value={description} onChangeText={setDescription} />

      <Text style={screenStyles.label}>From Account</Text>
      <Picker selectedValue={accountId} onValueChange={setAccountId} style={screenStyles.picker}>
        <Picker.Item label="Select an account" value="" />
        {accounts.map(acc => (
          <Picker.Item key={acc.id} label={acc.name} value={acc.id} />
        ))}
      </Picker>

      {type === 'transfer' && (
        <>
          <Text style={screenStyles.label}>To Account</Text>
          <Picker selectedValue={transferToAccountId} onValueChange={setTransferToAccountId} style={screenStyles.picker}>
            <Picker.Item label="Select an account" value="" />
              {accounts
              .filter(acc => acc.id !== accountId)
              .map(acc => (
                <Picker.Item key={acc.id} label={acc.name} value={acc.id} />
              ))}
          </Picker>
        </>
      )}

      <Text style={screenStyles.label}>Date</Text>
      {Platform.OS === 'web' ? (
        <input
          type="date"
          className="web-date-input"
          value={date.toISOString().split('T')[0]}
          onChange={(e) => setDate(new Date(e.target.value))}
          style={screenStyles.input}
        />
      ) : (
        <>
          <Button title={date.toISOString().split('T')[0]} onPress={showDatePicker} />
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
        <TouchableOpacity onPress={onSubmit} style={screenStyles.primaryButton}>
          <Text style={screenStyles.primaryButtonText}>Save Transaction</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}