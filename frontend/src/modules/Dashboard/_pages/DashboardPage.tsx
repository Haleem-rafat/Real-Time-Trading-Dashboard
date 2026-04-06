import DashboardLayout from '../_layouts/DashboardLayout';
import TickerListView from '../_views/TickerListView';
import PriceChartView from '../_views/PriceChartView';

function DashboardPage() {
  return (
    <DashboardLayout sidebar={<TickerListView />}>
      <PriceChartView />
    </DashboardLayout>
  );
}

export default DashboardPage;
