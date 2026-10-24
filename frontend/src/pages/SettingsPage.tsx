import React, { useState } from 'react';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  Settings, 
  Key, 
  Server, 
  Check 
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('********************************');
  const [endpoint, setEndpoint] = useState('http://localhost:8000/api/v1/wind');
  const [maeThreshold, setMaeThreshold] = useState('500');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 shadow-card flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-navy-50 border border-navy-200 flex items-center justify-center text-navy-700 flex-shrink-0">
          <Settings className="w-4 h-4 text-navy-800" />
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-navy-800">
            System & API Connector Configuration
          </h2>
          <p className="text-xs text-navy-500">
            Configure future Elexon BMRS ingestion endpoint, NWP model settings, and trading warning alerts.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader
            title="Elexon BMRS & National Grid ESO Connector"
            subtitle="API credentials for national wind generation data feeds"
          />
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-navy-800 mb-1">
                Elexon BMRS API Key (Scripting Key)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-2 text-navy-800 font-mono text-xs focus:outline-none focus:border-navy-600 focus:bg-white"
                  placeholder="Enter Elexon 32-character API key..."
                />
                <Key className="w-4 h-4 text-navy-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-[11px] text-navy-400 mt-1">
                Obtained from the Elexon BMRS portal profile under API Scripting Key.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-navy-800 mb-1">
                Backend Service URL
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-2 text-navy-800 font-mono text-xs focus:outline-none focus:border-navy-600 focus:bg-white"
                />
                <Server className="w-4 h-4 text-navy-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-[11px] text-navy-400 mt-1">
                Target Python / FastAPI service endpoint for settlement analytics processing.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Trading Risk & Error Thresholds"
            subtitle="Define alert triggers for severe forecast misses"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-navy-800 mb-1">
                MAE Warning Threshold (MW)
              </label>
              <input
                type="number"
                value={maeThreshold}
                onChange={(e) => setMaeThreshold(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-2 text-navy-800 font-mono text-xs focus:outline-none focus:border-navy-600 focus:bg-white"
              />
              <p className="text-[11px] text-navy-400 mt-1">
                Triggers visual alert when daily MAE exceeds this capacity band.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-navy-800 mb-1">
                Historical Dataset Lock
              </label>
              <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-navy-600 font-mono text-xs">
                January 1, 2026 – January 31, 2026 (Locked)
              </div>
              <p className="text-[11px] text-navy-400 mt-1">
                Fixed trading analysis backtesting window.
              </p>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <Button
            type="submit"
            variant="primary"
            leftIcon={isSaved ? <Check className="w-4 h-4 text-emerald-400" /> : undefined}
          >
            {isSaved ? 'Settings Saved' : 'Save Configuration'}
          </Button>

          {isSaved && (
            <span className="text-xs font-semibold text-emerald-700">
              Configuration successfully updated.
            </span>
          )}
        </div>
      </form>
    </div>
  );
};
