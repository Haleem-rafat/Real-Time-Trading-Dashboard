import { Activity, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';

/**
 * Step 9 placeholder page — proves the dark terminal theme is wired.
 * Will be replaced by the real router + dashboard in Steps 10-13.
 */
function App() {
  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-accent-soft">
              <Activity className="h-4 w-4 text-accent" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Trading<span className="text-accent">Term</span>
            </span>
          </div>
          <span className="num text-xs text-text-dim">
            {new Date().toISOString()}
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-semibold tracking-tight">
          Real-Time Trading Dashboard
        </h1>
        <p className="mb-10 text-text-dim">
          Step 9 / 14 — frontend scaffold ready. React 19 · Vite · Tailwind CSS
          4 · TS
        </p>

        {/* Mock ticker rows showing the dark terminal palette */}
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="grid grid-cols-4 gap-4 border-b border-border bg-surface-2 px-6 py-3 text-xs uppercase tracking-wider text-text-dim">
            <span>Symbol</span>
            <span>Name</span>
            <span className="text-right">Price</span>
            <span className="text-right">24h</span>
          </div>
          {MOCK_ROWS.map((row) => (
            <TickerRow key={row.symbol} {...row} />
          ))}
        </div>

        {/* Color sample strip */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {SWATCHES.map((s) => (
            <div
              key={s.label}
              className="flex flex-col gap-1 rounded-md border border-border bg-surface p-3"
            >
              <div className={cn('h-8 rounded', s.bg)} />
              <span className="text-xs text-text-dim">{s.label}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

interface RowProps {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
}

function TickerRow({ symbol, name, price, changePct }: RowProps) {
  const up = changePct >= 0;
  return (
    <div className="grid grid-cols-4 items-center gap-4 border-b border-border px-6 py-3 last:border-b-0 hover:bg-surface-2">
      <span className="font-semibold">{symbol}</span>
      <span className="text-sm text-text-muted">{name}</span>
      <span className="num text-right">${price.toFixed(2)}</span>
      <span
        className={cn(
          'num flex items-center justify-end gap-1 text-right text-sm font-medium',
          up ? 'text-up' : 'text-down',
        )}
      >
        {up ? (
          <TrendingUp className="h-3.5 w-3.5" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5" />
        )}
        {up ? '+' : ''}
        {changePct.toFixed(2)}%
      </span>
    </div>
  );
}

const MOCK_ROWS: RowProps[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 187.42, changePct: 1.24 },
  { symbol: 'TSLA', name: 'Tesla, Inc.', price: 242.84, changePct: -2.15 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 156.3, changePct: 0.42 },
  { symbol: 'BTC-USD', name: 'Bitcoin', price: 67450, changePct: 3.78 },
  { symbol: 'ETH-USD', name: 'Ethereum', price: 3520, changePct: -0.91 },
];

const SWATCHES = [
  { label: 'bg', bg: 'bg-bg border border-border' },
  { label: 'surface', bg: 'bg-surface' },
  { label: 'border', bg: 'bg-border' },
  { label: 'up', bg: 'bg-up' },
  { label: 'down', bg: 'bg-down' },
  { label: 'accent', bg: 'bg-accent' },
];

export default App;
