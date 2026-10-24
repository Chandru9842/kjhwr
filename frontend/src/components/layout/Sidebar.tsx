import React from 'react';
import { 
  Wind, 
  LayoutDashboard, 
  Target, 
  History, 
  ShieldCheck, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Database,
  ExternalLink
} from 'lucide-react';
import type { NavigationTab } from '../../types/wind';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  connectionStatus?: 'connected' | 'awaiting_data' | 'syncing' | 'error';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  connectionStatus = 'syncing',
}) => {
  const navItems: Array<{
    id: NavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'forecast-accuracy', label: 'Forecast Accuracy', icon: Target },
    { id: 'forecast-history', label: 'Forecast History', icon: History },
    { id: 'data-quality', label: 'Data Quality', icon: ShieldCheck, badge: 'BMRS' },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`relative flex flex-col bg-white border-r border-[#E2E8F0] transition-all duration-300 ease-in-out z-30 select-none ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-[#F1F5F9] justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-actual to-forecast flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Wind className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold tracking-tight text-navy-900 truncate flex items-center gap-1.5">
                UK Wind Intel
                <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-actual-light text-actual-dark border border-actual-border">
                  PRO
                </span>
              </span>
              <span className="text-[11px] text-navy-400 font-medium truncate">
                National Grid ESO / BMRS
              </span>
            </div>
          )}
        </div>

        {/* Collapse button on expanded */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-navy-400 hover:text-navy-700 hover:bg-[#F1F5F9] transition-colors"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Group */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-2 mb-2">
          {!isCollapsed ? (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-400">
              Trading Analytics
            </p>
          ) : (
            <div className="h-2" />
          )}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              data-testid={`nav-${item.id}`}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group relative ${
                isActive
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'text-navy-600 hover:text-navy-900 hover:bg-[#F8FAFC]'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  isActive ? 'text-actual' : 'text-navy-400 group-hover:text-navy-600'
                }`}
              />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1 truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-navy-800 text-actual'
                          : 'bg-[#F1F5F9] text-navy-500'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-actual rounded-r" />
              )}
            </button>
          );
        })}
      </div>

      {/* Collapse button on collapsed */}
      {isCollapsed && (
        <div className="p-3 border-t border-[#F1F5F9] flex justify-center">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md text-navy-400 hover:text-navy-700 hover:bg-[#F1F5F9] transition-colors"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bottom Status Panel */}
      <div className="p-3 border-t border-[#F1F5F9] bg-[#F8FAFC]/60">
        {!isCollapsed ? (
          <div className="rounded-lg p-3 bg-white border border-[#E2E8F0] shadow-card">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-navy-800">
                <Database className="w-3.5 h-3.5 text-actual" />
                Data Ingestion
              </span>
              <span className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500 ring-2 ring-emerald-100'
                  : connectionStatus === 'error'
                  ? 'bg-red-500 ring-2 ring-red-100'
                  : 'bg-amber-400 ring-2 ring-amber-100 animate-pulse'
              }`} />
            </div>
            <p className="text-[11px] text-navy-500 leading-snug">
              Settlement Stream: <span className="font-medium text-navy-700">Jan 2026</span>
            </p>
            <div className="mt-2.5 pt-2 border-t border-[#F1F5F9] flex items-center justify-between">
              <span className="text-[10px] font-medium text-navy-400">
                {connectionStatus === 'connected' ? 'BMRS Ingestion Active' : connectionStatus === 'error' ? 'Connection Error' : 'Syncing BMRS...'}
              </span>
              <a
                href="https://bmrs.elexon.co.uk"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-forecast hover:underline inline-flex items-center gap-0.5"
              >
                Portal <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title={`Elexon Ingestion: ${connectionStatus}`}>
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-emerald-500 ring-4 ring-emerald-50'
                : connectionStatus === 'error'
                ? 'bg-red-500 ring-4 ring-red-50'
                : 'bg-amber-400 ring-4 ring-amber-50 animate-pulse'
            }`} />
          </div>
        )}
      </div>
    </aside>
  );
};
