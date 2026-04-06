export type TAssetType = 'stock' | 'crypto';

export interface ITicker {
  id: string;
  symbol: string;
  name: string;
  asset_type: TAssetType;
  base_price: number;
  volatility: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ITickerWithLastPrice {
  ticker: ITicker;
  lastPrice: number;
  lastTimestamp: string;
}

export interface IPricePoint {
  timestamp: string;
  price: number;
}

export interface IPriceTick {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  timestamp: number;
}

export type THistoryRange = '1h' | '1d' | '1w';
export type THistoryInterval = '1m' | '5m' | '1h';
