import React, { useLayoutEffect, useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';

export default function RecurringScreen() {
  const navigation = useNavigation();
  const [recurringItems, setRecurringItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [accounts, setAccounts] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState('');
  const [fromAccountFilter, setFromAccountFilter] = useState(null);
  const [toAccountFilter, setToAccountFilter] = useState(null);
  
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Add Recurring Item')}
          style={{
            marginRight: 20,
            backgroundColor: '#4CAF50',
            borderRadius: 20,
            width: 30,
            height: 30,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <MaterialIcons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    let subscription;
    const fetchRecurringItems = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('recurring')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error loading recurring items:', error);
      } else {
        setRecurringItems(data);
      }

      setLoading(false);
    };

    const fetchAccounts = async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name')
        .order('name');
      if (error) {
        console.error('Error loading accounts:', error);
      } else {
        setAccounts(data || []);
      }
    };

    fetchRecurringItems();
    fetchAccounts();

    // Subscribe to real-time changes in recurring table
    subscription = supabase
      .channel('recurring-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recurring' },
        payload => {
          setRecurringItems(prevItems => {
            const existingIndex = prevItems.findIndex(item => item.id === payload.new?.id || item.id === payload.old?.id);
            switch (payload.eventType) {
              case 'INSERT':
                return [...prevItems, payload.new];
              case 'UPDATE':
                if (existingIndex !== -1) {
                  const updated = [...prevItems];
                  updated[existingIndex] = payload.new;
                  return updated;
                }
                return prevItems;
              case 'DELETE':
                return prevItems.filter(item => item.id !== payload.old.id);
              default:
                return prevItems;
            }
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const filteredItems = useMemo(() => {
    return (recurringItems || []).filter((item) => {
      const matchType = typeFilter ? item.type === typeFilter : true;
      const matchFreq = frequencyFilter ? item.frequency === frequencyFilter : true;
      const matchFrom = fromAccountFilter ? item.account_id === fromAccountFilter : true;
      const matchTo = toAccountFilter ? item.secondary_account_id === toAccountFilter : true;
      return matchType && matchFreq && matchFrom && matchTo;
    });
  }, [recurringItems, typeFilter, frequencyFilter, fromAccountFilter, toAccountFilter]);

  const handleDelete = async (id) => {
    await supabase.from('recurring').delete().eq('id', id);
    setRecurringItems(prev => prev.filter(item => item.id !== id));
  };

  const renderRightActions = (item) => (
    <RectButton style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
      <Text style={styles.deleteText}>Delete</Text>
    </RectButton>
  );

  const renderItem = ({ item }) => (
    <Swipeable renderRightActions={() => renderRightActions(item)}>
      <Pressable
        style={styles.item}
        onPress={() => navigation.navigate('Add Recurring Item', { recurringId: item.id })}
      >
        <View style={styles.itemRow}>
          <View>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.sub}>{item.frequency} - {item.type}</Text>
          </View>
          <Text style={styles.amount}>${parseFloat(item.amount).toFixed(2)}</Text>
        </View>
      </Pressable>
    </Swipeable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filtersAccordionHeader}>
        <TouchableOpacity style={styles.filtersHeaderBtn} onPress={() => setShowFilters(prev => !prev)}>
          <Text style={styles.filtersTitle}>Filters</Text>
          <MaterialIcons name={showFilters ? 'expand-less' : 'expand-more'} size={22} color="#444" />
        </TouchableOpacity>
      </View>
      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>Type</Text>
              <Picker
                selectedValue={typeFilter}
                onValueChange={(v) => setTypeFilter(v)}
                style={styles.picker}
              >
                <Picker.Item label="All" value="" />
                <Picker.Item label="Income" value="income" />
                <Picker.Item label="Expense" value="expense" />
                <Picker.Item label="Transfer" value="transfer" />
              </Picker>
            </View>
            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>Frequency</Text>
              <Picker
                selectedValue={frequencyFilter}
                onValueChange={(v) => setFrequencyFilter(v)}
                style={styles.picker}
              >
                <Picker.Item label="All" value="" />
                <Picker.Item label="daily" value="daily" />
                <Picker.Item label="weekly" value="weekly" />
                <Picker.Item label="biweekly" value="biweekly" />
                <Picker.Item label="monthly" value="monthly" />
                <Picker.Item label="quarterly" value="quarterly" />
                <Picker.Item label="yearly" value="yearly" />
              </Picker>
            </View>
          </View>
          <View style={styles.filterRow}>
            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>From Account</Text>
              <Picker
                selectedValue={fromAccountFilter}
                onValueChange={(v) => setFromAccountFilter(v)}
                style={styles.picker}
              >
                <Picker.Item label="All" value={null} />
                {accounts.map(acc => (
                  <Picker.Item key={acc.id} label={acc.name} value={acc.id} />
                ))}
              </Picker>
            </View>
            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>To Account</Text>
              <Picker
                selectedValue={toAccountFilter}
                onValueChange={(v) => setToAccountFilter(v)}
                style={styles.picker}
              >
                <Picker.Item label="All" value={null} />
                {accounts.map(acc => (
                  <Picker.Item key={acc.id} label={acc.name} value={acc.id} />
                ))}
              </Picker>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => { setTypeFilter(''); setFrequencyFilter(''); setFromAccountFilter(null); setToAccountFilter(null); }}
            style={styles.clearButton}
          >
            <Text style={styles.clearBtnText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      )}
      {recurringItems.length === 0 ? (
        <Text style={styles.empty}>No recurring items yet.</Text>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1, paddingBottom: 16, paddingTop: 16 },
  empty: { marginBottom: 20, color: 'gray' },
  item: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  name: { fontSize: 16, fontWeight: 'bold' },
  sub: { color: '#666', marginTop: 4 },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
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
  filtersAccordionHeader: {
    marginBottom: 8,
  },
  filtersHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clearButton: {
    backgroundColor: '#2196F3',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  clearBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  filterCol: {
    marginBottom: 10,
  },
});