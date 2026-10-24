import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { 
  Layers, 
  Database, 
  Calendar,
  AlertTriangle,
  RefreshCw,
  Info,
  Clock
} from 'lucide-react';

interface ChartDataPoint {
  timestamp: string;
  fullLabel: string;
  actual: number | null;
  forecast: number | null;
  error: number | null;
  absError: number | null;
}

interface ActualVsForecastChartProps {
  data: ChartDataPoint[];
  granularity: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  cutoffTime?: string;
}

// Custom enterprise tooltip for electricity traders
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const actualVal = payload.find((p: any) => p.dataKey === 'actual')?.value;
    const forecastVal = payload.find((p: any) => p.dataKey === 'forecast')?.value;
    const fullLabel = payload[0]?.payload?.fullLabel || label;
    const errorVal = forecastVal !== undefined && actualVal !== undefined && forecastVal !== null && actualVal !== null 
      ? forecastVal - actualVal 
      : null;

    return (
      <div className="bg-navy-900 text-white p-3 rounded-lg shadow-dropdown border border-navy-700 text-xs min-w-[240px]">
        <div className="font-semibold text-navy-200 border-b border-navy-700/80 pb-1.5 mb-2 flex items-center justify-between">
          <span>{fullLabel}</span>
          <span className="text-[10px] uppercase font-mono text-navy-400">UK Grid</span>
        </div>

        <div className="space-y-1.5">
          {actualVal !== undefined && actualVal !== null && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-navy-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#0D9B76]" />
                Actual Generation:
              </span>
              <span className="font-mono font-bold text-white tabular-nums">
                {actualVal.toLocaleString()} MW
              </span>
            </div>
          )}

          {forecastVal !== undefined && forecastVal !== null && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-navy-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#3196E8]" />
                Day-Ahead Forecast:
              </span>
              <span className="font-mono font-bold text-white tabular-nums">
                {forecastVal.toLocaleString()} MW
              </span>
            </div>
          )}

          {errorVal !== null && (
            <div className="pt-1.5 mt-1 border-t border-navy-700/60 flex items-center justify-between text-[11px]">
              <span className="text-navy-400">Forecast Error (F - A):</span>
              <span
                className={`font-mono font-semibold ${
                  errorVal > 0 ? 'text-amber-400' : errorVal < 0 ? 'text-blue-400' : 'text-emerald-400'
                }`}
              >
                {errorVal > 0 ? `+${errorVal.toLocaleString()}` : errorVal.toLocaleString()} MW
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const ActualVsForecastChart: React.FC<ActualVsForecastChartProps> = ({
  data,
  granularity,
  isLoading = false,
  error = null,
  onRetry,
  cutoffTime = '12:00',
}) => {
  const [showActual, setShowActual] = useState(true);
  const [showForecast, setShowForecast] = useState(true);
  const [showErrorArea, setShowErrorArea] = useState(false);

  return (
    <Card className="flex flex-col">
      {/* Header */}
      <CardHeader
        title={
          <div className="flex items-center gap-2">
            <span>Actual vs Day-Ahead Forecast</span>
            <Tooltip
              content="Primary settlement reconciliation curve comparing Elexon B1610 actual generation outturn against B1630 Day-Ahead national wind forecast series."
              width="w-72"
            />
          </div>
        }
        subtitle="National UK generation in Megawatts (MW) across January 2026 settlement periods"
        action={
          <div className="flex items-center gap-3">
            {/* Series toggles */}
            {data.length > 0 && !isLoading && (
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowActual(!showActual)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${
                    showActual
                      ? 'bg-actual-light text-actual-dark border-actual-border font-medium'
                      : 'bg-white text-navy-400 border-[#E2E8F0]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#0D9B76]" />
                  Actual (MW)
                </button>
                <button
                  type="button"
                  onClick={() => setShowForecast(!showForecast)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${
                    showForecast
                      ? 'bg-forecast-light text-forecast-dark border-forecast-border font-medium'
                      : 'bg-white text-navy-400 border-[#E2E8F0]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#3196E8]" />
                  Forecast (MW)
                </button>
                <button
                  type="button"
                  onClick={() => setShowErrorArea(!showErrorArea)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition-colors ${
                    showErrorArea
                      ? 'bg-navy-900 text-white border-navy-900'
                      : 'bg-white text-navy-500 border-[#E2E8F0] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  Delta Area
                </button>
              </div>
            )}

            {isLoading ? (
              <Badge variant="amber" size="sm" dot>
                Fetching series...
              </Badge>
            ) : error ? (
              <Badge variant="warning" size="sm" dot>
                Sync Failed
              </Badge>
            ) : data.length > 0 ? (
              <Badge variant="actual" size="sm" dot>
                Verified BMRS Data
              </Badge>
            ) : (
              <Badge variant="amber" size="sm">
                Awaiting verified data
              </Badge>
            )}
          </div>
        }
      />

      {/* Main Chart Body */}
      <div className="h-[380px] w-full pt-2">
        {isLoading ? (
          /* Loading Skeleton */
          <div className="h-full w-full rounded-lg bg-[#F8FAFC] flex flex-col justify-between p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-4 w-48 bg-[#E2E8F0] rounded" />
              <div className="h-4 w-28 bg-[#E2E8F0] rounded" />
            </div>
            <div className="flex items-end justify-between gap-2 h-48 px-4 opacity-50">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-[#CBD5E1] rounded-t flex-1"
                  style={{ height: `${30 + (i % 6) * 12}%` }}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-navy-400">
              <div className="h-3 w-20 bg-[#E2E8F0] rounded" />
              <div className="h-3 w-20 bg-[#E2E8F0] rounded" />
              <div className="h-3 w-20 bg-[#E2E8F0] rounded" />
            </div>
          </div>
        ) : error ? (
          /* Error State with Retry */
          <div className="h-full w-full border-2 border-dashed border-red-200 rounded-lg bg-red-50/50 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-navy-900 mb-1">
              Unable to load timeseries from backend
            </h4>
            <p className="text-xs text-navy-600 max-w-md mb-4 leading-relaxed">
              {error}
            </p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                className="bg-white border-red-300 text-red-700 hover:bg-red-50"
              >
                Retry Request
              </Button>
            )}
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
            >
              <defs>
                <linearGradient id="errorAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3196E8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3196E8" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E2E8F0"
                vertical={false}
              />

              <XAxis
                dataKey="timestamp"
                stroke="#94A3B8"
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickLine={{ stroke: '#CBD5E1' }}
                interval={granularity === '30m' ? Math.floor(data.length / 12) : 2}
              />

              <YAxis
                stroke="#94A3B8"
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickLine={{ stroke: '#CBD5E1' }}
                tickFormatter={(val) => `${(val / 1000).toFixed(0)}k MW`}
                domain={['auto', 'auto']}
              />

              <RechartsTooltip content={<CustomTooltip />} />

              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 10 }}
                formatter={(value) => {
                  if (value === 'actual') {
                    return <span className="text-xs font-semibold text-[#0D9B76]">Actual Generation (MW)</span>;
                  }
                  if (value === 'forecast') {
                    return <span className="text-xs font-semibold text-[#3196E8]">Day-Ahead Forecast (MW)</span>;
                  }
                  return <span className="text-xs text-navy-500">Error Band</span>;
                }}
              />

              {showErrorArea && (
                <Area
                  type="monotone"
                  dataKey="absError"
                  name="Error Delta"
                  fill="url(#errorAreaGradient)"
                  stroke="#CBD5E1"
                  strokeWidth={1}
                />
              )}

              {showForecast && (
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="forecast"
                  stroke="#3196E8"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: '#3196E8', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              )}

              {showActual && (
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="actual"
                  stroke="#0D9B76"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#0D9B76', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          /* Empty State */
          <div className="h-full w-full border-2 border-dashed border-[#E2E8F0] rounded-lg bg-[#F8FAFC]/70 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-white border border-[#CBD5E1] flex items-center justify-center text-navy-500 shadow-sm mb-4">
              <Database className="w-6 h-6 text-forecast" />
            </div>

            <h4 className="text-sm font-semibold text-navy-900 mb-1">
              Awaiting verified data from Elexon BMRS
            </h4>
            <p className="text-xs text-navy-500 max-w-md mb-4 leading-relaxed">
              No historical settlement period records found for the requested filter criteria.
            </p>

            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Reload Dataset
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Critical Analytical Disclosures */}
      <div className="mt-4 pt-3 border-t border-[#F1F5F9] space-y-2">
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 text-xs text-navy-600 flex flex-col md:flex-row gap-3 items-start">
          <div className="flex items-center gap-1.5 text-navy-800 font-semibold flex-shrink-0">
            <Info className="w-4 h-4 text-forecast flex-shrink-0" />
            <span>Analytical Methodology & Disclosures:</span>
          </div>
          <div className="space-y-1 text-[11px] leading-relaxed text-navy-600">
            <p>
              • <strong className="text-navy-800">Hourly-to-Half-Hourly Resolution:</strong> Elexon WINDFOR forecasts represent hourly average generation ($MWh/h = MW$). Each 30-minute settlement period (e.g. SP 1 and SP 2) is mapped to its parent delivery hour via <code className="font-mono text-navy-700 bg-white px-1 py-0.2 rounded border border-[#CBD5E1]">floor(&apos;h&apos;)</code>. Duplicated forecast values reflect ESO forecast model granularity and are not independent half-hourly predictions.
            </p>
            <p>
              • <strong className="text-navy-800">Balancing Scope Boundary:</strong> This dashboard evaluates pure wind generation forecasting accuracy ($Forecast - Actual$). Total electricity demand and thermal generation outturn are outside this scope; therefore, this wind variance does not calculate total net system procurement.
            </p>
            <p>
              • <strong className="text-navy-800">Day-Ahead Decision Cutoff:</strong> All forecasts shown were published before the day-ahead cutoff of <strong className="text-navy-800">{cutoffTime} UTC (D-1)</strong>, adhering to market auction constraints.
            </p>
          </div>
        </div>

        {/* Footer Legend summary */}
        <div className="flex flex-wrap items-center justify-between text-xs text-navy-500 pt-1">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#0D9B76] inline-block rounded" />
              <span className="font-medium text-navy-700">Actual Outturn (BMRS FUELHH Wind)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#3196E8] inline-block rounded" />
              <span className="font-medium text-navy-700">Day-Ahead Forecast (BMRS WINDFOR)</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-navy-400">
            <Clock className="w-3 h-3" />
            <span>Cutoff: D-1 {cutoffTime} UTC</span>
            <span className="text-navy-300">•</span>
            <Calendar className="w-3 h-3" />
            <span>Jan 1–31, 2026</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

