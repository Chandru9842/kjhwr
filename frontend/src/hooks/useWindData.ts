import { useState, useEffect, useMemo, useCallback } from 'react';
import type { 
  SettlementPeriodRecord, 
  WindKpis, 
  ForecastPublicationRun, 
  AccuracyDistribution,
  DateFilterRange,
  GranularityResolution,
  DataConnectionState,
  DataDiagnostics,
  AnalyticsMetadata
} from '../types/wind';
import { 
  windService, 
  AWAITING_VERIFIED_KPIS, 
  AWAITING_CONNECTION_STATE,
  API_BASE_URL
} from '../services/api';

export function useWindData() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date());
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<Date | null>(null);
  
  // Data states
  const [kpis, setKpis] = useState<WindKpis>(AWAITING_VERIFIED_KPIS);
  const [rawRecords, setRawRecords] = useState<SettlementPeriodRecord[]>([]);
  const [publications, setPublications] = useState<ForecastPublicationRun[]>([]);
  const [distribution, setDistribution] = useState<AccuracyDistribution[]>([]);
  const [diagnostics, setDiagnostics] = useState<DataDiagnostics | null>(null);
  const [metadata, setMetadata] = useState<AnalyticsMetadata | null>(null);
  const [connectionState, setConnectionState] = useState<DataConnectionState>(AWAITING_CONNECTION_STATE);

  // Cutoff configuration (Day-Ahead Gate Closure)
  const [cutoffTime, setCutoffTime] = useState<string>('12:00');

  // Filter states
  const [dateRange, setDateRange] = useState<DateFilterRange>({
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    label: 'All January 2026 (SP 1–1488)',
  });
  const [granularity, setGranularity] = useState<GranularityResolution>('30m');
  const [biasFilter, setBiasFilter] = useState<'all' | 'over' | 'under'>('all');
  const [searchDeliveryTime, setSearchDeliveryTime] = useState<string>('');
  const [showPeakOnly, setShowPeakOnly] = useState<boolean>(false);

  // Core Data Fetcher from real FastAPI Backend
  const loadData = useCallback(async (isRefresh = false, forceApiRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setApiError(null);

    try {
      // 1. Check health in parallel
      const healthPromise = windService.checkHealth().catch(err => {
        console.warn('Health check warning:', err);
        return null;
      });

      // 2. Query Analytics and Diagnostics
      const [healthRes, analyticsRes, diagRes] = await Promise.all([
        healthPromise,
        windService.getAnalytics(
          dateRange.startDate,
          dateRange.endDate,
          cutoffTime,
          forceApiRefresh
        ),
        windService.getDiagnostics(
          dateRange.startDate,
          dateRange.endDate,
          cutoffTime,
          forceApiRefresh
        ).catch(err => {
          console.warn('Diagnostics error:', err);
          return null;
        }),
      ]);

      // Update state with verified data
      setKpis(analyticsRes.kpis);
      setRawRecords(analyticsRes.records);
      setPublications(analyticsRes.publications);
      setDistribution(analyticsRes.distribution);
      setMetadata(analyticsRes.metadata);
      if (diagRes) setDiagnostics(diagRes);

      const now = new Date();
      setLastUpdated(now);
      setLastSuccessfulSync(now);

      // Update connection state
      setConnectionState({
        status: 'connected',
        backendUrl: API_BASE_URL,
        lastHeartbeat: now.toISOString(),
        latencyMs: healthRes?.elexon_api?.latency_ms ?? null,
        datasetName: 'Elexon BMRS FUELHH (WIND) vs WINDFOR',
        elexonApiStatus: healthRes?.elexon_api?.status ?? 'healthy',
      });
    } catch (err: any) {
      console.error('Failed to load data from backend:', err);
      const errMsg = err?.message || 'Failed to connect to UK Wind Intelligence backend service.';
      setApiError(errMsg);
      setConnectionState(prev => ({
        ...prev,
        status: 'error',
      }));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [dateRange.startDate, dateRange.endDate, cutoffTime]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    loadData(true, true);
  }, [loadData]);

  const handleRetry = useCallback(() => {
    loadData(false, false);
  }, [loadData]);

  // Filtered records for table and chart
  const filteredRecords = useMemo(() => {
    if (rawRecords.length === 0) return [];

    return rawRecords.filter(record => {
      // Date bounds
      if (record.settlementDate < dateRange.startDate || record.settlementDate > dateRange.endDate) {
        return false;
      }

      // Bias direction filter
      if (biasFilter === 'over' && record.biasDirection !== 'over') return false;
      if (biasFilter === 'under' && record.biasDirection !== 'under') return false;

      // Peak filter (07:00 - 19:00 UK Peak settlement hours)
      if (showPeakOnly && !record.isPeakPeriod) return false;

      // Search time / settlement period / date
      if (searchDeliveryTime.trim()) {
        const query = searchDeliveryTime.toLowerCase();
        const matchesSp = `sp ${record.settlementPeriod}`.includes(query) || `${record.settlementPeriod}` === query;
        const matchesTime = record.deliveryTime.toLowerCase().includes(query);
        const matchesDate = record.settlementDate.includes(query);
        if (!matchesSp && !matchesTime && !matchesDate) return false;
      }

      return true;
    });
  }, [rawRecords, dateRange, biasFilter, showPeakOnly, searchDeliveryTime]);

  // Aggregated series for chart based on selected granularity
  const chartSeries = useMemo(() => {
    if (filteredRecords.length === 0) return [];

    if (granularity === '30m') {
      return filteredRecords.map(r => ({
        timestamp: `${r.settlementDate.slice(5)} SP${r.settlementPeriod}`,
        fullLabel: `${r.settlementDate} SP${r.settlementPeriod} (${r.deliveryTime})`,
        actual: r.actualMw,
        forecast: r.forecastMw,
        error: r.errorMw,
        absError: r.absErrorMw !== null && r.absErrorMw !== undefined ? r.absErrorMw : (r.errorMw !== null ? Math.abs(r.errorMw) : null),
      }));
    }

    if (granularity === '1h') {
      // Group every 2 settlement periods into 1 delivery hour
      const hourlyMap = new Map<string, { actuals: number[]; forecasts: number[]; errors: number[]; label: string }>();
      
      filteredRecords.forEach(r => {
        const hour = Math.floor((r.settlementPeriod - 1) / 2);
        const hourKey = `${r.settlementDate} ${String(hour).padStart(2, '0')}:00`;
        if (!hourlyMap.has(hourKey)) {
          hourlyMap.set(hourKey, { actuals: [], forecasts: [], errors: [], label: hourKey });
        }
        const group = hourlyMap.get(hourKey)!;
        if (r.actualMw !== null) group.actuals.push(r.actualMw);
        if (r.forecastMw !== null) group.forecasts.push(r.forecastMw);
        if (r.errorMw !== null) group.errors.push(r.errorMw);
      });

      return Array.from(hourlyMap.entries()).map(([key, g]) => ({
        timestamp: key.slice(5),
        fullLabel: `${key} UTC (Delivery Hour)`,
        actual: g.actuals.length ? Math.round(g.actuals.reduce((a, b) => a + b, 0) / g.actuals.length) : null,
        forecast: g.forecasts.length ? Math.round(g.forecasts.reduce((a, b) => a + b, 0) / g.forecasts.length) : null,
        error: g.errors.length ? Math.round(g.errors.reduce((a, b) => a + b, 0) / g.errors.length) : null,
        absError: g.errors.length ? Math.round(Math.abs(g.errors.reduce((a, b) => a + b, 0) / g.errors.length)) : null,
      }));
    }

    if (granularity === 'daily') {
      // Group by calendar day
      const dailyMap = new Map<string, { actuals: number[]; forecasts: number[]; errors: number[] }>();

      filteredRecords.forEach(r => {
        if (!dailyMap.has(r.settlementDate)) {
          dailyMap.set(r.settlementDate, { actuals: [], forecasts: [], errors: [] });
        }
        const group = dailyMap.get(r.settlementDate)!;
        if (r.actualMw !== null) group.actuals.push(r.actualMw);
        if (r.forecastMw !== null) group.forecasts.push(r.forecastMw);
        if (r.errorMw !== null) group.errors.push(r.errorMw);
      });

      return Array.from(dailyMap.entries()).map(([date, g]) => ({
        timestamp: date.slice(5), // "01-15"
        fullLabel: `Settlement Date: ${date}`,
        actual: g.actuals.length ? Math.round(g.actuals.reduce((a, b) => a + b, 0) / g.actuals.length) : null,
        forecast: g.forecasts.length ? Math.round(g.forecasts.reduce((a, b) => a + b, 0) / g.forecasts.length) : null,
        error: g.errors.length ? Math.round(g.errors.reduce((a, b) => a + b, 0) / g.errors.length) : null,
        absError: g.errors.length ? Math.round(Math.abs(g.errors.reduce((a, b) => a + b, 0) / g.errors.length)) : null,
      }));
    }

    return [];
  }, [filteredRecords, granularity]);

  return {
    isLoading,
    isRefreshing,
    apiError,
    lastUpdated,
    lastSuccessfulSync,
    kpis,
    records: filteredRecords,
    totalRawRecords: rawRecords.length,
    chartSeries,
    publications,
    distribution,
    diagnostics,
    metadata,
    cutoffTime,
    setCutoffTime,
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
    handleRefresh,
    handleRetry,
    connectionState,
  };
}
