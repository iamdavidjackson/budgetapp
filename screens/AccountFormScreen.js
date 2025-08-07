import { supabase } from '../utils/supabase';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { screenStyles } from '../styles/screens';

export default function AccountFormScreen({ navigation, route }) {
  const accountId = route?.params?.accountId;
  const [account, setAccount] = useState(null);

  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState(account?.type || 'bank');
  const [interestRate, setInterestRate] = useState(account?.interest_rate?.toString() || '0');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (accountId) {
      const fetchAccount = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', accountId)
          .single();

        if (error) {
          Alert.alert('Error', error.message);
        } else {
          setAccount(data);
          setName(data.name);
          setType(data.type);
          setInterestRate(data.interest_rate?.toString() || '');
        }
        setLoading(false);
      };

      fetchAccount();
    }
  }, [accountId]);

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
      interest_rate: interestRate ? parseFloat(interestRate) : null,
      user_id: user.id
    };

    try {
      if (accountId) {
        const { error } = await supabase
          .from('accounts')
          .update(updatedAccount)
          .eq('id', accountId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('accounts')
          .insert(updatedAccount)
          .select()
          .single();

        if (error) throw error;
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
      <View style={screenStyles.loader}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={screenStyles.container}>
      <Text style={screenStyles.label}>Account Name</Text>
      <TextInput style={screenStyles.input} value={name} onChangeText={setName} />

      <Text style={screenStyles.label}>Type</Text>
      <Picker selectedValue={type} onValueChange={setType}>
        <Picker.Item label="Bank" value="bank" />
        <Picker.Item label="Credit" value="credit" />
        <Picker.Item label="Investments" value="investments" />
      </Picker>

      <Text style={screenStyles.label}>Annual Interest Rate (%)</Text>
      <TextInput
        style={screenStyles.input}
        value={interestRate}
        onChangeText={setInterestRate}
        keyboardType="numeric"
      />

      <View style={screenStyles.buttons}>
        <TouchableOpacity onPress={onSubmit} style={screenStyles.primaryButton}>
          <Text style={screenStyles.primaryButtonText}>{accountId ? 'Save Changes' : 'Add Account'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}