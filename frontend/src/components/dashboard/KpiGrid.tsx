import React from 'react';
import { KpiCard } from './KpiCard';
import type { WindKpis } from '../../types/wind';

interface KpiGridProps {
  kpis: WindKpis;
  isLoading?: boolean;
}

export const KpiGrid: React.FC<KpiGridProps> = ({ kpis, isLoading = false }) => {
  const isVerified = kpis.maeMw !== null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Forecast MAE (MW) */}
      <KpiCard
        title="Forecast MAE"
        value={kpis.maeMw !== null ? Math.round(kpis.maeMw) : null}
        unit="MW"
        tooltipText="Mean Absolute Error across all settlement periods. Measures average magnitude of forecast errors without considering their direction."
        formula="MAE = (1/N) * Σ |Forecast_i - Actual_i|"
        benchmark="Target: < 450 MW for Day-Ahead UK National series"
        status={isVerified ? 'verified' : 'awaiting'}
        isLoading={isLoading}
        trend={{
          direction: 'neutral',
          text: isVerified ? `${kpis.matchedPeriods} / ${kpis.totalSettlementPeriods} SPs` : 'Day-Ahead WINDFOR',
          isGood: true,
        }}
        subtitle={isVerified ? `${kpis.matchedPeriods.toLocaleString()} matched SPs` : 'Across 1,488 SPs'}
      />

      {/* 2. Forecast RMSE (MW) */}
      <KpiCard
        title="Forecast RMSE"
        value={kpis.rmseMw !== null ? Math.round(kpis.rmseMw) : null}
        unit="MW"
        tooltipText="Root Mean Squared Error. Penalizes large forecast outliers more severely than MAE, essential for hedging ramp risks."
        formula="RMSE = √[ (1/N) * Σ (Forecast_i - Actual_i)² ]"
        benchmark="Identifies volatility spikes during severe gale events"
        status={isVerified ? 'verified' : 'awaiting'}
        isLoading={isLoading}
        trend={{
          direction: 'neutral',
          text: isVerified ? `RMSE/MAE: ${(kpis.rmseMw! / (kpis.maeMw || 1)).toFixed(2)}x` : 'Ramp Volatility',
          isGood: true,
        }}
        subtitle="Quadratic penalty metric"
      />

      {/* 3. Forecast Bias (MW) */}
      <KpiCard
        title="Forecast Bias"
        value={kpis.biasMw !== null ? (kpis.biasMw > 0 ? `+${Math.round(kpis.biasMw)}` : `${Math.round(kpis.biasMw)}`) : null}
        unit="MW"
        tooltipText="Mean Error (Forecast - Actual). Positive bias indicates persistent over-forecasting (long risk); negative bias indicates under-forecasting (short risk)."
        formula="Bias = (1/N) * Σ (Forecast_i - Actual_i)"
        benchmark="Ideal: 0 MW (neutral imbalance risk)"
        status={isVerified ? 'verified' : 'awaiting'}
        isLoading={isLoading}
        trend={{
          direction: (kpis.biasMw || 0) > 0 ? 'up' : 'down',
          text: (kpis.biasMw || 0) > 0 ? '+Over-forecast tendency' : 'Under-forecast tendency',
          isGood: Math.abs(kpis.biasMw || 0) < 100,
        }}
        subtitle="System Imbalance Exposure"
      />

      {/* 4. Matched Data Coverage (%) */}
      <KpiCard
        title="Matched Data Coverage"
        value={kpis.coveragePercent !== null ? `${kpis.coveragePercent.toFixed(1)}%` : null}
        unit=""
        tooltipText="Percentage of half-hourly settlement periods in January 2026 where both published Day-Ahead forecast and verified outturn generation were successfully paired."
        formula="Coverage = (Matched SPs / Total SPs) * 100%"
        benchmark="Requirement: > 99.5% for trading audit"
        status={isVerified ? 'verified' : 'awaiting'}
        isLoading={isLoading}
        trend={{
          direction: 'neutral',
          text: `${kpis.matchedPeriods} / ${kpis.totalSettlementPeriods} SPs Matched`,
          isGood: (kpis.coveragePercent || 0) >= 99,
        }}
        subtitle={isVerified ? (kpis.unmatchedPeriods === 0 ? '0 missing SPs (100% matched)' : `${kpis.unmatchedPeriods} missing SPs`) : '1,488 SPs in Jan'}
      />
    </div>
  );
};
