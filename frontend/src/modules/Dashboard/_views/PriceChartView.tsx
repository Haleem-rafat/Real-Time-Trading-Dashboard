import { useMemo, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { useAppSelector } from '@store/hooks';
import { useTickers } from '@hooks/useTickers';
import LiveChart from '../_components/LiveChart';
import PriceFlash from '../_components/PriceFlash';
import ChartRangeSelector from '../_components/ChartRangeSelector';
import type { TChartRange } from '../../../app/api/types/ticker.types';

function PriceChartView() {
  const symbol = useAppSelector((s) => s.selectedTicker.symbol);
  const tick = useAppSelector((s) =>
    symbol ? s.livePrices.bySymbol[symbol] : undefined,
  );
  const { tickers } = useTickers();
  const [range, setRange] = useState<TChartRange>({
    mode: 'preset',
    range: '1h',
  });

  const ticker = useMemo(
    () => tickers.find((t) => t.symbol === symbol),
    [tickers, symbol],
  );

  if (!symbol || !ticker) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-text-dim sm:min-h-[400px]">
        Select a ticker from the list
      </div>
    );
  }

  const price = tick?.price ?? ticker.base_price;
  const change = tick?.change ?? 0;
  const changePct = tick?.changePct ?? 0;
  const up = changePct >= 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header above the chart */}
      <div className="border-b border-border px-4 py-3 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-end justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xl font-semibold tracking-tight sm:text-2xl">
                {ticker.symbol}
              </span>
              {ticker.asset_type === 'crypto' && (
                <span className="rounded bg-accent-soft px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent">
                  Crypto
                </span>
              )}
            </div>
            <span className="text-xs text-text-dim sm:text-sm">
              {ticker.name}
            </span>
          </div>

          <div className="flex items-baseline gap-3 sm:gap-4">
            <PriceFlash
              value={price}
              format={(n) =>
                `$${n.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              }
              className="text-2xl font-semibold sm:text-3xl"
            />
            <div
              className={cn(
                'num flex items-center gap-1 text-xs font-medium sm:text-sm',
                up ? 'text-up' : 'text-down',
              )}
            >
              {up ? (
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              )}
              {up ? '+' : ''}
              {change.toFixed(2)}
              <span className="ml-1 text-[10px] text-text-dim sm:text-xs">
                ({up ? '+' : ''}
                {changePct.toFixed(3)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Range selector row */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2 sm:px-6">
        <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-text-dim sm:inline">
          Range
        </span>
        <ChartRangeSelector value={range} onChange={setRange} />
      </div>

      {/* Chart body — explicit viewport-relative height on mobile so the
          chart is always visible regardless of how flex-1 resolves; on lg+
          it fills the remaining main area. */}
      <div className="h-[55vh] min-h-[300px] w-full p-3 sm:p-4 lg:h-auto lg:min-h-0 lg:flex-1">
        {/* key={symbol} remounts fully on symbol switch; range changes
            are handled inside LiveChart with a crossfade instead of a
            remount so the user sees a smooth transition. */}
        <LiveChart key={symbol} symbol={symbol} range={range} />
      </div>
    </div>
  );
}

export default PriceChartView;
