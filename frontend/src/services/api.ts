/**
 * UK Wind Intelligence - API Client Service
 * Connects directly to the FastAPI backend (/health, /api/v1/data/diagnostics, /api/v1/analytics)
 */

import type { 
  SettlementPeriodRecord, 
  WindKpis, 
  ForecastPublicationRun, 
  AccuracyDistribution,
  DataConnectionState,
  DataDiagnostics,
  BackendHealth,
  AnalyticsMetadata
} from '../types/wind';

// Read API URL from Vite environment with localhost fallback
export const API_BASE_URL: string = (
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000'
).replace(/\/$/, '');

export interface AnalyticsResult {
  kpis: WindKpis;
  records: SettlementPeriodRecord[];
  distribution: AccuracyDistribution[];
  publications: ForecastPublicationRun[];
  metadata: AnalyticsMetadata;
}

export const AWAITING_VERIFIED_KPIS: WindKpis = {
  maeMw: null,
  rmseMw: null,
  biasMw: null,
  coveragePercent: null,
  totalSettlementPeriods: 1488,
  matchedPeriods: 0,
  unmatchedPeriods: 1488,
  calculationTimestamp: null,
  datasetPeriod: 'January 1–31, 2026',
};

export const AWAITING_CONNECTION_STATE: DataConnectionState = {
  status: 'syncing',
  backendUrl: API_BASE_URL,
  lastHeartbeat: null,
  datasetName: 'Elexon BMRS FUELHH (WIND) vs WINDFOR',
  elexonApiStatus: 'unknown',
};

export const windService = {
  /**
   * Check backend health and Elexon BMRS endpoint status.
   */
  async checkHealth(): Promise<BackendHealth> {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Health check failed with HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Fetch comprehensive data diagnostics (record counts, missing periods, cache stats).
   */
  async getDiagnostics(
    startDate: string = '2026-01-01',
    endDate: string = '2026-01-31',
    cutoffTime: string = '12:00',
    forceRefresh: boolean = false
  ): Promise<DataDiagnostics> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      cutoff_time: cutoffTime,
      force_refresh: String(forceRefresh),
    });

    const response = await fetch(`${API_BASE_URL}/api/v1/data/diagnostics?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Diagnostics request failed (HTTP ${response.status}): ${errorText}`);
    }

    return response.json();
  },

  /**
   * Fetch primary analytics series: KPIs, 1,488 matched settlement intervals,
   * capacity band breakdowns, and publication history.
   */
  async getAnalytics(
    startDate: string = '2026-01-01',
    endDate: string = '2026-01-31',
    cutoffTime: string = '12:00',
    forceRefresh: boolean = false
  ): Promise<AnalyticsResult> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      cutoff_time: cutoffTime,
      force_refresh: String(forceRefresh),
    });

    const response = await fetch(`${API_BASE_URL}/api/v1/analytics?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Analytics request failed (HTTP ${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // Map backend Pydantic models into frontend TypeScript interfaces
    const mappedKpis: WindKpis = {
      maeMw: data.kpis.mae_mw,
      rmseMw: data.kpis.rmse_mw,
      biasMw: data.kpis.forecast_bias_mw,
      coveragePercent: data.kpis.matched_data_coverage_percent,
      totalSettlementPeriods: data.kpis.total_settlement_periods,
      matchedPeriods: data.kpis.matched_periods,
      unmatchedPeriods: data.kpis.unmatched_periods,
      calculationTimestamp: data.metadata.retrieval_timestamp,
      datasetPeriod: `${data.metadata.start_date} – ${data.metadata.end_date}`,
    };

    const mappedRecords: SettlementPeriodRecord[] = (data.intervals || []).map((item: any) => ({
      id: item.id,
      settlementDate: item.settlementDate,
      settlementPeriod: item.settlementPeriod,
      deliveryTime: item.deliveryTime,
      startTime: item.startTime,
      actualMw: item.actualMw,
      forecastMw: item.forecastMw,
      errorMw: item.errorMw,
      absErrorMw: item.absErrorMw,
      errorPercent: item.errorPercent,
      biasDirection: item.biasDirection,
      isPeakPeriod: Boolean(item.isPeak),
      sourceDataset: 'Elexon BMRS FUELHH (WIND) vs WINDFOR',
      selectedPublishTime: item.selectedPublishTime,
    }));

    const mappedDistribution: AccuracyDistribution[] = (data.capacity_band_breakdown || []).map((band: any) => ({
      category: band.category,
      periodCount: band.period_count,
      meanErrorMw: band.mean_error_mw,
      maeMw: band.mae_mw,
      frequencyPercent: band.frequency_percent,
    }));

    const mappedPublications: ForecastPublicationRun[] = (data.publications_summary || []).map((pub: any) => ({
      id: pub.id,
      publicationType: pub.publication_type,
      targetDeliveryDate: pub.min_delivery_time ? pub.min_delivery_time.slice(0, 10) : '2026-01-01',
      publishedAt: pub.published_at,
      version: 1,
      source: pub.source,
      status: pub.status,
      recordsCount: pub.records_count,
      minDeliveryTime: pub.min_delivery_time,
      maxDeliveryTime: pub.max_delivery_time,
    }));

    return {
      kpis: mappedKpis,
      records: mappedRecords,
      distribution: mappedDistribution,
      publications: mappedPublications,
      metadata: data.metadata,
    };
  },
};
