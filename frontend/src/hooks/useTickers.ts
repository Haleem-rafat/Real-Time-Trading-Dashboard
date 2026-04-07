import useSWR from 'swr';
import { SWR_KEYS } from '@constants/keys';
import tickerService from '@services/ticker.service';
import type { ITicker } from '../app/api/types/ticker.types';

export function useTickers() {
  const { data, isLoading, error, mutate } = useSWR<ITicker[]>(
    SWR_KEYS.TICKERS,
    () => tickerService.getAll(),
    {
      // Backend cold-starts on Render's free tier; recover automatically
      // instead of leaving the sidebar stuck in a failed state.
      shouldRetryOnError: true,
      errorRetryCount: 4,
      errorRetryInterval: 1500,
    },
  );

  return {
    tickers: data ?? [],
    isLoading,
    error,
    refetch: mutate,
  };
}
