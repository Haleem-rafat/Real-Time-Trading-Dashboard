export const ELocalStorageKeys = {
  TOKEN: 'trading_token',
  USER: 'trading_user',
} as const;

export type ELocalStorageKeys =
  (typeof ELocalStorageKeys)[keyof typeof ELocalStorageKeys];

export const SWR_KEYS = {
  TICKERS: 'tickers',
  TICKER_HISTORY: (symbol: string) => ['ticker-history', symbol] as const,
} as const;
