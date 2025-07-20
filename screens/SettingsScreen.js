import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { BudgetContext } from '../context/BudgetContext';

const SettingsScreen = () => {
  const { state, dispatch } = useContext(BudgetContext);

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
      const parts = [];

      parts.push('---ACCOUNTS---');
      parts.push(arrayToCSV(state.accounts || [], ['id', 'name', 'type']));

      parts.push('---TRANSACTIONS---');
      parts.push(arrayToCSV(state.transactions || [], ['id', 'name', 'date', 'amount', 'type', 'accountId', 'forecastedTransactionId']));

      parts.push('---FORECASTED---');
      parts.push(arrayToCSV(state.forecasted || [], ['id', 'name', 'date', 'forecastedAmount', 'type', 'accountId', 'transactionId']));

      parts.push('---RECURRING---');
      parts.push(arrayToCSV(state.recurring || [], ['id', 'name', 'type', 'amount', 'frequency', 'startDate', 'allowWeekends', 'accountId', 'targetAccountId']));

      parts.push('---BALANCE_OVERRIDES---');
      parts.push(arrayToCSV(state.balanceOverrides || [], ['id', 'accountId', 'date', 'amount']));

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

      const sections = content.split('\n\n');
      const stateSlices = {};

      for (let i = 0; i < sections.length; i += 2) {
        const label = sections[i].trim();
        const lines = sections[i + 1].split('\n').map(l => l.trim()).filter(Boolean);

        switch (label) {
          case '---ACCOUNTS---':
            stateSlices.accounts = parseCSVSection(lines, ['id', 'name', 'type']);
            break;
          case '---TRANSACTIONS---':
            stateSlices.transactions = parseCSVSection(lines, ['id', 'name', 'date', 'amount', 'type', 'accountId', 'forecastedTransactionId']);
            break;
          case '---FORECASTED---':
            stateSlices.forecasted = parseCSVSection(lines, ['id', 'name', 'date', 'forecastedAmount', 'type', 'accountId', 'transactionId']);
            break;
          case '---RECURRING---':
            stateSlices.recurring = parseCSVSection(lines, ['id', 'name', 'type', 'amount', 'frequency', 'startDate', 'allowWeekends', 'accountId', 'targetAccountId']);
            break;
          case '---BALANCE_OVERRIDES---':
            stateSlices.balanceOverrides = parseCSVSection(lines, ['id', 'accountId', 'date', 'amount']);
            break;
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