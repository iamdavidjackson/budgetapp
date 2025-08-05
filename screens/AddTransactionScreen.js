import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TextInput, Button, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../utils/supabase';
import DatePicker from 'react-native-date-picker';

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Type</Text>
      <Picker selectedValue={type} onValueChange={setType}>
        <Picker.Item label="Select a type" value="" />
        <Picker.Item label="Income" value="income" />
        <Picker.Item label="Expense" value="expense" />
        <Picker.Item label="Transfer" value="transfer" />
      </Picker>

      <Text style={styles.label}>Amount</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={amount} onChangeText={setAmount} />

      <Text style={styles.label}>Category</Text>
      <Picker selectedValue={category} onValueChange={setCategory}>
        <Picker.Item label="Select a category" value="" />
        <Picker.Item label="Essential – Fixed (e.g. rent, salary)" value="essential_fixed" />
        <Picker.Item label="Essential – Variable (e.g. groceries, utilities)" value="essential_variable" />
        <Picker.Item label="Flexible – Regular but Optional (e.g. subscriptions)" value="flexible" />
        <Picker.Item label="Discretionary – Optional (e.g. entertainment)" value="discretionary" />
      </Picker>

      <Text style={styles.label}>Description</Text>
      <TextInput style={styles.input} value={description} onChangeText={setDescription} />

      <Text style={styles.label}>From Account</Text>
      <Picker selectedValue={accountId} onValueChange={setAccountId}>
        <Picker.Item label="Select an account" value="" />
        {accounts.map(acc => (
          <Picker.Item key={acc.id} label={acc.name} value={acc.id} />
        ))}
      </Picker>

      {type === 'transfer' && (
        <>
          <Text style={styles.label}>To Account</Text>
          <Picker selectedValue={transferToAccountId} onValueChange={setTransferToAccountId}>
            <Picker.Item label="Select an account" value="" />
              {accounts
              .filter(acc => acc.id !== accountId)
              .map(acc => (
                <Picker.Item key={acc.id} label={acc.name} value={acc.id} />
              ))}
          </Picker>
        </>
      )}

      <Text style={styles.label}>Date</Text>
      {Platform.select({
        web: (
          <input
            type="date"
            className="web-date-input"
            value={date.toISOString().split('T')[0]}
            onChange={(e) => setDate(new Date(e.target.value))}
            style={styles.input}
          />
        ),
        default: (
          <DatePicker
            date={date}
            mode="date"
            onDateChange={setDate}
            androidVariant="nativeAndroid"
          />
        )
      })}

      <View style={styles.submit}>
        <Button title="Save Transaction" onPress={onSubmit} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 64 },
  label: { marginTop: 16, fontWeight: 'bold' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginTop: 4,
    borderRadius: 4
  },
  submit: { marginTop: 24 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});