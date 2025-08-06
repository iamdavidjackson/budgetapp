import React, { useLayoutEffect, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';

export default function RecurringScreen() {
  const navigation = useNavigation();
  const [recurringItems, setRecurringItems] = useState([]);
  const [loading, setLoading] = useState(false);
  
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

    fetchRecurringItems();

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
      {recurringItems.length === 0 ? (
        <Text style={styles.empty}>No recurring items yet.</Text>
      ) : (
        <FlatList
          data={recurringItems}
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
  }
});