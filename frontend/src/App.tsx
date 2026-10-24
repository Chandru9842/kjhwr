import { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewPage } from './pages/OverviewPage';
import { ForecastAccuracyPage } from './pages/ForecastAccuracyPage';
import { ForecastHistoryPage } from './pages/ForecastHistoryPage';
import { DataQualityPage } from './pages/DataQualityPage';
import { SettingsPage } from './pages/SettingsPage';
import { useWindData } from './hooks/useWindData';
import type { NavigationTab } from './types/wind';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const dataState = useWindData();

  const renderActivePage = () => {
    switch (currentTab) {
      case 'forecast-accuracy':
        return <ForecastAccuracyPage dataState={dataState} />;
      case 'forecast-history':
        return <ForecastHistoryPage dataState={dataState} />;
      case 'data-quality':
        return <DataQualityPage dataState={dataState} />;
      case 'settings':
        return <SettingsPage />;
      case 'overview':
      default:
        return <OverviewPage dataState={dataState} />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#F5F7FA] overflow-hidden text-navy-900 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        connectionStatus={dataState.connectionState.status}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Bar */}
        <Header
          currentTab={currentTab}
          onRefresh={dataState.handleRefresh}
          isRefreshing={dataState.isRefreshing}
          isLoading={dataState.isLoading}
          lastUpdated={dataState.lastUpdated}
          lastSuccessfulSync={dataState.lastSuccessfulSync}
          cutoffTime={dataState.cutoffTime}
          onSelectCutoffTime={dataState.setCutoffTime}
          connectionState={dataState.connectionState}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-6 py-6 focus:outline-none">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderActivePage()}

            {/* Enterprise Dashboard Footer */}
            <footer className="mt-12 pt-6 pb-8 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between text-xs text-navy-400 gap-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-navy-700">UK Wind Intelligence</span>
                <span>•</span>
                <span>Enterprise Electricity Trading Platform</span>
                <span>•</span>
                <span className="font-mono text-[11px]">v1.0.0-PRO</span>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span>Elexon BMRS B1630 / B1610 Ingestion Ready</span>
                <span>•</span>
                <span>Historical Baseline: Jan 1–31, 2026</span>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
