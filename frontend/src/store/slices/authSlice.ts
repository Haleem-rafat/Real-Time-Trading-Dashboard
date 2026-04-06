import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { ELocalStorageKeys } from '@constants/keys';
import type { IUser } from '../../app/api/types/auth.types';

interface AuthState {
  user: IUser | null;
  token: string | null;
  isAuthenticated: boolean;
}

function loadUser(): IUser | null {
  try {
    const raw = localStorage.getItem(ELocalStorageKeys.USER);
    return raw ? (JSON.parse(raw) as IUser) : null;
  } catch {
    return null;
  }
}

const initialToken = localStorage.getItem(ELocalStorageKeys.TOKEN);
const initialUser = loadUser();

const initialState: AuthState = {
  user: initialUser,
  token: initialToken,
  isAuthenticated: Boolean(initialToken && initialUser),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ user: IUser; token: string }>,
    ) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem(ELocalStorageKeys.TOKEN, action.payload.token);
      localStorage.setItem(
        ELocalStorageKeys.USER,
        JSON.stringify(action.payload.user),
      );
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem(ELocalStorageKeys.TOKEN);
      localStorage.removeItem(ELocalStorageKeys.USER);
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
