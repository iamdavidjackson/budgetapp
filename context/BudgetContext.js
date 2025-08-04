import React, { createContext, useReducer } from 'react';

export const BudgetContext = createContext();

const initialState = {
  accounts: [],
  transactions: [],
  recurring: [],
  forecasted: [],
  balanceOverrides: []
};

function reducer(state, action) {
  switch (action.type) {
    // Keep reducer logic intact
    case 'SET_ACCOUNTS':
      return {
        ...state,
        accounts: action.payload
      };
    case 'SET_TRANSACTIONS':
      return {
        ...state,
        transactions: action.payload
      };
    case 'SET_RECURRING':
      return {
        ...state,
        recurring: action.payload
      };
    case 'SET_FORECASTED':
      return {
        ...state,
        forecasted: action.payload
      };
    case 'SET_BALANCE_OVERRIDES':
      return {
        ...state,
        balanceOverrides: action.payload
      };
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

      const confirmedMap = new Map();
      state.forecasted.forEach(f => {
        if (f.transaction_id) {
          confirmedMap.set(`${f.sourceRecurringId}-${f.date}`, f);
        }
      });

      const transactionKeys = new Set(
        transactions.map(tx => `${tx.sourceRecurringId}-${tx.date}`)
      );

      const generated = generateForecast(recurring, endDate).filter(
        item => !transactionKeys.has(`${item.sourceRecurringId}-${item.date}`)
      );

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
    case 'ADD_BALANCE_OVERRIDE':
      return {
        ...state,
        balanceOverrides: [...state.balanceOverrides, action.payload]
      };
    case 'REMOVE_BALANCE_OVERRIDE':
      return {
        ...state,
        balanceOverrides: state.balanceOverrides.filter(
          o => !(o.accountId === action.payload.accountId && o.date === action.payload.date)
        )
      };
    default:
      return state;
  }
}

export const BudgetProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <BudgetContext.Provider value={{ state, dispatch }}>
      {children}
    </BudgetContext.Provider>
  );
};