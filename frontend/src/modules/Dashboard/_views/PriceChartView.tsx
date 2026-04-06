import { useMemo } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { useAppSelector } from '@store/hooks';
import { useTickers } from '@hooks/useTickers';
import LiveChart from '../_components/LiveChart';
import PriceFlash from '../_components/PriceFlash';

function PriceChartView() {
  const symbol = useAppSelector((s) => s.selectedTicker.symbol);
  const tick = useAppSelector((s) =>
    symbol ? s.livePrices.bySymbol[symbol] : undefined,
  );
  const { tickers } = useTickers();

  const ticker = useMemo(
    () => tickers.find((t) => t.symbol === symbol),
    [tickers, symbol],
  );

  if (!symbol || !ticker) {
    return (
      <div className="flex h-full min-h-[600px] items-center justify-center text-sm text-text-dim">
        Select a ticker from the list
      </div>
    );
  }

  const price = tick?.price ?? ticker.base_price;
  const change = tick?.change ?? 0;
  const changePct = tick?.changePct ?? 0;
  const up = changePct >= 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header above the chart */}
      <div className="border-b border-border px-6 py-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-semibold tracking-tight">
                {ticker.symbol}
              </span>
              {ticker.asset_type === 'crypto' && (
                <span className="rounded bg-accent-soft px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent">
                  Crypto
                </span>
              )}
            </div>
            <span className="text-sm text-text-dim">{ticker.name}</span>
          </div>

          <div className="flex items-baseline gap-4">
            <PriceFlash
              value={price}
              format={(n) =>
                `$${n.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              }
              className="text-3xl font-semibold"
            />
            <div
              className={cn(
                'num flex items-center gap-1 text-sm font-medium',
                up ? 'text-up' : 'text-down',
              )}
            >
              {up ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {up ? '+' : ''}
              {change.toFixed(2)}
              <span className="ml-1 text-xs text-text-dim">
                ({up ? '+' : ''}
                {changePct.toFixed(3)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart body */}
      <div className="flex-1 p-4">
        <LiveChart symbol={symbol} />
      </div>
    </div>
  );
}

export default PriceChartView;
