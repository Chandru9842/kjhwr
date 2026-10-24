import React from 'react';
import { Card } from '../ui/Card';
import { Tooltip } from '../ui/Tooltip';
import { TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';

export interface KpiCardProps {
  title: string;
  value: number | string | null;
  unit: string;
  tooltipText: string;
  formula?: string;
  benchmark?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    text: string;
    isGood?: boolean;
  };
  status?: 'verified' | 'awaiting';
  subtitle?: string;
  isLoading?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  unit,
  tooltipText,
  formula,
  benchmark,
  trend,
  status = 'awaiting',
  subtitle,
  isLoading = false,
}) => {
  const isAwaiting = value === null || value === undefined || status === 'awaiting';

  return (
    <Card className="flex flex-col justify-between hover:border-navy-300 transition-colors relative overflow-hidden">
      {/* Top row: Title and Tooltip */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-navy-500 truncate">
            {title}
          </span>
          <Tooltip
            content={
              <div className="space-y-1.5">
                <p className="font-semibold text-white">{title}</p>
                <p className="text-navy-200">{tooltipText}</p>
                {formula && (
                  <div className="pt-1 border-t border-navy-700/60 font-mono text-[10px] text-forecast-light">
                    Formula: {formula}
                  </div>
                )}
                {benchmark && (
                  <div className="text-[10px] text-navy-300">
                    Trader Benchmark: {benchmark}
                  </div>
                )}
              </div>
            }
            width="w-72"
          />
        </div>

        {/* Value Display */}
        <div className="mt-1 flex items-baseline gap-2">
          {isLoading ? (
            <div className="h-8 w-28 bg-[#E2E8F0] animate-pulse rounded-md" />
          ) : isAwaiting ? (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tracking-tight text-navy-300">
                — —
              </span>
              <span className="text-xs font-medium text-navy-400">{unit}</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tracking-tight text-navy-900 tabular-nums">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </span>
              <span className="text-xs font-medium text-navy-500">{unit}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status / Subtitle / Context */}
      <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
        {isLoading ? (
          <div className="h-4 w-20 bg-[#F1F5F9] animate-pulse rounded" />
        ) : isAwaiting ? (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-amber-500" />
            <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Awaiting verified data
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs">
            {trend && (
              <span
                className={`inline-flex items-center gap-1 font-medium ${
                  trend.isGood
                    ? 'text-actual-dark'
                    : trend.direction === 'neutral'
                    ? 'text-navy-500'
                    : 'text-amber-600'
                }`}
              >
                {trend.direction === 'up' && <TrendingUp className="w-3 h-3" />}
                {trend.direction === 'down' && <TrendingDown className="w-3 h-3" />}
                {trend.direction === 'neutral' && <Minus className="w-3 h-3" />}
                {trend.text}
              </span>
            )}
            {!trend && subtitle && (
              <span className="text-[11px] text-navy-400">{subtitle}</span>
            )}
          </div>
        )}

        <span className="text-[10px] text-navy-400 font-medium">
          Jan 2026
        </span>
      </div>
    </Card>
  );
};
