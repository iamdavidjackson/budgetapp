import React, { createContext, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

export const BudgetContext = createContext();

const initialState = {
  accounts: [],
  transactions: [],
  recurring: [],
  forecasted: []
};

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_ACCOUNT':
      return {
        ...state,
        accounts: [...state.accounts, action.payload]
      };
    case 'UPDATE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.map(account =>
          account.id === action.payload.id ? action.payload : account
        )
      };
    case 'DELETE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.filter(account => account.id !== action.payload)
      };
    case 'ADD_TRANSACTION': {
      const updatedForecasted = state.forecasted.map(f =>
        f.id === action.payload.forecastId
          ? { ...f, transaction_id: action.payload.id }
          : f
      );

      return {
        ...state,
        transactions: [...state.transactions, action.payload],
        forecasted: updatedForecasted
      };
    }
    case 'DELETE_TRANSACTION': {
      const updatedForecasted = state.forecasted.map(f =>
        f.sourceRecurringId === action.payload.sourceRecurringId && f.date === action.payload.date
          ? { ...f, transaction_id: undefined }
          : f
      );

      return {
        ...state,
        transactions: state.transactions.filter(
          txn =>
            !(
              txn.sourceRecurringId === action.payload.sourceRecurringId &&
              txn.date === action.payload.date
            )
        ),
        forecasted: updatedForecasted
      };
    }
    case 'ADD_RECURRING_ITEM':
      return {
        ...state,
        recurring: [...state.recurring, action.payload]
      };
    case 'UPDATE_RECURRING_ITEM':
      return {
        ...state,
        recurring: state.recurring.map(item =>
          item.id === action.payload.id ? action.payload : item
        )
      };
    case 'DELETE_RECURRING_ITEM':
      return {
        ...state,
        recurring: state.recurring.filter(item => item.id !== action.payload)
      };
    case 'GENERATE_FORECASTED_ITEMS': {
      const { recurring, transactions } = state;
      const { generateForecast, endDate } = action.payload;

      // Keep confirmed forecasted items (those with a transaction_id)
      const confirmedMap = new Map();
      state.forecasted.forEach(f => {
        if (f.transaction_id) {
          confirmedMap.set(`${f.sourceRecurringId}-${f.date}`, f);
        }
      });

      // Build a set of existing transaction keys
      const transactionKeys = new Set(
        transactions.map(tx => `${tx.sourceRecurringId}-${tx.date}`)
      );

      // Generate new forecasted items, filter out those that match transactions
      const generated = generateForecast(recurring, endDate).filter(
        item => !transactionKeys.has(`${item.sourceRecurringId}-${item.date}`)
      );

      // Merge confirmed forecasted items with new ones
      const combined = [...generated];
      confirmedMap.forEach((val) => {
        combined.push(val);
      });

      return {
        ...state,
        forecasted: combined
      };
    }
    case 'DELETE_ALL_TRANSACTIONS':
      return {
        ...state,
        transactions: [],
        forecasted: []
      };
    case 'RESET_ACCOUNTS':
      return {
        ...state,
        accounts: []
      };
    case 'RESET_TRANSACTIONS':
      return {
        ...state,
        transactions: []
      };
    case 'RESET_RECURRING':
      return {
        ...state,
        recurring: []
      };
    default:
      return state;
  }
}

export const BudgetProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load accounts, transactions, and recurring items from AsyncStorage on mount
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        dispatch({ type: 'RESET_ACCOUNTS' });
        const json = await AsyncStorage.getItem('accounts');
        if (json) {
          const savedAccounts = JSON.parse(json);
          savedAccounts.forEach(account => {
            dispatch({ type: 'ADD_ACCOUNT', payload: account });
          });
        }
      } catch (e) {
        console.error('Failed to load accounts', e);
      }
    };
    loadAccounts();

    // Load transactions
    const loadTransactions = async () => {
      try {
        dispatch({ type: 'RESET_TRANSACTIONS' });
        const json = await AsyncStorage.getItem('transactions');
        if (json) {
          const saved = JSON.parse(json);
          saved.forEach(txn => {
            dispatch({ type: 'ADD_TRANSACTION', payload: txn });
          });
        }
      } catch (e) {
        console.error('Failed to load transactions', e);
      }
    };
    loadTransactions();

    // Load recurring items
    const loadRecurring = async () => {
      try {
        dispatch({ type: 'RESET_RECURRING' });
        const json = await AsyncStorage.getItem('recurring');
        if (json) {
          const saved = JSON.parse(json);
          saved.forEach(item => {
            dispatch({ type: 'ADD_RECURRING_ITEM', payload: item });
          });
        }
      } catch (e) {
        console.error('Failed to load recurring items', e);
      }
    };
    loadRecurring();
  }, []);

  // Save accounts to AsyncStorage whenever they change
  useEffect(() => {
    const saveAccounts = async () => {
      try {
        await AsyncStorage.setItem('accounts', JSON.stringify(state.accounts));
      } catch (e) {
        console.error('Failed to save accounts', e);
      }
    };
    saveAccounts();
  }, [state.accounts]);

  // Save transactions to AsyncStorage whenever they change
  useEffect(() => {
    const saveTransactions = async () => {
      try {
        await AsyncStorage.setItem('transactions', JSON.stringify(state.transactions));
      } catch (e) {
        console.error('Failed to save transactions', e);
      }
    };
    saveTransactions();
  }, [state.transactions]);

  // Save recurring items to AsyncStorage whenever they change
  useEffect(() => {
    const saveRecurring = async () => {
      try {
        await AsyncStorage.setItem('recurring', JSON.stringify(state.recurring));
      } catch (e) {
        console.error('Failed to save recurring items', e);
      }
    };
    saveRecurring();
  }, [state.recurring]);
  
  return (
    <BudgetContext.Provider value={{ state, dispatch }}>
      {children}
    </BudgetContext.Provider>
  );
};