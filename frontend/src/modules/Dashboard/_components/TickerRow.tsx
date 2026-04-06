import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { setSelectedTicker } from '@store/slices/selectedTickerSlice';
import type { ITicker } from '../../../app/api/types/ticker.types';
import PriceFlash from './PriceFlash';

interface Props {
  ticker: ITicker;
}

function TickerRow({ ticker }: Props) {
  const dispatch = useAppDispatch();
  const tick = useAppSelector((s) => s.livePrices.bySymbol[ticker.symbol]);
  const selected = useAppSelector(
    (s) => s.selectedTicker.symbol === ticker.symbol,
  );

  const price = tick?.price ?? ticker.base_price;
  const changePct = tick?.changePct ?? 0;
  const up = changePct >= 0;
  const isCrypto = ticker.asset_type === 'crypto';

  return (
    <button
      type="button"
      onClick={() => dispatch(setSelectedTicker(ticker.symbol))}
      className={cn(
        'group flex w-full items-center justify-between gap-3 border-l-2 px-4 py-3 text-left transition-colors',
        'hover:bg-surface-2',
        selected
          ? 'border-l-accent bg-surface-2'
          : 'border-l-transparent',
      )}
    >
      {/* Left: symbol + name */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight">
            {ticker.symbol}
          </span>
          {isCrypto && (
            <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-accent">
              Crypto
            </span>
          )}
        </div>
        <span className="block truncate text-xs text-text-dim">
          {ticker.name}
        </span>
      </div>

      {/* Right: price + change */}
      <div className="flex flex-col items-end gap-0.5">
        <PriceFlash
          value={price}
          format={(n) =>
            `$${n.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          }
          className="text-sm font-medium"
        />
        <span
          className={cn(
            'num flex items-center gap-1 text-[11px] font-medium',
            up ? 'text-up' : 'text-down',
          )}
        >
          {up ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {up ? '+' : ''}
          {changePct.toFixed(3)}%
        </span>
      </div>
    </button>
  );
}

export default TickerRow;
