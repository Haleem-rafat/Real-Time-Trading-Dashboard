import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import selectedTickerReducer from './slices/selectedTickerSlice';
import livePricesReducer from './slices/livePricesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    selectedTicker: selectedTickerReducer,
    livePrices: livePricesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
