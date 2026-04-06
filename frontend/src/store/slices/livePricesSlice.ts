import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { IPriceTick } from '../../app/api/types/ticker.types';

interface LivePricesState {
  bySymbol: Record<string, IPriceTick>;
}

const initialState: LivePricesState = {
  bySymbol: {},
};

const livePricesSlice = createSlice({
  name: 'livePrices',
  initialState,
  reducers: {
    updateLivePrice(state, action: PayloadAction<IPriceTick>) {
      state.bySymbol[action.payload.symbol] = action.payload;
    },
    seedLivePrices(state, action: PayloadAction<Record<string, number>>) {
      const ts = Date.now();
      for (const [symbol, price] of Object.entries(action.payload)) {
        if (!state.bySymbol[symbol]) {
          state.bySymbol[symbol] = {
            symbol,
            price,
            change: 0,
            changePct: 0,
            timestamp: ts,
          };
        }
      }
    },
    clearLivePrices(state) {
      state.bySymbol = {};
    },
  },
});

export const { updateLivePrice, seedLivePrices, clearLivePrices } =
  livePricesSlice.actions;
export default livePricesSlice.reducer;
