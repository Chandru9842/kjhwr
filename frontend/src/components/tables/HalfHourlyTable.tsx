import React, { useState, useMemo } from 'react';
import { Card, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import type { SettlementPeriodRecord } from '../../types/wind';
import { 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  FileSpreadsheet
} from 'lucide-react';

interface HalfHourlyTableProps {
  records: SettlementPeriodRecord[];
  isLoading?: boolean;
}

export const HalfHourlyTable: React.FC<HalfHourlyTableProps> = ({
  records,
  isLoading = false,
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [sortField, setSortField] = useState<keyof SettlementPeriodRecord>('settlementPeriod');
  const [sortAsc, setSortAsc] = useState(true);

  // Sorting
  const sortedRecords = useMemo(() => {
    if (records.length === 0) return [];
    return [...records].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [records, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const currentPageRecords = sortedRecords.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (field: keyof SettlementPeriodRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // CSV Export utility for traders
  const handleExportCsv = () => {
    if (records.length === 0) return;

    const headers = ['SettlementDate', 'SettlementPeriod', 'DeliveryTime', 'ForecastMW', 'ActualMW', 'ErrorMW', 'ErrorPercent', 'BiasDirection'];
    const rows = records.map(r => [
      r.settlementDate,
      r.settlementPeriod,
      `"${r.deliveryTime}"`,
      r.forecastMw ?? '',
      r.actualMw ?? '',
      r.errorMw ?? '',
      r.errorPercent ?? '',
      r.biasDirection
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `UK_Wind_Settlement_Jan_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="flex flex-col">
      <CardHeader
        title={
          <div className="flex items-center gap-2">
            <span>Half-Hourly Generation & Settlement Reconciliation</span>
            <Tooltip
              content="Detailed settlement period audit table (48 half-hour intervals per day) comparing Day-Ahead published forecast against National Grid outturn."
              width="w-72"
            />
          </div>
        }
        subtitle="Delivery period breakdown, absolute variance, and directional bias (MW)"
        action={
          <div className="flex items-center gap-2">
            {records.length > 0 && !isLoading && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                leftIcon={<Download className="w-3.5 h-3.5 text-navy-600" />}
                className="font-medium"
              >
                Export CSV
              </Button>
            )}

            {isLoading ? (
              <Badge variant="amber" size="sm" dot>
                Loading SPs...
              </Badge>
            ) : records.length > 0 ? (
              <Badge variant="forecast" size="sm">
                {records.length.toLocaleString()} SPs Verified
              </Badge>
            ) : (
              <Badge variant="amber" size="sm">
                Awaiting verified data
              </Badge>
            )}
          </div>
        }
      />

      <div className="overflow-x-auto">
        {records.length > 0 ? (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-navy-500 uppercase tracking-wider font-semibold text-[11px] bg-[#F8FAFC]">
                <th 
                  className="py-3 px-3 cursor-pointer hover:text-navy-900 select-none"
                  onClick={() => handleSort('settlementDate')}
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-navy-400" />
                  </div>
                </th>
                <th 
                  className="py-3 px-3 cursor-pointer hover:text-navy-900 select-none"
                  onClick={() => handleSort('settlementPeriod')}
                >
                  <div className="flex items-center gap-1">
                    <span>SP</span>
                    <ArrowUpDown className="w-3 h-3 text-navy-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Delivery Window</th>
                <th 
                  className="py-3 px-3 text-right cursor-pointer hover:text-navy-900 select-none"
                  onClick={() => handleSort('forecastMw')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-[#3196E8]">Day-Ahead Forecast</span>
                    <ArrowUpDown className="w-3 h-3 text-navy-400" />
                  </div>
                </th>
                <th 
                  className="py-3 px-3 text-right cursor-pointer hover:text-navy-900 select-none"
                  onClick={() => handleSort('actualMw')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-[#0D9B76]">Actual Generation</span>
                    <ArrowUpDown className="w-3 h-3 text-navy-400" />
                  </div>
                </th>
                <th 
                  className="py-3 px-3 text-right cursor-pointer hover:text-navy-900 select-none"
                  onClick={() => handleSort('errorMw')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Error (MW)</span>
                    <ArrowUpDown className="w-3 h-3 text-navy-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">Error %</th>
                <th className="py-3 px-3 text-center">Bias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] font-medium text-navy-800">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3 px-3"><div className="h-4 w-20 bg-[#E2E8F0] rounded" /></td>
                    <td className="py-3 px-3"><div className="h-4 w-12 bg-[#E2E8F0] rounded" /></td>
                    <td className="py-3 px-3"><div className="h-4 w-24 bg-[#E2E8F0] rounded" /></td>
                    <td className="py-3 px-3 text-right"><div className="h-4 w-20 bg-[#E2E8F0] rounded ml-auto" /></td>
                    <td className="py-3 px-3 text-right"><div className="h-4 w-20 bg-[#E2E8F0] rounded ml-auto" /></td>
                    <td className="py-3 px-3 text-right"><div className="h-4 w-16 bg-[#E2E8F0] rounded ml-auto" /></td>
                    <td className="py-3 px-3 text-right"><div className="h-4 w-12 bg-[#E2E8F0] rounded ml-auto" /></td>
                    <td className="py-3 px-3 text-center"><div className="h-4 w-14 bg-[#E2E8F0] rounded mx-auto" /></td>
                  </tr>
                ))
              ) : (
                currentPageRecords.map((r) => {
                  const isOver = (r.errorMw || 0) > 0;
                  const isUnder = (r.errorMw || 0) < 0;

                  return (
                    <tr key={r.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-3 font-mono text-navy-600">
                        {r.settlementDate}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 font-mono font-semibold px-1.5 py-0.5 rounded bg-[#F1F5F9] text-navy-700">
                          SP {r.settlementPeriod}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-navy-600 font-mono text-[11px]">
                        {r.deliveryTime}
                        {r.isPeakPeriod && (
                          <span className="ml-1.5 text-[9px] uppercase font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                            Peak
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#3196E8] tabular-nums">
                        {r.forecastMw !== null ? `${r.forecastMw.toLocaleString()} MW` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0D9B76] tabular-nums">
                        {r.actualMw !== null ? `${r.actualMw.toLocaleString()} MW` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {r.errorMw !== null ? (
                          <span
                            className={`font-semibold ${
                              isOver ? 'text-amber-600' : isUnder ? 'text-blue-600' : 'text-navy-600'
                            }`}
                          >
                            {isOver ? `+${r.errorMw.toLocaleString()}` : r.errorMw.toLocaleString()} MW
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-navy-500 tabular-nums">
                        {r.errorPercent !== null ? `${r.errorPercent.toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {r.biasDirection === 'over' && (
                          <Badge variant="amber" size="sm">
                            Over +
                          </Badge>
                        )}
                        {r.biasDirection === 'under' && (
                          <Badge variant="forecast" size="sm">
                            Under -
                          </Badge>
                        )}
                        {r.biasDirection === 'exact' && (
                          <Badge variant="actual" size="sm">
                            Exact
                          </Badge>
                        )}
                        {r.biasDirection === 'unmatched' && (
                          <Badge variant="neutral" size="sm">
                            Unmatched
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          <div className="py-12 px-4 text-center border-2 border-dashed border-[#E2E8F0] rounded-lg bg-[#F8FAFC]/50 flex flex-col items-center justify-center m-2">
            <FileSpreadsheet className="w-10 h-10 text-navy-300 mb-3" />
            <h4 className="text-sm font-semibold text-navy-800">
              No settlement records found
            </h4>
            <p className="text-xs text-navy-500 max-w-md mt-1 leading-relaxed">
              No records match your active filter criteria. Try clearing search or adjusting the date range.
            </p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {records.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between text-xs text-navy-500 gap-3">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="bg-[#F8FAFC] border border-[#CBD5E1] rounded px-2 py-1 text-xs text-navy-700 focus:outline-none"
            >
              <option value={12}>12 rows</option>
              <option value={24}>24 rows (Half-Day)</option>
              <option value={48}>48 rows (Full Day)</option>
            </select>
            <span className="text-navy-300">|</span>
            <span>
              Showing <strong className="text-navy-800">{(page - 1) * pageSize + 1}</strong> –{' '}
              <strong className="text-navy-800">{Math.min(page * pageSize, records.length)}</strong> of{' '}
              {records.length} records
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1.5 rounded border border-[#CBD5E1] text-navy-600 hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono text-xs">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1.5 rounded border border-[#CBD5E1] text-navy-600 hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};
