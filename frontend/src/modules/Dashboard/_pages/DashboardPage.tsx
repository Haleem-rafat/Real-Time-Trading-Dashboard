import { useAppSelector } from '@store/hooks';
import DashboardLayout from '../_layouts/DashboardLayout';
import TickerListView from '../_views/TickerListView';

/**
 * Step 12 — ticker list with live updates is in place.
 * Step 13 will replace the placeholder on the right with the
 * Recharts <LiveChart /> for the currently selected ticker.
 */
function DashboardPage() {
  const selected = useAppSelector((s) => s.selectedTicker.symbol);

  return (
    <DashboardLayout sidebar={<TickerListView />}>
      <div className="flex h-full min-h-[600px] items-center justify-center px-6">
        <div className="text-center">
          <p className="text-sm uppercase tracking-wider text-text-dim">
            Selected
          </p>
          <p className="mt-2 text-5xl font-semibold tracking-tight">
            {selected ?? '—'}
          </p>
          <p className="mt-4 max-w-md text-sm text-text-muted">
            The live chart for the selected ticker will appear here in
            Step&nbsp;13.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default DashboardPage;
