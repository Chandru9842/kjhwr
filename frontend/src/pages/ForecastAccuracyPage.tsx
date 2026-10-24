import React from 'react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useWindData } from '../hooks/useWindData';
import { Target, Layers, Info, ShieldCheck, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

interface ForecastAccuracyPageProps {
  dataState: ReturnType<typeof useWindData>;
}

export const ForecastAccuracyPage: React.FC<ForecastAccuracyPageProps> = ({ dataState }) => {
  const { kpis, distribution, records, cutoffTime, isLoading, apiError, handleRetry } = dataState;

  // Real statistics computed from live records
  const ratio = kpis.maeMw && kpis.rmseMw ? (kpis.rmseMw / kpis.maeMw).toFixed(2) : null;
  
  const maxAbsError = records.length > 0
    ? records.reduce((max, r) => {
        const err = r.absErrorMw ?? (r.errorMw !== null ? Math.abs(r.errorMw) : 0);
        return err > max ? err : max;
      }, 0)
    : null;

  const overCount = records.filter(r => r.biasDirection === 'over').length;
  const underCount = records.filter(r => r.biasDirection === 'under').length;
  const exactCount = records.filter(r => r.biasDirection === 'exact').length;
  const total = records.length || 1;
  const overPercent = records.length > 0 ? ((overCount / total) * 100).toFixed(1) : '0';
  const underPercent = records.length > 0 ? ((underCount / total) * 100).toFixed(1) : '0';

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
                {apiError} Unable to fetch analytics metrics.
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

      {/* Page Header Banner */}
      <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-forecast-light border border-forecast-border flex items-center justify-center text-forecast-dark flex-shrink-0">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-navy-800">
              Statistical Error & Volatility Breakdown
            </h2>
            <p className="text-xs text-navy-500">
              Evaluation of Day-Ahead MAE, RMSE, and curtailment biases for January 2026.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="actual" size="sm">
            <ShieldCheck className="w-3 h-3 mr-1 inline" />
            {kpis.coveragePercent !== null ? `${kpis.coveragePercent.toFixed(1)}% Matched Coverage (${kpis.matchedPeriods} / ${kpis.totalSettlementPeriods} SPs)` : 'Verified Data'}
          </Badge>
          <Badge variant="neutral" size="sm">
            <Clock className="w-3 h-3 mr-1 inline" />
            Cutoff: D-1 {cutoffTime} UTC
          </Badge>
        </div>
      </div>

      {/* Top 3 Statistical KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader
            title="MAE vs RMSE Ratio"
            subtitle="Indicates presence of large forecast ramp errors"
          />
          <div className="py-2">
            {isLoading ? (
              <div className="h-8 w-24 bg-[#E2E8F0] animate-pulse rounded mb-2" />
            ) : (
              <div className="text-2xl font-bold font-mono text-navy-900">
                {ratio ?? '— —'}
              </div>
            )}
            <p className="text-xs text-navy-500 mt-1">
              {ratio 
                ? `Ratio of ${ratio}x indicates significant tail-risk volatility during heavy wind gale ramp events.` 
                : 'Awaiting verified data from Elexon BMRS series.'}
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Max Absolute Error"
            subtitle="Largest single settlement period deviation"
          />
          <div className="py-2">
            {isLoading ? (
              <div className="h-8 w-28 bg-[#E2E8F0] animate-pulse rounded mb-2" />
            ) : (
              <div className="text-2xl font-bold font-mono text-navy-900">
                {maxAbsError !== null ? `${Math.round(maxAbsError).toLocaleString()} MW` : '— —'}
              </div>
            )}
            <p className="text-xs text-navy-500 mt-1">
              Peak error delta across all 1,488 half-hour settlement periods in January 2026.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Directional Bias Ratio"
            subtitle="Over-forecast vs Under-forecast frequency"
          />
          <div className="py-2">
            {isLoading ? (
              <div className="h-8 w-32 bg-[#E2E8F0] animate-pulse rounded mb-2" />
            ) : (
              <div className="text-2xl font-bold font-mono text-navy-900">
                {records.length > 0 ? `${overPercent}% / ${underPercent}%` : '— —'}
              </div>
            )}
            <p className="text-xs text-navy-500 mt-1">
              {records.length > 0
                ? `${overCount} over-forecast SPs vs ${underCount} under-forecast SPs (${exactCount} exact).`
                : 'Awaiting verified data from Elexon BMRS series.'}
            </p>
          </div>
        </Card>
      </div>

      {/* Capacity Band Breakdown Section */}
      <Card>
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-forecast" />
              <span>Generation Capacity Band Breakdown</span>
            </div>
          }
          subtitle="Evaluation of forecast precision categorized by actual outturn generation output tier"
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-navy-500 uppercase tracking-wider font-semibold text-[11px] bg-[#F8FAFC]">
                <th className="py-3 px-3">Actual Generation Tier</th>
                <th className="py-3 px-3 text-right">Settlement Periods</th>
                <th className="py-3 px-3 text-right">Monthly Frequency</th>
                <th className="py-3 px-3 text-right text-navy-800">Mean Absolute Error (MAE)</th>
                <th className="py-3 px-3 text-right text-navy-800">Forecast Bias (Mean Error)</th>
                <th className="py-3 px-3 text-center">Bias Direction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] font-medium text-navy-700">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-3"><div className="h-4 w-28 bg-[#E2E8F0] rounded" /></td>
                    <td className="py-3 px-3 text-right"><div className="h-4 w-16 bg-[#E2E8F0] rounded ml-auto" /></td>
                    <td className="py-3 px-3 text-right"><div className="h-4 w-16 bg-[#E2E8F0] rounded ml-auto" /></td>
                    <td className="py-3 px-3 text-right"><div className="h-4 w-20 bg-[#E2E8F0] rounded ml-auto" /></td>
                    <td className="py-3 px-3 text-right"><div className="h-4 w-20 bg-[#E2E8F0] rounded ml-auto" /></td>
                    <td className="py-3 px-3 text-center"><div className="h-4 w-16 bg-[#E2E8F0] rounded mx-auto" /></td>
                  </tr>
                ))
              ) : distribution.length > 0 ? (
                distribution.map((band) => (
                  <tr key={band.category} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-3 font-semibold text-navy-900">{band.category}</td>
                    <td className="py-3 px-3 text-right font-mono">{band.periodCount} SPs</td>
                    <td className="py-3 px-3 text-right font-mono">{band.frequencyPercent?.toFixed(1)}%</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-navy-900">
                      {band.maeMw ? `${Math.round(band.maeMw).toLocaleString()} MW` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      {band.meanErrorMw !== null ? (
                        <span className={band.meanErrorMw > 0 ? 'text-amber-600' : 'text-blue-600'}>
                          {band.meanErrorMw > 0 ? `+${Math.round(band.meanErrorMw).toLocaleString()}` : Math.round(band.meanErrorMw).toLocaleString()} MW
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {(band.meanErrorMw || 0) > 0 ? (
                        <Badge variant="amber" size="sm">Over-forecast</Badge>
                      ) : (
                        <Badge variant="forecast" size="sm">Under-forecast</Badge>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-navy-400">
                    No capacity band data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Accuracy Evaluation Methodology */}
      <Card>
        <CardHeader
          title="National Wind Forecasting Evaluation Framework"
          subtitle="Formulas and industry standards applied for UK Electricity Trading"
        />
        <div className="space-y-4 text-xs text-navy-700 leading-relaxed">
          <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-3 text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-navy-900">
              <Info className="w-3.5 h-3.5 text-forecast" />
              <span>Matching & Balance Boundary Disclosures:</span>
            </div>
            <p>
              • <strong>Hourly Alignment:</strong> WINDFOR provides hourly average MW. Half-hourly actuals (FUELHH) are paired by mapping each 30-min settlement period to its parent delivery hour via <code className="font-mono">floor(&apos;h&apos;)</code>. The identical forecast across the two periods reflects National Grid ESO&apos;s published data model.
            </p>
            <p>
              • <strong>Balancing Scope:</strong> Forecast error is defined as <code className="font-mono text-forecast">Forecast MW - Actual MW</code>. National demand, thermal dispatch, and interconnectors are outside this scope; this dashboard evaluates pure wind forecasting performance and does not derive total imbalance procurement volumes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <h4 className="font-semibold text-navy-900 mb-1">Mean Absolute Error (MAE)</h4>
              <p className="text-navy-600 mb-2 font-mono text-[11px]">MAE = (1/N) * Σ |Forecast_i - Actual_i|</p>
              <p className="text-navy-500 text-[11px]">
                Direct metric of average forecasting error magnitude in Megawatts across all matched settlement periods.
              </p>
            </div>
            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <h4 className="font-semibold text-navy-900 mb-1">Root Mean Squared Error (RMSE)</h4>
              <p className="text-navy-600 mb-2 font-mono text-[11px]">RMSE = √[ (1/N) * Σ (Forecast_i - Actual_i)² ]</p>
              <p className="text-navy-500 text-[11px]">
                Quadratic loss metric heavily penalizing extreme weather ramp rate deviations and unexpected gale fronts.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

