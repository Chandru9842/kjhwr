import React from 'react';
import { 
  Filter, 
  Calendar, 
  Search, 
  X, 
  Zap
} from 'lucide-react';
import type { DateFilterRange, GranularityResolution } from '../../types/wind';

interface FilterToolbarProps {
  dateRange: DateFilterRange;
  onSelectDateRange: (range: DateFilterRange) => void;
  granularity: GranularityResolution;
  onSelectGranularity: (res: GranularityResolution) => void;
  biasFilter: 'all' | 'over' | 'under';
  onSelectBiasFilter: (bias: 'all' | 'over' | 'under') => void;
  showPeakOnly: boolean;
  onTogglePeakOnly: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearFilters: () => void;
  showingCount: number;
  totalCount: number;
  disabled?: boolean;
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  dateRange,
  onSelectDateRange,
  granularity,
  onSelectGranularity,
  biasFilter,
  onSelectBiasFilter,
  showPeakOnly,
  onTogglePeakOnly,
  searchQuery,
  onSearchChange,
  onClearFilters,
  showingCount,
  totalCount,
  disabled = false,
}) => {
  const datePresets: DateFilterRange[] = [
    { startDate: '2026-01-01', endDate: '2026-01-31', label: 'All Jan 2026' },
    { startDate: '2026-01-01', endDate: '2026-01-07', label: 'Week 1 (Jan 1–7)' },
    { startDate: '2026-01-08', endDate: '2026-01-14', label: 'Week 2 (Jan 8–14)' },
    { startDate: '2026-01-15', endDate: '2026-01-21', label: 'Week 3 (Jan 15–21)' },
    { startDate: '2026-01-22', endDate: '2026-01-31', label: 'Week 4 (Jan 22–31)' },
    { startDate: '2026-01-24', endDate: '2026-01-26', label: 'Storm Event (Jan 24–26)' },
  ];

  const hasActiveFilters = 
    dateRange.startDate !== '2026-01-01' || 
    dateRange.endDate !== '2026-01-31' || 
    biasFilter !== 'all' || 
    showPeakOnly || 
    searchQuery.trim().length > 0;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-card flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-navy-800 pr-2 border-r border-[#E2E8F0]">
            <Filter className="w-3.5 h-3.5 text-navy-500" />
            <span>Filters</span>
          </div>

          {/* Date Presets Dropdown */}
          <div className="relative inline-block text-left">
            <select
              value={datePresets.findIndex(p => p.startDate === dateRange.startDate && p.endDate === dateRange.endDate)}
              onChange={(e) => {
                const idx = Number(e.target.value);
                if (datePresets[idx]) onSelectDateRange(datePresets[idx]);
              }}
              disabled={disabled}
              className="appearance-none bg-[#F8FAFC] border border-[#CBD5E1] text-navy-800 text-xs font-medium rounded-lg px-3 py-1.5 pr-8 hover:border-navy-400 focus:outline-none focus:ring-1 focus:ring-forecast cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {datePresets.map((preset, idx) => (
                <option key={preset.label} value={idx}>
                  {preset.label}
                </option>
              ))}
            </select>
            <Calendar className="w-3.5 h-3.5 text-navy-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Resolution / Granularity Toggle */}
          <div className="flex items-center p-0.5 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0]">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelectGranularity('30m')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                granularity === '30m'
                  ? 'bg-white text-navy-900 shadow-sm font-semibold'
                  : 'text-navy-500 hover:text-navy-800'
              }`}
              title="Standard UK half-hour settlement periods"
            >
              30m SP
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelectGranularity('1h')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                granularity === '1h'
                  ? 'bg-white text-navy-900 shadow-sm font-semibold'
                  : 'text-navy-500 hover:text-navy-800'
              }`}
              title="1-hour aggregated averages"
            >
              1h Hourly
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelectGranularity('daily')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                granularity === 'daily'
                  ? 'bg-white text-navy-900 shadow-sm font-semibold'
                  : 'text-navy-500 hover:text-navy-800'
              }`}
              title="Daily summary averages"
            >
              Daily
            </button>
          </div>

          {/* Bias Filter Dropdown */}
          <select
            value={biasFilter}
            disabled={disabled}
            onChange={(e) => onSelectBiasFilter(e.target.value as 'all' | 'over' | 'under')}
            className="appearance-none bg-[#F8FAFC] border border-[#CBD5E1] text-navy-800 text-xs font-medium rounded-lg px-3 py-1.5 pr-7 hover:border-navy-400 focus:outline-none focus:ring-1 focus:ring-forecast cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="all">All Bias Directions</option>
            <option value="over">Over-forecast (F &gt; A)</option>
            <option value="under">Under-forecast (F &lt; A)</option>
          </select>

          {/* Peak Hours Toggle */}
          <button
            type="button"
            disabled={disabled}
            onClick={onTogglePeakOnly}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              showPeakOnly
                ? 'bg-amber-50 text-amber-800 border-amber-300 font-semibold'
                : 'bg-[#F8FAFC] text-navy-600 border-[#CBD5E1] hover:bg-[#F1F5F9]'
            }`}
            title="Filter to UK electricity peak hours (07:00 to 19:00 SP 15–38)"
          >
            <Zap className={`w-3.5 h-3.5 ${showPeakOnly ? 'text-amber-600' : 'text-navy-400'}`} />
            <span>Peak SP Only (07–19h)</span>
          </button>
        </div>

        {/* Right Search & Clear Filters */}
        <div className="flex items-center gap-3">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-navy-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search SP (e.g. SP 24, 12:00)..."
              value={searchQuery}
              disabled={disabled}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-navy-900 placeholder:text-navy-400 focus:outline-none focus:bg-white focus:border-navy-500 w-48 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Clear Filters Action */}
          {hasActiveFilters && (
            <button
              type="button"
              disabled={disabled}
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-navy-500 hover:text-navy-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {/* Showing Count Indicator */}
          <span className="text-xs text-navy-400 font-mono hidden sm:inline-block">
            {totalCount > 0 ? (
              <>Showing <strong className="text-navy-700">{showingCount.toLocaleString()}</strong> of {totalCount.toLocaleString()} SPs</>
            ) : (
              <span>0 SPs Loaded</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
