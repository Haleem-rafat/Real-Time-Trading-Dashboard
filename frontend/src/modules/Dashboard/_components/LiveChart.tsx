import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppSelector } from '@store/hooks';
import { useTickerHistory } from '@hooks/useTickerHistory';
import { useTheme } from '@hooks/useTheme';
import type {
  IPricePoint,
  TChartRange,
} from '../../../app/api/types/ticker.types';

/**
 * Recharts needs raw hex strings for stroke / fill / grid color, so it
 * cannot consume Tailwind classes or CSS variables directly. We mirror
 * the theme palette here and switch on the active theme — kept in sync
 * with src/app.css.
 */
const CHART_PALETTE = {
  dark: {
    grid: '#1f1f2e',
    axis: '#6b7280',
    tooltipBg: '#12121a',
    tooltipBorder: '#1f1f2e',
    tooltipLabel: '#6b7280',
    tooltipText: '#e5e5e5',
    cursor: '#2a2a3d',
    activeDotFill: '#0a0a0f',
    neutral: '#00d4ff',
    up: '#00ff88',
    down: '#ff3366',
  },
  light: {
    grid: '#e2e8f0',
    axis: '#94a3b8',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e2e8f0',
    tooltipLabel: '#64748b',
    tooltipText: '#0f172a',
    cursor: '#cbd5e1',
    activeDotFill: '#ffffff',
    neutral: '#0284c7',
    up: '#16a34a',
    down: '#dc2626',
  },
} as const;

interface Props {
  symbol: string;
  range: TChartRange;
}

// Internal buffer cap — we keep up to MAX_POINTS in state for safety,
// but the chart only *displays* the most recent VISIBLE_POINTS so each
// new tick takes a meaningful fraction of the chart width. Without this
// the 1-hour seed data dwarfs every live tick and the chart looks
// frozen even though state is updating.
const MAX_POINTS = 300;
const VISIBLE_POINTS = 60;

// Floor on the YAxis half-range, expressed as a fraction of the
// baseline price. Without this, when the visible window only spans a
// few cents on a $200 stock, Recharts auto-scales the YAxis so tight
// that pennies of tick noise look like enormous waves. 0.4% of price
// as the minimum half-range = ~0.8% total visible range, which keeps
// small movements looking small but still lets bigger moves push the
// bounds outward.
const MIN_HALF_RANGE_PCT = 0.004;

interface ChartPoint {
  ts: number; // millis (used as XAxis dataKey)
  price: number;
}

function toChartPoint(p: IPricePoint): ChartPoint {
  return { ts: new Date(p.timestamp).getTime(), price: p.price };
}

function formatTimeShort(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatTimeLong(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/** Pick an X-axis tick formatter that matches the chart span. Minute
 *  precision for intraday, month/year for multi-year views. */
function makeAxisFormatter(spanMs: number): (ts: number) => string {
  const DAY = 24 * 60 * 60 * 1000;
  if (spanMs <= 2 * DAY) return formatTimeShort;
  if (spanMs <= 60 * DAY) {
    return (ts) =>
      new Date(ts).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
  }
  return (ts) =>
    new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    });
}

/** Matching tooltip label formatter — shows the full date for
 *  longer ranges so the user knows what day they're hovering. */
function makeTooltipFormatter(spanMs: number): (ts: number) => string {
  const DAY = 24 * 60 * 60 * 1000;
  if (spanMs <= 2 * DAY) return formatTimeLong;
  return (ts) =>
    new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
}

// Stable string key for a TChartRange — used as an effect dep so we
// reset + crossfade whenever the user picks a different range without
// tearing down the whole component.
function rangeKeyFor(range: TChartRange): string {
  return range.mode === 'preset'
    ? `preset:${range.range}`
    : `custom:${range.from}:${range.to}`;
}

function LiveChart({ symbol, range }: Props) {
  const { history, error } = useTickerHistory(symbol, range);
  // Live ticks only meaningfully accumulate into the "1H" view. Any
  // longer-range preset or custom window is a historical snapshot —
  // appending 500ms ticks to a 5-year chart is invisible anyway, and
  // it changes the YAxis domain unpredictably, so we skip it.
  const isLiveWindow = range.mode === 'preset' && range.range === '1h';
  const tick = useAppSelector((s) =>
    isLiveWindow ? s.livePrices.bySymbol[symbol] : undefined,
  );
  const rKey = rangeKeyFor(range);
  // Lazy-initialize from whatever SWR returned synchronously so a cache
  // hit renders the chart immediately instead of flashing the skeleton
  // for one frame. Cache miss → starts empty, the seed effect below
  // fills it once history arrives.
  const [chartData, setChartData] = useState<ChartPoint[]>(() =>
    history.length > 0 ? history.map(toChartPoint) : [],
  );
  // The range the current chartData was seeded from. If the user
  // picks a different range we reset the buffer and crossfade into
  // the new series instead of fully unmounting the chart.
  const [loadedRangeKey, setLoadedRangeKey] = useState<string>(rKey);
  const { theme } = useTheme();
  const palette = CHART_PALETTE[theme];

  // Reset the local buffer whenever the user switches range. SWR will
  // refetch under the new cacheKey, the seed effect picks up the new
  // history, and the container's CSS transition crossfades the line
  // instead of the whole chart popping out and back in.
  useEffect(() => {
    if (loadedRangeKey === rKey) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChartData([]);
    setLoadedRangeKey(rKey);
  }, [rKey, loadedRangeKey]);

  // Seed whenever history arrives for the *current* range. After the
  // initial seed we leave chartData alone so that SWR revalidations
  // never wipe accumulated live ticks. The range-reset effect above
  // clears chartData on range switches, allowing this to fire again.
  useEffect(() => {
    if (history.length === 0) return;
    if (chartData.length > 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChartData(history.map(toChartPoint));
  }, [history, chartData.length]);

  // Append every new live tick for this symbol; cap at MAX_POINTS.
  // Same external-store → local-state bridge pattern as above.
  useEffect(() => {
    if (!tick || tick.symbol !== symbol) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChartData((prev) => {
      const next: ChartPoint[] = [
        ...prev,
        { ts: tick.timestamp, price: tick.price },
      ];
      return next.length > MAX_POINTS
        ? next.slice(next.length - MAX_POINTS)
        : next;
    });
  }, [tick, symbol]);

  // Baseline reference price.
  //
  // In the live "1H" view, `tick.price - tick.change` exactly equals
  // the simulator's session-open price — drawing this means the line's
  // coloring always agrees with the ticker-row badge.
  //
  // For historical ranges (1D/1W/.../custom) there's no "session open"
  // to anchor to, so we use the FIRST point of the selected window.
  // That gives a natural "change from the start of this view" reference.
  const baseline = useMemo(() => {
    if (isLiveWindow && tick) {
      return Number((tick.price - tick.change).toFixed(2));
    }
    if (chartData.length === 0) return null;
    return Number(chartData[0].price.toFixed(2));
  }, [isLiveWindow, tick, chartData]);

  // Line color: live view follows the tick badge (so chart and row
  // always agree). Historical ranges follow "first → last of the
  // selected window" — green if the range ended up, red if down.
  const lineColor = useMemo(() => {
    if (isLiveWindow && tick) {
      return tick.changePct >= 0 ? palette.up : palette.down;
    }
    if (chartData.length < 2) return palette.neutral;
    const first = chartData[0].price;
    const last = chartData[chartData.length - 1].price;
    return last >= first ? palette.up : palette.down;
  }, [isLiveWindow, tick, chartData, palette]);

  // Sliding visible window. Only applied to the live "1H" view, where
  // the full buffer keeps 1h of context but the chart renders the
  // last N points so live ticks are clearly visible instead of being
  // lost in 60 minutes of historical width. Longer ranges (1D / 1W /
  // 1M / 1Y / 5Y / custom) render the full series since we want the
  // user to see the whole window they picked.
  const visibleData = useMemo(
    () =>
      isLiveWindow && chartData.length > VISIBLE_POINTS
        ? chartData.slice(-VISIBLE_POINTS)
        : chartData,
    [chartData, isLiveWindow],
  );

  // Pick the axis + tooltip formatters based on how wide the visible
  // span actually is, not the nominal range — this way custom windows
  // get the right level of detail automatically.
  const spanMs = useMemo(() => {
    if (visibleData.length < 2) return 0;
    return visibleData[visibleData.length - 1].ts - visibleData[0].ts;
  }, [visibleData]);
  const xTickFormatter = useMemo(() => makeAxisFormatter(spanMs), [spanMs]);
  const tooltipLabelFormatter = useMemo(
    () => makeTooltipFormatter(spanMs),
    [spanMs],
  );

  // YAxis domain — centered on the session-open price, with a minimum
  // half-range floor so penny-level tick noise can't be magnified into
  // a giant visual wave. If real movement exceeds the floor, the
  // bounds expand to fit it (with 15% breathing room on each side).
  const yDomain = useMemo<[number, number] | undefined>(() => {
    if (visibleData.length === 0) return undefined;
    const prices = visibleData.map((p) => p.price);
    const dataMin = Math.min(...prices);
    const dataMax = Math.max(...prices);
    const center = baseline ?? (dataMin + dataMax) / 2;
    const dataHalfRange = Math.max(center - dataMin, dataMax - center);
    const floorHalf = center * MIN_HALF_RANGE_PCT;
    const halfRange = Math.max(dataHalfRange, floorHalf) * 1.15;
    return [center - halfRange, center + halfRange];
  }, [visibleData, baseline]);

  const gradientId = `grad-${symbol}`;

  // Show a centered spinner whenever we have no points to draw. This
  // prevents the empty-axis flicker that happens when SWR has already
  // resolved (isLoading=false) but the seed effect for the new
  // symbol/range hasn't run yet.
  if (chartData.length === 0) {
    if (error) {
      return (
        <div className="flex h-full min-h-[260px] sm:min-h-[360px] flex-col items-center justify-center gap-2 text-sm text-down">
          <span className="text-2xl">⚠</span>
          <span>Failed to load history</span>
        </div>
      );
    }
    return (
      <div className="flex h-full min-h-[260px] sm:min-h-[360px] flex-col items-center justify-center gap-3 text-text-dim">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <span className="text-xs uppercase tracking-wider">
          Loading chart…
        </span>
      </div>
    );
  }

  return (
    <div
      // key={rKey} triggers the Tailwind animation on every range
      // switch — fade-in + slight slide so the new series "arrives"
      // instead of popping in. The whole component does not remount,
      // so SWR / live-tick subscriptions stay intact.
      key={rKey}
      className="relative h-full min-h-[260px] sm:min-h-[360px] w-full motion-safe:animate-[chart-fade-in_400ms_ease-out]"
    >
      {baseline !== null && (
        <div className="pointer-events-none absolute right-4 top-3 z-10 flex items-center gap-1.5 rounded border border-border/70 bg-surface/80 px-2 py-1 text-[10px] uppercase tracking-wider text-text-dim backdrop-blur-sm">
          <span className="h-px w-3 border-t border-dashed border-text-dim" />
          <span>{isLiveWindow ? 'Open' : 'Start'}</span>
          <span className="num font-medium text-text">
            ${baseline.toFixed(2)}
          </span>
        </div>
      )}
      {/* Shared keyframe used by the wrapper above. Inlined so the
          animation travels with the component. */}
      <style>{`
        @keyframes chart-fade-in {
          0%   { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={visibleData}
          margin={{ top: 16, right: 16, left: 0, bottom: 8 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={palette.grid}
            vertical={false}
          />
          <XAxis
            dataKey="ts"
            type="number"
            domain={['dataMin', 'dataMax']}
            stroke={palette.axis}
            fontSize={11}
            tickFormatter={xTickFormatter}
            minTickGap={60}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke={palette.axis}
            fontSize={11}
            domain={yDomain ?? ['auto', 'auto']}
            allowDataOverflow={false}
            tickFormatter={(p: number) =>
              p >= 1000
                ? `$${(p / 1000).toFixed(1)}k`
                : `$${p.toFixed(2)}`
            }
            width={56}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: palette.tooltipBg,
              border: `1px solid ${palette.tooltipBorder}`,
              borderRadius: 6,
              fontSize: 12,
              padding: '8px 12px',
            }}
            labelStyle={{
              color: palette.tooltipLabel,
              marginBottom: 4,
              fontSize: 11,
            }}
            itemStyle={{ color: palette.tooltipText, padding: 0 }}
            cursor={{ stroke: palette.cursor, strokeWidth: 1 }}
            labelFormatter={(label: unknown) => {
              const ts = typeof label === 'number' ? label : Number(label);
              return Number.isFinite(ts) ? tooltipLabelFormatter(ts) : '';
            }}
            formatter={(value: unknown) => {
              const n = typeof value === 'number' ? value : Number(value);
              const formatted = Number.isFinite(n)
                ? `$${n.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : '—';
              return [formatted, 'Price'];
            }}
          />
          {baseline !== null && (
            <ReferenceLine
              y={baseline}
              stroke={palette.axis}
              strokeDasharray="4 4"
              strokeWidth={1}
              ifOverflow="extendDomain"
            />
          )}
          <Area
            type="monotone"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            dot={false}
            activeDot={{
              r: 4,
              stroke: lineColor,
              strokeWidth: 2,
              fill: palette.activeDotFill,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default LiveChart;
