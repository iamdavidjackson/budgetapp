import React, { useContext, useLayoutEffect } from 'react';
import { View, Text, Button, FlatList, Pressable, StyleSheet } from 'react-native';
import { BudgetContext } from '../context/BudgetContext';
import { useNavigation } from '@react-navigation/native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';

export default function RecurringScreen() {
  const { state, dispatch } = useContext(BudgetContext);
  const navigation = useNavigation();
  const recurringItems = state.recurring || [];
  
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('Add Recurring Item')}>
          <Text style={{ fontSize: 28 }}>＋</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const handleDelete = (id) => {
    dispatch({ type: 'DELETE_RECURRING_ITEM', payload: id });
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