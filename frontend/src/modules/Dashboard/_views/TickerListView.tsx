import { useMemo, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useTickers } from '@hooks/useTickers';
import { useLivePrices } from '@hooks/useLivePrices';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { setSelectedTicker } from '@store/slices/selectedTickerSlice';
import TickerRow from '../_components/TickerRow';

function TickerListView() {
  const { tickers, isLoading, error } = useTickers();
  const dispatch = useAppDispatch();
  const selected = useAppSelector((s) => s.selectedTicker.symbol);

  // Stable list of symbols for the live-price subscription
  const symbols = useMemo(() => tickers.map((t) => t.symbol), [tickers]);
  useLivePrices(symbols);

  // Auto-select the first ticker once the list loads (so the chart has something to show)
  useEffect(() => {
    if (!selected && tickers.length > 0) {
      dispatch(setSelectedTicker(tickers[0].symbol));
    }
  }, [selected, tickers, dispatch]);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-text-dim" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-down">
        <AlertCircle className="h-5 w-5" />
        Failed to load tickers
      </div>
    );
  }

  if (tickers.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-text-dim">
        No tickers available
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-dim">
          Markets
        </span>
        <span className="num text-[10px] text-text-dim">
          {tickers.length} symbols
        </span>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {tickers.map((t) => (
          <TickerRow key={t.symbol} ticker={t} />
        ))}
      </div>
    </div>
  );
}

export default TickerListView;
