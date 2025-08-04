import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TextInput, Button, StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../utils/supabase';

export default function AddTransactionScreen({ navigation }) {
  const [accounts, setAccounts] = useState([]);

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [accountId, setAccountId] = useState('');
  const [transferToAccountId, setTransferToAccountId] = useState('');

  useEffect(() => {
    const fetchAccounts = async () => {
      const { data, error } = await supabase.from('accounts').select('*');
      if (error) {
        console.error('Error fetching accounts:', error);
      } else {
        setAccounts(data);
        if (!accountId && data.length > 0) {
          setAccountId(data[0].id);
        }
      }
    };
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showDatePicker, setShowDatePicker] = useState(false);

  const onSubmit = () => {
    const transaction = {
      id: Date.now().toString(),
      type,
      amount: parseFloat(amount),
      category,
      description,
      date: date.toISOString().split('T')[0],
      accountId,
      transferToAccountId: type === 'transfer' ? transferToAccountId : undefined,
    };
    console.log('New Transaction:', transaction);
    // TODO: dispatch to context and save
    navigation.goBack();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Type</Text>
      <Picker selectedValue={type} onValueChange={setType}>
        <Picker.Item label="Income" value="income" />
        <Picker.Item label="Expense" value="expense" />
        <Picker.Item label="Transfer" value="transfer" />
      </Picker>

      <Text style={styles.label}>Amount</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={amount} onChangeText={setAmount} />

      <Text style={styles.label}>Category</Text>
      <TextInput style={styles.input} value={category} onChangeText={setCategory} />

      <Text style={styles.label}>Description</Text>
      <TextInput style={styles.input} value={description} onChangeText={setDescription} />

      <Text style={styles.label}>From Account</Text>
      <Picker selectedValue={accountId} onValueChange={setAccountId}>
        {accounts.map(acc => (
          <Picker.Item key={acc.id} label={acc.name} value={acc.id} />
        ))}
      </Picker>

      {type === 'transfer' && (
        <>
          <Text style={styles.label}>To Account</Text>
          <Picker selectedValue={transferToAccountId} onValueChange={setTransferToAccountId}>
            {accounts
              .filter(acc => acc.id !== accountId)
              .map(acc => (
                <Picker.Item key={acc.id} label={acc.name} value={acc.id} />
              ))}
          </Picker>
        </>
      )}

      <Text style={styles.label}>Date</Text>
      <Button title={date.toDateString()} onPress={() => setShowDatePicker(true)} />
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}

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
  submit: { marginTop: 24 }
});