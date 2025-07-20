import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BudgetContext } from '../context/BudgetContext';

export default function RecurringFormScreen({ navigation, route }) {
  const { state, dispatch } = useContext(BudgetContext);
  const accounts = state.accounts || [];

  const recurringId = route?.params?.recurringId;
  const existing = state.recurring?.find(r => r.id === recurringId);

  const [name, setName] = useState(existing?.name || '');
  const [amount, setAmount] = useState(existing?.amount?.toString() || '');
  const [category, setCategory] = useState(existing?.category || '');
  const [type, setType] = useState(existing?.type || 'expense');
  const [frequency, setFrequency] = useState(existing?.frequency || 'monthly');
  const [startDate, setStartDate] = useState(existing?.startDate ? new Date(existing.startDate) : new Date());
  const [endDate, setEndDate] = useState(existing?.endDate ? new Date(existing.endDate) : null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [accountId, setAccountId] = useState(existing?.accountId || accounts[0]?.id || '');
  const [transferToAccountId, setTransferToAccountId] = useState(existing?.transferToAccountId || '');
  const [weekendPolicy, setWeekendPolicy] = useState(existing?.weekendPolicy || 'post_on_date');

  const onSave = () => {
    const recurringItem = {
      id: recurringId || Date.now().toString(),
      name,
      amount: parseFloat(amount),
      category,
      type,
      frequency,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate ? endDate.toISOString().split('T')[0] : null,
      accountId,
      transferToAccountId: type === 'transfer' ? transferToAccountId : undefined,
      weekendPolicy
    };
    dispatch({
      type: recurringId ? 'UPDATE_RECURRING_ITEM' : 'ADD_RECURRING_ITEM',
      payload: recurringItem
    });

    navigation.goBack();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>Amount</Text>
      <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" />

      <Text style={styles.label}>Category</Text>
      <TextInput style={styles.input} value={category} onChangeText={setCategory} />

      <Text style={styles.label}>Type</Text>
      <Picker selectedValue={type} onValueChange={setType}>
        <Picker.Item label="Income" value="income" />
        <Picker.Item label="Expense" value="expense" />
        <Picker.Item label="Transfer" value="transfer" />
      </Picker>

      <Text style={styles.label}>Frequency</Text>
      <Picker selectedValue={frequency} onValueChange={setFrequency}>
        <Picker.Item label="Daily" value="daily" />
        <Picker.Item label="Weekly" value="weekly" />
        <Picker.Item label="Bi-Weekly" value="biweekly" />
        <Picker.Item label="Monthly" value="monthly" />
        <Picker.Item label="Yearly" value="yearly" />
      </Picker>

      <Text style={styles.label}>Start Date</Text>
      <Button title={startDate.toDateString()} onPress={() => setShowStartPicker(true)} />
      {showStartPicker && (
        <DateTimePicker value={startDate} mode="date" onChange={(_, d) => { setShowStartPicker(false); if (d) setStartDate(d); }} />
      )}

      <Text style={styles.label}>End Date (Optional)</Text>
      <Button title={endDate ? endDate.toDateString() : 'None'} onPress={() => setShowEndPicker(true)} />
      {showEndPicker && (
        <DateTimePicker value={endDate || new Date()} mode="date" onChange={(_, d) => { setShowEndPicker(false); setEndDate(d); }} />
      )}

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
            {accounts.filter(acc => acc.id !== accountId).map(acc => (
              <Picker.Item key={acc.id} label={acc.name} value={acc.id} />
            ))}
          </Picker>
        </>
      )}

      <Text style={styles.label}>Weekend Policy</Text>
      <Picker selectedValue={weekendPolicy} onValueChange={setWeekendPolicy}>
        <Picker.Item label="Post on Date" value="post_on_date" />
        <Picker.Item label="Next Weekday" value="next_weekday" />
      </Picker>

      <View style={styles.buttons}>
        <Button title="Save" onPress={onSave} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 64, paddingTop: 16 },
  label: { marginTop: 16, fontWeight: 'bold' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginTop: 4,
    borderRadius: 4
  },
  buttons: { marginTop: 24 }
});