import React from 'react';
import { KpiGrid } from '../components/dashboard/KpiGrid';
import { FilterToolbar } from '../components/dashboard/FilterToolbar';
import { ActualVsForecastChart } from '../components/charts/ActualVsForecastChart';
import { ForecastAccuracySummary } from '../components/dashboard/ForecastAccuracySummary';
import { ForecastPublicationTable } from '../components/tables/ForecastPublicationTable';
import { HalfHourlyTable } from '../components/tables/HalfHourlyTable';
import { Button } from '../components/ui/Button';
import { useWindData } from '../hooks/useWindData';
import { API_BASE_URL } from '../services/api';
import { 
  Calendar, 
  AlertTriangle,
  RefreshCw,
  Clock,
  ShieldCheck
} from 'lucide-react';

interface OverviewPageProps {
  dataState: ReturnType<typeof useWindData>;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ dataState }) => {
  const {
    isLoading,
    apiError,
    handleRetry,
    kpis,
    records,
    totalRawRecords,
    publications,
    distribution,
    dateRange,
    setDateRange,
    granularity,
    setGranularity,
    biasFilter,
    setBiasFilter,
    searchDeliveryTime,
    setSearchDeliveryTime,
    showPeakOnly,
    setShowPeakOnly,
    chartSeries,
    cutoffTime,
  } = dataState;

  const handleClearFilters = () => {
    setDateRange({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      label: 'All January 2026 (SP 1–1488)',
    });
    setGranularity('30m');
    setBiasFilter('all');
    setSearchDeliveryTime('');
    setShowPeakOnly(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Error Alert Banner if backend request fails */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-800">
                Backend Connection Error
              </h3>
              <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                {apiError} Verify that the FastAPI backend service is running on <code className="font-mono bg-red-100 px-1 py-0.5 rounded text-red-800">{API_BASE_URL}</code>.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="bg-white border-red-300 text-red-700 hover:bg-red-100 flex-shrink-0"
          >
            Retry Connection
          </Button>
        </div>
      )}

      {/* Historical Dataset & Market Cutoff Notice Banner */}
      <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-navy-50 border border-navy-200 flex items-center justify-center text-navy-700 flex-shrink-0 mt-0.5">
            <Calendar className="w-4 h-4 text-forecast" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-navy-800">
                UK Electricity Market Backtesting Context
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-actual-light text-actual-dark border border-actual-border">
                Elexon BMRS FUELHH & WINDFOR
              </span>
            </div>
            <p className="text-xs text-navy-600 mt-0.5 leading-relaxed">
              Target baseline: <strong className="text-navy-900 font-semibold">January 1 – January 31, 2026</strong>. 
              Active gate closure policy: Forecasts published prior to <strong className="text-navy-900 font-semibold">D-1 {cutoffTime} UTC</strong> are selected for each delivery day.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 self-start md:self-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-medium text-navy-700">
            <ShieldCheck className="w-3.5 h-3.5 text-actual" />
            <span>{kpis.coveragePercent !== null ? `${kpis.coveragePercent.toFixed(1)}% Coverage (${kpis.matchedPeriods.toLocaleString()} / ${kpis.totalSettlementPeriods.toLocaleString()} SPs)` : 'Awaiting Coverage'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-medium text-navy-700">
            <Clock className="w-3.5 h-3.5 text-forecast" />
            <span>Cutoff: {cutoffTime} UTC</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">Key Performance Indicators</h2>
        <KpiGrid kpis={kpis} isLoading={isLoading} />
      </section>

      {/* Filter Toolbar */}
      <FilterToolbar
        dateRange={dateRange}
        onSelectDateRange={setDateRange}
        granularity={granularity}
        onSelectGranularity={setGranularity}
        biasFilter={biasFilter}
        onSelectBiasFilter={setBiasFilter}
        showPeakOnly={showPeakOnly}
        onTogglePeakOnly={() => setShowPeakOnly(!showPeakOnly)}
        searchQuery={searchDeliveryTime}
        onSearchChange={setSearchDeliveryTime}
        onClearFilters={handleClearFilters}
        showingCount={records.length}
        totalCount={totalRawRecords}
        disabled={isLoading || totalRawRecords === 0}
      />

      {/* Main Dual-Line Chart */}
      <section aria-labelledby="main-chart-heading">
        <h2 id="main-chart-heading" className="sr-only">Wind Generation Main Chart</h2>
        <ActualVsForecastChart
          data={chartSeries}
          granularity={granularity}
          isLoading={isLoading}
          error={apiError}
          onRetry={handleRetry}
          cutoffTime={cutoffTime}
        />
      </section>

      {/* Supporting Panels: 2 Columns */}
      <section aria-labelledby="supporting-panels-heading" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <h2 id="supporting-panels-heading" className="sr-only">Supporting Analytical Panels</h2>
        
        {/* Forecast Publication History */}
        <ForecastPublicationTable
          publications={publications}
          isLoading={isLoading}
        />

        {/* Forecast Accuracy Summary */}
        <ForecastAccuracySummary
          distribution={distribution}
          isLoading={isLoading}
        />
      </section>

      {/* Half-Hourly Generation Table */}
      <section aria-labelledby="settlement-table-heading">
        <h2 id="settlement-table-heading" className="sr-only">Half-Hourly Settlement Period Table</h2>
        <HalfHourlyTable
          records={records}
          isLoading={isLoading}
        />
      </section>
    </div>
  );
};

