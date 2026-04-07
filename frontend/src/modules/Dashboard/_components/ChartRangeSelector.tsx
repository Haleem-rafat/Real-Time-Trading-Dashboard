import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import type {
  TChartRange,
  THistoryRange,
} from '../../../app/api/types/ticker.types';
import CustomRangeModal from './CustomRangeModal';

interface Props {
  value: TChartRange;
  onChange: (next: TChartRange) => void;
}

interface PresetDef {
  label: string;
  range: THistoryRange;
}

const PRESETS: PresetDef[] = [
  { label: '1H', range: '1h' },
  { label: '1D', range: '1d' },
  { label: '1W', range: '1w' },
  { label: '1M', range: '1mo' },
  { label: '1Y', range: '1y' },
  { label: '5Y', range: '5y' },
];

function formatCustomLabel(from: string, to: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    });
  };
  return `${fmt(from)} → ${fmt(to)}`;
}

/**
 * Pill-style range selector that lets the user flip the chart window
 * between the common presets (1H / 1D / 1W / 1M / 1Y / 5Y) or open
 * the custom date-range picker. The parent owns the range state so
 * that the chart and this selector stay in sync.
 */
function ChartRangeSelector({ value, onChange }: Props) {
  const [customOpen, setCustomOpen] = useState(false);
  const isCustom = value.mode === 'custom';

  return (
    <>
      <div
        className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border bg-surface-2 p-1"
        role="tablist"
        aria-label="Chart range"
      >
        {PRESETS.map((preset) => {
          const active =
            value.mode === 'preset' && value.range === preset.range;
          return (
            <button
              key={preset.range}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() =>
                onChange({ mode: 'preset', range: preset.range })
              }
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                active
                  ? 'bg-accent/20 text-accent'
                  : 'text-text-dim hover:bg-surface hover:text-text',
              )}
            >
              {preset.label}
            </button>
          );
        })}
        <button
          type="button"
          role="tab"
          aria-selected={isCustom}
          onClick={() => setCustomOpen(true)}
          className={cn(
            'flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors',
            isCustom
              ? 'bg-accent/20 text-accent'
              : 'text-text-dim hover:bg-surface hover:text-text',
          )}
          title="Pick a custom date range"
        >
          <Calendar className="h-3 w-3" />
          {isCustom && value.mode === 'custom'
            ? formatCustomLabel(value.from, value.to)
            : 'Custom'}
        </button>
      </div>

      {customOpen && (
        <CustomRangeModal
          initial={value.mode === 'custom' ? value : null}
          onClose={() => setCustomOpen(false)}
          onApply={(from, to) => {
            onChange({ mode: 'custom', from, to });
            setCustomOpen(false);
          }}
        />
      )}
    </>
  );
}

export default ChartRangeSelector;
