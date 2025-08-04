import React from 'react';
import { View, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import { supabase } from '../utils/supabase';
import { useSession } from '@supabase/auth-helpers-react';

const SettingsScreen = () => {
  const session = useSession();

  const arrayToCSV = (arr, keys) => {
    const header = keys.join(',');
    const rows = arr.map(item =>
      keys.map(k => JSON.stringify(item[k] ?? '')).join(',')
    );
    return [header, ...rows].join('\n');
  };

  return (
    <View style={styles.container}>
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