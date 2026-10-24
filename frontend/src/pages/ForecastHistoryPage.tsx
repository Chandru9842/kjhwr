import React from 'react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ForecastPublicationTable } from '../components/tables/ForecastPublicationTable';
import { useWindData } from '../hooks/useWindData';
import { History, Clock, FileCheck, AlertTriangle, RefreshCw } from 'lucide-react';

interface ForecastHistoryPageProps {
  dataState: ReturnType<typeof useWindData>;
}

export const ForecastHistoryPage: React.FC<ForecastHistoryPageProps> = ({ dataState }) => {
  const { publications, cutoffTime, isLoading, apiError, handleRetry } = dataState;

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
                {apiError} Unable to fetch publication runs.
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

      <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#EDF6FD] border border-[#B3DCFA] flex items-center justify-center text-forecast flex-shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-navy-800">
              Publication Gate Closure Audit Trail
            </h2>
            <p className="text-xs text-navy-500">
              Complete history of National Grid ESO & BMRS WINDFOR snapshot versions for January 2026.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="forecast" size="sm">
            <Clock className="w-3 h-3 mr-1 inline" />
            Decision Cutoff: D-1 {cutoffTime} UTC
          </Badge>
          <Badge variant="neutral" size="sm">
            <FileCheck className="w-3 h-3 mr-1 inline" />
            {isLoading ? 'Loading...' : `${publications.length} Publication Runs`}
          </Badge>
        </div>
      </div>

      <ForecastPublicationTable
        publications={publications}
        isLoading={isLoading}
        pageSize={15}
      />

      <Card>
        <CardHeader
          title="BMRS Ingestion Protocols & Day-Ahead Cutoff Specification"
          subtitle="Understanding publication frequencies in the Balancing Mechanism"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-navy-700">
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <span className="font-semibold text-navy-900 block mb-1">
              Active Selection Cutoff (D-1 {cutoffTime} UTC)
            </span>
            <p className="text-navy-500 text-[11px] leading-relaxed">
              Enforces strict decision point gate closure. Only forecasts with publishTime &lt;= {cutoffTime} UTC on the day preceding delivery (D-1) are eligible for outturn comparison.
            </p>
          </div>
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <span className="font-semibold text-navy-900 block mb-1">Intraday Rolling Updates</span>
            <p className="text-navy-500 text-[11px] leading-relaxed">
              National Grid ESO issues rolling forecasts up to Gate Closure (1 hour before settlement delivery) capturing short-term frontal progressions.
            </p>
          </div>
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <span className="font-semibold text-navy-900 block mb-1">Elexon BMRS FUELHH Verification</span>
            <p className="text-navy-500 text-[11px] leading-relaxed">
              Final metered actual wind generation outturn aggregated across all British balancing units for financial cashout settlement.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

