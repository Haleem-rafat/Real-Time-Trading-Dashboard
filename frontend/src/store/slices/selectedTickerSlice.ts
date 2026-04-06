import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface SelectedTickerState {
  symbol: string | null;
}

const initialState: SelectedTickerState = {
  symbol: null,
};

const selectedTickerSlice = createSlice({
  name: 'selectedTicker',
  initialState,
  reducers: {
    setSelectedTicker(state, action: PayloadAction<string>) {
      state.symbol = action.payload.toUpperCase();
    },
    clearSelectedTicker(state) {
      state.symbol = null;
    },
  },
});

export const { setSelectedTicker, clearSelectedTicker } =
  selectedTickerSlice.actions;
export default selectedTickerSlice.reducer;
