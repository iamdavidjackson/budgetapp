import React, { useContext, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BudgetContext } from '../context/BudgetContext';
import { Swipeable } from 'react-native-gesture-handler';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';

const AccountDetailsScreen = () => {
  const { state, dispatch } = useContext(BudgetContext);
  const route = useRoute();
  const navigation = useNavigation();
  const { accountId } = route.params;
  const [loading, setLoading] = useState(false);

  const account = state.accounts.find(acc => acc.id === accountId);
  const overrides = state.balanceOverrides
    .filter(o => o.accountId === accountId)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const handleDelete = async (date) => {
    setLoading(true);
    const { error } = await supabase
      .from('balances')
      .delete()
      .eq('account_id', accountId)
      .eq('date', date);

    if (!error) {
      dispatch({ type: 'REMOVE_BALANCE_OVERRIDE', payload: { accountId, date } });
    } else {
      console.error('Failed to delete balance override:', error.message);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  const renderRightActions = (item) => (
    <TouchableOpacity
      style={styles.deleteButton}
      onPress={() => handleDelete(item.date)}
    >
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {account && (
        <>
          <Text style={styles.header}>{account.name}</Text>
          <Text style={styles.subheader}>{account.type}</Text>
        </>
      )}
      <View style={styles.headerRow}>
        <Text style={styles.sectionHeader}>Balance Overrides</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Balance Override', { accountId, accountName: account?.name })}
        >
          <MaterialIcons name="add" size={24} color="black" />
        </TouchableOpacity>
      </View>
      {overrides.length > 0 ? (
        <FlatList
          data={overrides}
          keyExtractor={(item) => item.date}
          renderItem={({ item }) => (
            <Swipeable renderRightActions={() => renderRightActions(item)}>
              <View style={styles.item}>
                <Text style={styles.date}>{item.date}</Text>
                <Text style={styles.amount}>${parseFloat(item.amount).toFixed(2)}</Text>
              </View>
            </Swipeable>
          )}
        />
      ) : (
        <Text style={styles.emptyMessage}>No balance overrides</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  subheader: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16
  },
  item: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  date: {
    fontSize: 16
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  deleteButton: {
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 8,
    borderRadius: 6
  },
  deleteText: {
    color: 'white',
    fontWeight: 'bold'
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8
  },
  emptyMessage: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#999',
    marginTop: 16
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default AccountDetailsScreen;
