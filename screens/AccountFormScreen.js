import { supabase } from '../utils/supabase';
import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { BudgetContext } from '../context/BudgetContext';

export default function AccountFormScreen({ navigation, route }) {
  const { state, dispatch } = useContext(BudgetContext);
  const accountId = route?.params?.accountId;
  const account = state.accounts.find(acc => acc.id === accountId);

  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState(account?.type || 'bank');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Account name is required.');
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const updatedAccount = {
      name,
      type,
      user_id: user.id
    };

    try {
      if (accountId) {
        const { error } = await supabase
          .from('accounts')
          .update(updatedAccount)
          .eq('id', accountId);

        if (error) throw error;

        dispatch({
          type: 'UPDATE_ACCOUNT',
          payload: { id: accountId, ...updatedAccount }
        });
      } else {
        const { data, error } = await supabase
          .from('accounts')
          .insert(updatedAccount)
          .select()
          .single();

        if (error) throw error;

        dispatch({
          type: 'ADD_ACCOUNT',
          payload: data
        });
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
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
    <View style={styles.container}>
      <Text style={styles.label}>Account Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>Type</Text>
      <Picker selectedValue={type} onValueChange={setType}>
        <Picker.Item label="Bank" value="bank" />
        <Picker.Item label="Credit" value="credit" />
        <Picker.Item label="Investments" value="investments" />
      </Picker>

      <View style={styles.button}>
        <Button title={accountId ? 'Save Changes' : 'Add Account'} onPress={onSubmit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  label: { marginTop: 16, fontWeight: 'bold' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginTop: 4,
    borderRadius: 4
  },
  button: { marginTop: 24 },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});