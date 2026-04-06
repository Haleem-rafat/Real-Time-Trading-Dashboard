import useSWR from 'swr';
import { SWR_KEYS } from '@constants/keys';
import tickerService from '@services/ticker.service';
import type {
  IPricePoint,
  THistoryInterval,
  THistoryRange,
} from '../app/api/types/ticker.types';

export function useTickerHistory(
  symbol: string | null,
  range: THistoryRange = '1h',
  interval: THistoryInterval = '1m',
) {
  const { data, isLoading, error, mutate } = useSWR<IPricePoint[]>(
    symbol ? SWR_KEYS.TICKER_HISTORY(symbol, range, interval) : null,
    () => tickerService.getHistory(symbol!, range, interval),
    { dedupingInterval: 30_000 },
  );

  return {
    history: data ?? [],
    isLoading,
    error,
    refetch: mutate,
  };
}
