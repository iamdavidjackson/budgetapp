import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DatePicker from 'react-native-date-picker';
import { supabase } from '../utils/supabase';

export default function RecurringFormScreen({ navigation, route }) {
  const [accounts, setAccounts] = useState([]);

  const recurringId = route?.params?.recurringId;
  const [existing, setExisting] = useState(null);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');
  const [frequency, setFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [transferToAccountId, setTransferToAccountId] = useState('');
  const [weekendPolicy, setWeekendPolicy] = useState('post_on_date');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(!!recurringId);

  useFocusEffect(
    React.useCallback(() => {
      const fetchRecurring = async () => {
        const fetchAccounts = async () => {
          const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .order('name');
          if (error) {
            console.error('Error fetching accounts:', error);
          } else {
            setAccounts(data);
          }
        };
        await fetchAccounts();

        if (recurringId) {
          setLoading(true);
          const { data, error } = await supabase
            .from('recurring')
            .select('*')
            .eq('id', recurringId)
            .single();
          setLoading(false);
          if (error) {
            console.error('Error fetching recurring:', error);
          } else {
            setExisting(data);
            setName(data.name || '');
            setAmount(data.amount?.toString() || '');
            setCategory(data.category || '');
            setType(data.type || 'expense');
            setFrequency(data.frequency || 'monthly');
            setStartDate(data.start_date ? new Date(data.start_date) : new Date());
            setEndDate(data.end_date ? new Date(data.end_date) : null);
            setAccountId(data.account_id || accounts[0]?.id || '');
            setTransferToAccountId(data.secondary_account_id || '');
            setWeekendPolicy(data.weekend_policy || 'post_on_date');
            setNotes(data.notes || '');
          }
        }
      };
      fetchRecurring();
    }, [recurringId])
  );

  useEffect(() => {
    const loadAccounts = async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('name');
      if (error) {
        console.error('Error fetching accounts:', error);
      } else {
        setAccounts(data);
        if (!recurringId && data.length > 0) {
          setAccountId(data[0].id);
        }
      }
    };
    if (!recurringId) {
      loadAccounts();
    }
  }, [recurringId]);

  const onSave = async () => {
    if (type === 'transfer' && !transferToAccountId) {
      alert('Please select a destination account for the transfer.');
      return;
    }
    if (!endDate) {
      alert('Please select an end date.');
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const recurringItem = {
      name,
      amount: parseFloat(amount),
      category,
      type,
      frequency,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate ? endDate.toISOString().split('T')[0] : null,
      account_id: accountId,
      secondary_account_id: type === 'transfer' ? transferToAccountId : null,
      weekend_policy: weekendPolicy,
      notes,
      user_id: user.id
    };

    try {
      if (recurringId) {
        // Check if only notes has changed
        const onlyNotesChanged =
          existing &&
          existing.name === name &&
          parseFloat(existing.amount) === parseFloat(amount) &&
          existing.category === category &&
          existing.type === type &&
          existing.frequency === frequency &&
          existing.start_date === recurringItem.start_date &&
          existing.end_date === recurringItem.end_date &&
          existing.account_id === accountId &&
          existing.secondary_account_id === recurringItem.secondary_account_id &&
          existing.weekend_policy === weekendPolicy &&
          existing.notes !== notes;

        await supabase
          .from('recurring')
          .update(recurringItem)
          .eq('id', recurringId);

        if (!onlyNotesChanged) {
          // Delete existing forecasted transactions for this recurring ID
          await supabase
            .from('transactions')
            .delete()
            .eq('recurring_id', recurringId)
            .eq('forecasted', true);

          const generatedForecasts = [];
          const currentDate = new Date(startDate);
          const end = new Date(endDate);

          while (currentDate <= end) {
            const isoDate = currentDate.toISOString().split('T')[0];
            generatedForecasts.push({
              type,
              forecasted: true,
              forecasted_amount: parseFloat(amount),
              forecasted_date: isoDate,
              account_id: accountId,
              secondary_account_id: type === 'transfer' ? transferToAccountId : null,
              user_id: user.id,
              description: name,
              date: isoDate,
              amount: parseFloat(amount),
              category,
              recurring_id: recurringId
            });

            switch (frequency) {
              case 'daily':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
              case 'weekly':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
              case 'biweekly':
                currentDate.setDate(currentDate.getDate() + 14);
                break;
              case 'monthly':
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
              case 'yearly':
                currentDate.setFullYear(currentDate.getFullYear() + 1);
                break;
              default:
                break;
            }
          }

          if (generatedForecasts.length > 0) {
            await supabase
              .from('transactions')
              .insert(generatedForecasts);
          }
        }
      } else {
        const { data: insertData, error: insertError } = await supabase
          .from('recurring')
          .insert([recurringItem])
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        const recurring = insertData;
        const generatedForecasts = [];

        const currentDate = new Date(startDate);
        const end = new Date(endDate);

        const addDays = (date, days) => {
          const result = new Date(date);
          result.setDate(result.getDate() + days);
          return result;
        };

        while (currentDate <= end) {
          const isoDate = currentDate.toISOString().split('T')[0];
          generatedForecasts.push({
            type,
            forecasted: true,
            forecasted_amount: parseFloat(amount),
            forecasted_date: isoDate,
            account_id: accountId,
            secondary_account_id: type === 'transfer' ? transferToAccountId : null,
            user_id: user.id,
            description: name,
            date: isoDate,
            amount: parseFloat(amount),
            category,
            recurring_id: recurring.id
          });

          switch (frequency) {
            case 'daily':
              currentDate.setDate(currentDate.getDate() + 1);
              break;
            case 'weekly':
              currentDate.setDate(currentDate.getDate() + 7);
              break;
            case 'biweekly':
              currentDate.setDate(currentDate.getDate() + 14);
              break;
            case 'monthly':
              currentDate.setMonth(currentDate.getMonth() + 1);
              break;
            case 'yearly':
              currentDate.setFullYear(currentDate.getFullYear() + 1);
              break;
            default:
              break;
          }
        }

        if (generatedForecasts.length > 0) {
          await supabase
            .from('transactions')
            .insert(generatedForecasts);
        }
      }
      navigation.goBack();
    } catch (error) {
      console.error('Error saving recurring item:', error);
      alert('An error occurred while saving. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

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
      {Platform.select({
        web: (
          <input
            type="date"
            className="web-date-input"
            value={startDate.toISOString().split('T')[0]}
            onChange={(e) => setStartDate(new Date(e.target.value))}
            style={styles.input}
          />
        ),
        default: (
          <DatePicker
            date={startDate}
            mode="date"
            onDateChange={setStartDate}
            androidVariant="nativeAndroid"
          />
        )
      })}

      <Text style={styles.label}>End Date</Text>
      {Platform.select({
        web: (
          <input
            type="date"
            className="web-date-input"
            value={endDate ? endDate.toISOString().split('T')[0] : ''}
            onChange={(e) => setEndDate(new Date(e.target.value))}
            style={styles.input}
          />
        ),
        default: (
          <DatePicker
            date={endDate || new Date()}
            mode="date"
            onDateChange={setEndDate}
            androidVariant="nativeAndroid"
          />
        )
      })}

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
            <Picker.Item label="Select an account" value="" />
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

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
      />

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
  buttons: { marginTop: 24 },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});