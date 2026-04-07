import { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { Button, MainInput } from '@UI/index';

interface Props {
  initial: { from: string; to: string } | null;
  onClose: () => void;
  onApply: (from: string, to: string) => void;
}

/** Convert an ISO string to the `YYYY-MM-DDTHH:mm` value that the
 *  native `<input type="datetime-local">` expects. */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Native datetime-local input returns a timezone-less string. Treat
 *  it as local time and return an ISO string for the backend. */
function fromLocalInputValue(local: string): string {
  if (!local) return '';
  const d = new Date(local);
  return d.toISOString();
}

/**
 * Modal for picking a custom date range for the chart. The parent
 * conditionally mounts this component so each open starts with fresh
 * defaults — no reset-on-open effect needed.
 *
 * Backend has ~5 years of daily history, so we cap the earliest
 * allowed `from` at 5y ago and the latest `to` at now.
 */
function CustomRangeModal({ initial, onClose, onApply }: Props) {
  const now = new Date();
  const fiveYearsAgo = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [fromLocal, setFromLocal] = useState(
    initial ? toLocalInputValue(initial.from) : toLocalInputValue(oneWeekAgo.toISOString()),
  );
  const [toLocal, setToLocal] = useState(
    initial ? toLocalInputValue(initial.to) : toLocalInputValue(now.toISOString()),
  );
  const [error, setError] = useState<string | null>(null);

  const minFrom = toLocalInputValue(fiveYearsAgo.toISOString());
  const maxTo = toLocalInputValue(now.toISOString());

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fromLocal || !toLocal) {
      setError('Pick both a start and end date.');
      return;
    }
    const fromIso = fromLocalInputValue(fromLocal);
    const toIso = fromLocalInputValue(toLocal);
    if (new Date(fromIso) >= new Date(toIso)) {
      setError('"From" must be earlier than "To".');
      return;
    }
    onApply(fromIso, toIso);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-accent-soft">
              <Calendar className="h-4 w-4 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">
                Custom date range
              </h2>
              <p className="text-xs text-text-dim">
                Pick any window within the last 5 years
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-dim hover:bg-surface-2 hover:text-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 p-5">
          <MainInput
            label="From"
            type="datetime-local"
            min={minFrom}
            max={maxTo}
            value={fromLocal}
            onChange={(e) => setFromLocal(e.target.value)}
          />
          <MainInput
            label="To"
            type="datetime-local"
            min={minFrom}
            max={maxTo}
            value={toLocal}
            onChange={(e) => setToLocal(e.target.value)}
          />

          {error && (
            <div className="rounded border border-down/40 bg-down/10 px-3 py-2 text-xs text-down">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Apply range
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CustomRangeModal;
