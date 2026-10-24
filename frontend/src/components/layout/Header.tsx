import React from 'react';
import { 
  RefreshCw, 
  Calendar, 
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import type { NavigationTab, DataConnectionState } from '../../types/wind';

interface HeaderProps {
  currentTab: NavigationTab;
  onRefresh: () => void;
  isRefreshing: boolean;
  isLoading: boolean;
  lastUpdated: Date;
  lastSuccessfulSync: Date | null;
  cutoffTime: string;
  onSelectCutoffTime: (time: string) => void;
  connectionState: DataConnectionState;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onRefresh,
  isRefreshing,
  isLoading,
  lastSuccessfulSync,
  cutoffTime,
  onSelectCutoffTime,
  connectionState,
}) => {
  const getTabTitle = () => {
    switch (currentTab) {
      case 'forecast-accuracy':
        return {
          title: 'Forecast Accuracy Analysis',
          subtitle: 'Statistical evaluation of Day-Ahead MAE, RMSE, and error variance',
        };
      case 'forecast-history':
        return {
          title: 'Forecast Publication History',
          subtitle: 'Gate closure versions, intraday updates, and outturn reconciliations',
        };
      case 'data-quality':
        return {
          title: 'Data Quality & Ingestion Status',
          subtitle: 'Elexon BMRS FUELHH & WINDFOR settlement period health & diagnostics',
        };
      case 'settings':
        return {
          title: 'Platform Settings & API Keys',
          subtitle: 'Manage Elexon BMRS connector, NWP forecast models, and thresholds',
        };
      case 'overview':
      default:
        return {
          title: 'Wind Generation Overview',
          subtitle: 'National UK wind generation analysis & settlement comparison',
        };
    }
  };

  const { title, subtitle } = getTabTitle();

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0] px-6 py-4 shadow-[0_1px_2px_0_rgba(15,23,42,0.03)]">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Title & Subtitle */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-navy-900 tracking-tight">
              {title}
            </h1>
            <Badge variant="outline" size="sm" className="bg-[#F8FAFC] font-semibold text-navy-700">
              National UK Grid
            </Badge>
          </div>
          <p className="text-xs text-navy-500 mt-1 flex items-center gap-2">
            <span>{subtitle}</span>
            <span className="text-navy-300">•</span>
            <span className="font-medium text-navy-600">BMRS FUELHH (WIND) vs WINDFOR</span>
          </p>
        </div>

        {/* Right: Controls & Status */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Historical Period Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-navy-500" />
            <div className="text-left">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-navy-400 block leading-tight">
                Analysis Period
              </span>
              <span className="text-xs font-semibold text-navy-900 leading-tight">
                Jan 1–31, 2026
              </span>
            </div>
            <Tooltip
              content="Complete historical baseline covering all 1,488 half-hour settlement periods (SP 1–48 daily) in January 2026."
              width="w-72"
            />
          </div>

          {/* Decision Cutoff Selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg shadow-sm">
            <Clock className="w-3.5 h-3.5 text-forecast" />
            <div className="text-left">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-navy-400 block leading-tight">
                Day-Ahead Cutoff
              </span>
              <select
                value={cutoffTime}
                onChange={(e) => onSelectCutoffTime(e.target.value)}
                disabled={isLoading || isRefreshing}
                className="text-xs font-semibold text-navy-900 bg-transparent focus:outline-none cursor-pointer pr-1"
                aria-label="Day-Ahead Decision Cutoff Time"
              >
                <option value="12:00">12:00 UTC (D-1 Default)</option>
                <option value="11:00">11:00 UTC (Power Auction)</option>
                <option value="17:00">17:00 UTC (Afternoon ESO)</option>
              </select>
            </div>
            <Tooltip
              content="Enforces day-ahead forecast selection: only forecasts published BEFORE this UTC cutoff time on day D-1 are selected for delivery day D."
              width="w-72"
            />
          </div>

          {/* Real Backend Connection Status Badge */}
          <div className="flex items-center">
            {connectionState.status === 'connected' ? (
              <Badge variant="actual" dot className="px-3 py-1.5 text-xs font-medium">
                <Wifi className="w-3 h-3 mr-1 inline" />
                Live API ({connectionState.latencyMs ? `${connectionState.latencyMs}ms` : 'Connected'})
              </Badge>
            ) : connectionState.status === 'syncing' ? (
              <Badge variant="amber" dot className="px-3 py-1.5 text-xs font-medium">
                Syncing BMRS...
              </Badge>
            ) : (
              <Badge variant="warning" dot className="px-3 py-1.5 text-xs font-medium">
                <WifiOff className="w-3 h-3 mr-1 inline" />
                API Disconnected
              </Badge>
            )}
          </div>

          {/* Refresh Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            isLoading={isRefreshing || isLoading}
            disabled={isRefreshing || isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />}
            className="text-navy-700"
          >
            Refresh
          </Button>

          {/* Sync Timestamp indicator */}
          <div className="hidden sm:flex flex-col text-[10px] text-navy-400 font-mono text-right pl-1">
            <span>
              Last Sync: {lastSuccessfulSync ? lastSuccessfulSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Pending'}
            </span>
            <span>Target: Jan 2026</span>
          </div>
        </div>
      </div>
    </header>
  );
};

