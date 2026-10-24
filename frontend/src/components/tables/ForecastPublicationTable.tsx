import React, { useState } from 'react';
import { Card, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import type { ForecastPublicationRun } from '../../types/wind';
import { Clock, History, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

interface ForecastPublicationTableProps {
  publications: ForecastPublicationRun[];
  isLoading?: boolean;
  pageSize?: number;
}

export const ForecastPublicationTable: React.FC<ForecastPublicationTableProps> = ({
  publications,
  isLoading = false,
  pageSize = 10,
}) => {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(publications.length / pageSize));
  const currentPageItems = publications.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader
        title={
          <div className="flex items-center gap-2">
            <span>Forecast Publication History</span>
            <Tooltip
              content="Audit trail of Elexon BMRS WINDFOR publication runs received at gate closures prior to delivery."
              width="w-64"
            />
          </div>
        }
        subtitle="National Grid ESO / BMRS gate closure versions & delivery runs"
        action={
          isLoading ? (
            <Badge variant="amber" size="sm" dot>
              Loading runs...
            </Badge>
          ) : publications.length > 0 ? (
            <Badge variant="neutral" size="sm">
              {publications.length} Runs Recorded
            </Badge>
          ) : (
            <Badge variant="amber" size="sm">
              Awaiting data
            </Badge>
          )
        }
      />

      <div className="flex-1 overflow-x-auto">
        {isLoading ? (
          <div className="p-4 space-y-3 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#F1F5F9]">
                <div className="h-4 w-32 bg-[#E2E8F0] rounded" />
                <div className="h-4 w-20 bg-[#E2E8F0] rounded" />
                <div className="h-4 w-24 bg-[#E2E8F0] rounded" />
                <div className="h-4 w-12 bg-[#E2E8F0] rounded" />
              </div>
            ))}
          </div>
        ) : publications.length > 0 ? (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-navy-400 uppercase tracking-wider font-semibold text-[11px] bg-[#F8FAFC]/80">
                <th className="py-2.5 px-3">Publication Type</th>
                <th className="py-2.5 px-3">Target Delivery</th>
                <th className="py-2.5 px-3">Gate Closure UTC</th>
                <th className="py-2.5 px-3">Horizon</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] font-medium text-navy-700">
              {currentPageItems.map((pub) => (
                <tr key={pub.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-navy-900 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-forecast" />
                    <span>{pub.publicationType}</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">{pub.targetDeliveryDate}</td>
                  <td className="py-2.5 px-3 font-mono text-navy-500">{pub.publishedAt}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono px-1.5 py-0.5 rounded bg-[#F1F5F9] text-navy-600 border border-[#E2E8F0] text-[10px]">
                      {pub.recordsCount} hrs
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-navy-500">{pub.source}</td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {pub.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-10 px-4 text-center border border-dashed border-[#E2E8F0] rounded-lg bg-[#F8FAFC]/50 flex flex-col items-center justify-center">
            <Clock className="w-8 h-8 text-navy-300 mb-2" />
            <p className="text-xs font-semibold text-navy-800">
              Awaiting publication logs
            </p>
            <p className="text-[11px] text-navy-500 max-w-xs mt-1">
              No historical BMRS publication gate closures synced for January 2026.
            </p>
          </div>
        )}
      </div>

      {publications.length > pageSize && (
        <div className="mt-2 pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-navy-500 px-3">
          <span>
            Showing {(page - 1) * pageSize + 1} – {Math.min(page * pageSize, publications.length)} of {publications.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1 rounded border border-[#CBD5E1] text-navy-600 hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px]">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1 rounded border border-[#CBD5E1] text-navy-600 hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-navy-400">
        <span>Gate closures: Day-Ahead 12:00 UTC & Intraday</span>
        <span className="font-mono">BMRS WINDFOR</span>
      </div>
    </Card>
  );
};
