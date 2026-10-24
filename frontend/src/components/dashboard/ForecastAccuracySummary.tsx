import React from 'react';
import { Card, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import type { AccuracyDistribution } from '../../types/wind';
import { BarChart3 } from 'lucide-react';

interface ForecastAccuracySummaryProps {
  distribution: AccuracyDistribution[];
  isLoading?: boolean;
}

export const ForecastAccuracySummary: React.FC<ForecastAccuracySummaryProps> = ({
  distribution,
  isLoading = false,
}) => {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader
        title={
          <div className="flex items-center gap-2">
            <span>Forecast Accuracy Summary</span>
            <Tooltip
              content="Error distribution and bias breakdown across national wind generation output bands for January 2026."
              width="w-72"
            />
          </div>
        }
        subtitle="Accuracy segmentation by national wind generation capacity tier"
        action={
          isLoading ? (
            <Badge variant="amber" size="sm" dot>
              Loading bands...
            </Badge>
          ) : distribution.length > 0 ? (
            <Badge variant="neutral" size="sm">
              {distribution.length} Bands Analyzed
            </Badge>
          ) : (
            <Badge variant="amber" size="sm">
              Awaiting data
            </Badge>
          )
        }
      />

      <div className="flex-1 flex flex-col justify-between">
        {isLoading ? (
          <div className="space-y-4 p-2 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-28 bg-[#E2E8F0] rounded" />
                  <div className="h-4 w-36 bg-[#E2E8F0] rounded" />
                </div>
                <div className="h-2 w-full bg-[#E2E8F0] rounded-full" />
                <div className="flex justify-between">
                  <div className="h-3 w-20 bg-[#E2E8F0] rounded" />
                  <div className="h-3 w-16 bg-[#E2E8F0] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : distribution.length > 0 ? (
          <div className="space-y-3.5">
            {distribution.map((dist) => (
              <div key={dist.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-navy-800">{dist.category}</span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-navy-500">
                      MAE: <strong className="text-navy-800">{dist.maeMw !== null && dist.maeMw !== undefined ? `${Math.round(dist.maeMw).toLocaleString()} MW` : '—'}</strong>
                    </span>
                    <span className="text-navy-300">•</span>
                    <span
                      className={`font-medium ${
                        (dist.meanErrorMw || 0) > 0 ? 'text-amber-600' : (dist.meanErrorMw || 0) < 0 ? 'text-blue-600' : 'text-navy-600'
                      }`}
                    >
                      Bias: {dist.meanErrorMw !== null && dist.meanErrorMw !== undefined ? `${dist.meanErrorMw > 0 ? `+${Math.round(dist.meanErrorMw).toLocaleString()}` : Math.round(dist.meanErrorMw).toLocaleString()} MW` : '—'}
                    </span>
                  </div>
                </div>

                {/* Progress bar representing frequency */}
                <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-forecast rounded-full transition-all duration-500"
                    style={{ width: `${dist.frequencyPercent || 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-navy-400">
                  <span>{dist.periodCount} Settlement Periods</span>
                  <span>{dist.frequencyPercent !== null && dist.frequencyPercent !== undefined ? `${dist.frequencyPercent.toFixed(1)}% of month` : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 px-4 text-center border border-dashed border-[#E2E8F0] rounded-lg bg-[#F8FAFC]/50 flex flex-col items-center justify-center my-auto">
            <BarChart3 className="w-8 h-8 text-navy-300 mb-2" />
            <p className="text-xs font-semibold text-navy-800">
              Awaiting verified error distribution
            </p>
            <p className="text-[11px] text-navy-500 max-w-xs mt-1">
              Accuracy bands (&lt;5GW, 5-10GW, 10-15GW, &gt;15GW) will populate once settlement outturn is matched.
            </p>
          </div>
        )}

        {/* Bottom context indicator */}
        <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-navy-400">
          <span>High wind bands exhibit elevated ramp error</span>
          <span className="font-medium text-forecast">BMRS FUELHH vs WINDFOR</span>
        </div>
      </div>
    </Card>
  );
};
