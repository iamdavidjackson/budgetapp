import React, { useLayoutEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../utils/supabase';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';

export default function AccountsScreen({ navigation }) {
  const [accounts, setAccounts] = useState([]);

  useFocusEffect(
    useCallback(() => {
      const fetchAccounts = async () => {
        const { data, error } = await supabase.from('accounts').select('*').order('created_at');
        if (error) {
          console.error('Error loading accounts:', error);
          return;
        }
        setAccounts(data);
      };

      fetchAccounts();
    }, [])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('Add Account')}>
          <Text style={{ fontSize: 28, marginRight: 16 }}>＋</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const handleDelete = async (id) => {
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) {
      console.error('Error deleting account from Supabase:', error);
      return;
    }
    setAccounts(prev => prev.filter(account => account.id !== id));
  };

  const renderRightActions = (item) => (
    <RectButton style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
      <Text style={styles.deleteText}>Delete</Text>
    </RectButton>
  );

  const renderItem = ({ item }) => {
    return (
      <Swipeable renderRightActions={() => renderRightActions(item)}>
        <Pressable
          onPress={() => navigation.navigate('Account Details', { accountId: item.id })}
          style={styles.accountCard}
        >
          <View style={styles.cardRow}>
            <Text style={styles.accountName}>{item.name}</Text>
            <Text style={styles.accountType}>{item.type.toUpperCase()}</Text>
          </View>
        </Pressable>
      </Swipeable>
    );
  };

  return (
    <View style={styles.container}>
      {accounts.length === 0 ? (
        <Text style={styles.empty}>No accounts yet. Add one below!</Text>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1, paddingBottom: 64, paddingTop: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  empty: { marginBottom: 20, color: 'gray' },
  accountCard: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    // alignment handled by cardRow
  },
  accountName: { fontSize: 16, fontWeight: 'bold' },
  accountType: { fontSize: 14, color: '#666' },
  accountBalance: { marginTop: 4, fontWeight: '600' },
  deleteButton: {
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'flex-end',
    padding: 20,
    borderRadius: 6,
    marginBottom: 10
  },
  deleteText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  }
});