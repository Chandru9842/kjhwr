/**
 * UK Wind Intelligence - TypeScript Type Definitions
 * Exact alignment with FastAPI backend response contracts and Elexon BMRS data models.
 */

export interface SettlementPeriodRecord {
  id: string;
  settlementDate: string; // YYYY-MM-DD
  settlementPeriod: number; // 1 to 48 (or 50 during clock changes)
  deliveryTime: string; // e.g. "00:00 - 00:30"
  startTime: string; // ISO-8601 UTC delivery window start
  forecastMw: number | null; // Day-Ahead selected wind forecast (MW)
  actualMw: number | null; // Outturn wind generation (MW)
  errorMw: number | null; // Forecast - Actual (MW)
  absErrorMw?: number | null; // |Forecast - Actual| (MW)
  errorPercent: number | null; // |Error| / Actual * 100
  biasDirection: 'over' | 'under' | 'exact' | 'unmatched';
  isPeakPeriod: boolean; // UK peak settlement hours (07:00 - 19:00, SP 15–38)
  sourceDataset: string; // "Elexon BMRS FUELHH (WIND) vs WINDFOR"
  selectedPublishTime?: string | null; // Timestamp of chosen publication run
}

export interface WindKpis {
  maeMw: number | null; // Mean Absolute Error: (1/N) * Σ |forecast - actual|
  rmseMw: number | null; // Root Mean Squared Error: √[ (1/N) * Σ (forecast - actual)² ]
  biasMw: number | null; // Mean Error: (1/N) * Σ (forecast - actual)
  coveragePercent: number | null; // Matched periods / Total periods * 100
  totalSettlementPeriods: number;
  matchedPeriods: number;
  unmatchedPeriods: number;
  calculationTimestamp: string | null;
  datasetPeriod: string; // "January 1–31, 2026"
}

export interface ForecastPublicationRun {
  id: string;
  publicationType: string;
  targetDeliveryDate: string;
  publishedAt: string;
  version: number;
  source: string;
  status: string;
  recordsCount: number;
  minDeliveryTime?: string | null;
  maxDeliveryTime?: string | null;
}

export interface AccuracyDistribution {
  category: string;
  periodCount: number;
  meanErrorMw: number | null;
  maeMw: number | null;
  frequencyPercent: number | null;
}

export interface DateFilterRange {
  startDate: string; // ISO date string "2026-01-01"
  endDate: string; // ISO date string "2026-01-31"
  label: string;
}

export type GranularityResolution = '30m' | '1h' | 'daily';

export type NavigationTab = 
  | 'overview' 
  | 'forecast-accuracy' 
  | 'forecast-history' 
  | 'data-quality' 
  | 'settings';

export interface DataConnectionState {
  status: 'connected' | 'awaiting_data' | 'syncing' | 'error';
  backendUrl: string;
  lastHeartbeat: string | null;
  latencyMs?: number | null;
  datasetName: string;
  elexonApiStatus: 'healthy' | 'degraded' | 'unreachable' | 'unknown';
}

export interface AnalyticsMetadata {
  start_date: string;
  end_date: string;
  decision_cutoff_time: string;
  market_cutoff_rule: string;
  market_uncertainty_explanation: string;
  data_sources: string[];
  retrieval_timestamp: string;
}

export interface DataDiagnostics {
  fuelhh_outturn: {
    dataset: string;
    total_records_ingested: number;
    expected_settlement_periods: number;
    missing_settlement_audit: {
      is_complete: boolean;
      total_expected_periods: number;
      total_received_periods: number;
      unique_settlement_days: number;
      incomplete_dates_count: number;
      incomplete_dates_detail: Record<string, number[]>;
    };
    min_settlement_date: string | null;
    max_settlement_date: string | null;
  };
  windfor_forecasts: {
    dataset: string;
    total_records_ingested: number;
    distinct_publication_runs: number;
    min_delivery_time: string | null;
    max_delivery_time: string | null;
  };
  matching_integrity: {
    total_intervals: number;
    matched_intervals: number;
    unmatched_intervals: number;
    coverage_percent: number;
    is_complete_month_coverage: boolean;
  };
  decision_cutoff_specification: {
    cutoff_time_used: string;
    filtered_out_post_cutoff_count: number;
    covered_delivery_intervals: number;
    documentation: {
      default_cutoff_time_utc: string;
      market_context: string;
      market_uncertainty_explanation: string;
      cutoff_rule: string;
    };
  };
  cache_health: {
    enabled: boolean;
    ttl_hours: number;
    memory_keys_count: number;
    disk_files_count: number;
    hits: number;
    misses: number;
    hit_ratio_percent: number;
    cache_dir: string;
  };
  diagnostics_timestamp: string;
}

export interface BackendHealth {
  status: 'healthy' | 'degraded' | 'unreachable';
  service: string;
  version: string;
  timestamp: string;
  elexon_api: {
    status: 'healthy' | 'degraded' | 'unreachable';
    latency_ms?: number;
    endpoint?: string;
    checked_at?: string;
  };
}
