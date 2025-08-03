import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { BudgetContext } from '../context/BudgetContext';

import { supabase } from '../utils/supabase';
import { useSession } from '@supabase/auth-helpers-react';

const SettingsScreen = () => {
  const { state, dispatch } = useContext(BudgetContext);
  const session = useSession();

  const arrayToCSV = (arr, keys) => {
    const header = keys.join(',');
    const rows = arr.map(item =>
      keys.map(k => JSON.stringify(item[k] ?? '')).join(',')
    );
    return [header, ...rows].join('\n');
  };

  const saveAndShareCSV = async (filename, content) => {
    const fileUri = FileSystem.documentDirectory + filename;
    await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(fileUri);
  };

  const handleBackup = async () => {
    try {
      const user = session?.user;
      if (!user) {
        Alert.alert('Error', 'User not authenticated.');
        return;
      }

      const parts = [];

      const tables = [
        { label: '---ACCOUNTS---', table: 'accounts', keys: ['id', 'name', 'type'] },
        { label: '---TRANSACTIONS---', table: 'transactions', keys: ['id', 'description', 'date', 'amount', 'type', 'account_id', 'secondary_account_id', 'forecasted', 'forecasted_amount', 'forecasted_date', 'recurring_id'] },
        { label: '---RECURRING---', table: 'recurring', keys: ['id', 'name', 'type', 'amount', 'frequency', 'start_date', 'end_date', 'account_id', 'secondary_account_id', 'weekend_policy', 'notes'] },
        { label: '---BALANCES---', table: 'balances', keys: ['id', 'account_id', 'date', 'amount'] },
      ];

      for (const { label, table, keys } of tables) {
        parts.push(label);
        const { data, error } = await supabase
          .from(table)
          .select()
          .eq('user_id', user.id);

        if (error) throw error;

        parts.push(arrayToCSV(data || [], keys));
      }

      const backupContent = parts.join('\n\n');
      await saveAndShareCSV('backup.csv', backupContent);
      Alert.alert('Backup', 'Backup file saved and shared!');
    } catch (err) {
      Alert.alert('Error', 'Failed to backup data: ' + err.message);
    }
  };

  // Restore logic
  const parseCSVSection = (lines, keys) => {
    return lines.slice(1).map(line => {
      const values = line.split(',').map(val => JSON.parse(val));
      return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
    });
  };

  const handleRestore = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv' });
      if (result.canceled) return;

      const content = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.UTF8
      });

      const user = session?.user;
      if (!user) {
        Alert.alert('Error', 'User not authenticated.');
        return;
      }

      const sections = content.split('\n\n');
      const stateSlices = {};

      for (let i = 0; i < sections.length; i += 2) {
        const label = sections[i].trim();
        const lines = sections[i + 1].split('\n').map(l => l.trim()).filter(Boolean);

        switch (label) {
          case '---ACCOUNTS---': {
            const data = parseCSVSection(lines, ['id', 'name', 'type']).map(item => ({ ...item, user_id: user.id }));
            await supabase.from('accounts').insert(data);
            stateSlices.accounts = data;
            break;
          }
          case '---TRANSACTIONS---': {
            const data = parseCSVSection(lines, ['id', 'description', 'date', 'amount', 'type', 'account_id', 'secondary_account_id', 'forecasted', 'forecasted_amount', 'forecasted_date', 'recurring_id']).map(item => ({ ...item, user_id: user.id }));
            await supabase.from('transactions').insert(data);
            stateSlices.transactions = data;
            break;
          }
          case '---RECURRING---': {
            const data = parseCSVSection(lines, ['id', 'name', 'type', 'amount', 'frequency', 'start_date', 'end_date', 'account_id', 'secondary_account_id', 'weekend_policy', 'notes']).map(item => ({ ...item, user_id: user.id }));
            await supabase.from('recurring').insert(data);
            stateSlices.recurring = data;
            break;
          }
          case '---BALANCES---': {
            const data = parseCSVSection(lines, ['id', 'account_id', 'date', 'amount']).map(item => ({ ...item, user_id: user.id }));
            await supabase.from('balances').insert(data);
            stateSlices.balances = data;
            break;
          }
        }
      }

      for (const [key, value] of Object.entries(stateSlices)) {
        dispatch({ type: `RESET_${key.toUpperCase()}` });
        dispatch({ type: `SET_${key.toUpperCase()}`, payload: value });
      }

      Alert.alert('Restore', 'Data restored successfully!');
    } catch (err) {
      Alert.alert('Error', 'Failed to restore data: ' + err.message);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handleBackup}>
        <Text style={styles.buttonText}>Backup Data</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, { marginTop: 12 }]} onPress={handleRestore}>
        <Text style={styles.buttonText}>Restore Data</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1, paddingBottom: 64, paddingTop: 16 },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold'
  }
});