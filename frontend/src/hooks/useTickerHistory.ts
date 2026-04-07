import useSWR from 'swr';
import { SWR_KEYS } from '@constants/keys';
import tickerService from '@services/ticker.service';
import type {
  IPricePoint,
  TChartRange,
} from '../app/api/types/ticker.types';

/**
 * Fetches bucketed historical price points for a symbol over a chart
 * range. Accepts either a preset range (1h/1d/1w/1mo/1y/5y) or a
 * custom window with explicit from/to ISO timestamps. The SWR key
 * encodes the full range so switching presets or picking a custom
 * window doesn't collide in the cache.
 */
export function useTickerHistory(
  symbol: string | null,
  range: TChartRange = { mode: 'preset', range: '1h' },
) {
  const cacheKey = symbol
    ? range.mode === 'preset'
      ? SWR_KEYS.TICKER_HISTORY(symbol, range.range, 'auto')
      : `ticker-history:${symbol}:custom:${range.from}:${range.to}`
    : null;

  const { data, isLoading, error, mutate } = useSWR<IPricePoint[]>(
    cacheKey,
    () => tickerService.getHistoryByRange(symbol!, range),
    { dedupingInterval: 30_000 },
  );

  return {
    history: data ?? [],
    isLoading,
    error,
    refetch: mutate,
  };
}
