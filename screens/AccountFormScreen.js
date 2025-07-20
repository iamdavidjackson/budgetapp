import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { BudgetContext } from '../context/BudgetContext';

export default function AccountFormScreen({ navigation, route }) {
  const { state, dispatch } = useContext(BudgetContext);
  const accountId = route?.params?.accountId;
  const account = state.accounts.find(acc => acc.id === accountId);

  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState(account?.type || 'bank');

  const onSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Account name is required.');
      return;
    }

    const updatedAccount = {
      id: accountId || Date.now().toString(),
      name,
      type
    };

    dispatch({
      type: accountId ? 'UPDATE_ACCOUNT' : 'ADD_ACCOUNT',
      payload: updatedAccount
    });

    navigation.goBack();
  };

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
  button: { marginTop: 24 }
});