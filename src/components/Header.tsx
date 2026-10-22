import React from 'react';
import {
  Shield,
  Activity,
  Layers,
  CheckCircle2,
  Cpu,
  Wrench,
  FileText,
  FlaskConical,
  Plus,
} from 'lucide-react';
import { RuntimeMetrics } from '../types/domain';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  metrics: RuntimeMetrics;
  onOpenNewRun: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  metrics,
  onOpenNewRun,
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard & Architecture', icon: Activity },
    { id: 'runs', label: 'Runs Orchestrator', icon: Layers, badge: metrics.runsStarted },
    {
      id: 'approvals',
      label: 'Human Approvals',
      icon: CheckCircle2,
      badge: metrics.pendingApprovals,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    { id: 'agents', label: 'Agents & Versions', icon: Cpu },
    { id: 'tools', label: 'Tool Registry & Policies', icon: Wrench },
    { id: 'events', label: 'Event Bus & Audit', icon: FileText },
    { id: 'tests', label: 'Test Suite', icon: FlaskConical },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">AEGIS</span>
                <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  Durable AI Runtime
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tenant: <span className="text-slate-200 font-medium">Acme Corp Enterprise</span> &middot; Env: <span className="text-emerald-400 font-medium">production</span>
              </p>
            </div>
          </div>

          {/* Quick Actions & Live Worker Status */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-400">Worker Pool:</span>
              <span className="text-emerald-400 font-mono font-medium">
                {metrics.activeWorkerLeases > 0 ? `${metrics.activeWorkerLeases} Active Lease` : '1 Worker Ready'}
              </span>
            </div>

            <button
              onClick={onOpenNewRun}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-medium text-sm transition-all shadow-md shadow-indigo-600/20 hover:shadow-indigo-500/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Trigger Run</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto py-2 -mb-px border-t border-slate-800/60 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-xs font-mono font-bold border ${
                      tab.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
