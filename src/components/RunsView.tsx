import React, { useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  AlertTriangle,
  Play,
  Eye,
  Plus,
} from 'lucide-react';
import { Run, RunStatus, Agent } from '../types/domain';

interface RunsViewProps {
  runs: Run[];
  agents: Agent[];
  onSelectRun: (run: Run) => void;
  onOpenNewRun: () => void;
  onCancelRun: (runId: string) => void;
  onResumeRun: (runId: string) => void;
}

export const RunsView: React.FC<RunsViewProps> = ({
  runs,
  agents,
  onSelectRun,
  onOpenNewRun,
  onCancelRun,
  onResumeRun,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredRuns = runs.filter((run) => {
    if (statusFilter !== 'ALL' && run.status !== statusFilter) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const idMatch = run.id.toLowerCase().includes(term);
      const skuMatch = run.input?.sku?.toLowerCase().includes(term);
      return idMatch || skuMatch;
    }
    return true;
  });

  const getStatusBadge = (status: RunStatus) => {
    switch (status) {
      case RunStatus.COMPLETED:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case RunStatus.RUNNING:
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 animate-pulse';
      case RunStatus.WAITING_FOR_APPROVAL:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
      case RunStatus.FAILED:
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case RunStatus.CANCELLED:
        return 'bg-slate-800 text-slate-400 border-slate-700';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', RunStatus.RUNNING, RunStatus.WAITING_FOR_APPROVAL, RunStatus.QUEUED, RunStatus.COMPLETED, RunStatus.FAILED].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st === 'ALL' ? 'All Runs' : st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by Run ID or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-52 sm:w-64"
            />
          </div>

          <button
            onClick={onOpenNewRun}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Run</span>
          </button>
        </div>
      </div>

      {/* Runs Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Run Identifier</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Target SKU / Input</th>
                <th className="py-3 px-4">Started At</th>
                <th className="py-3 px-4">Result Summary</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No runs matched the selected filters.
                  </td>
                </tr>
              ) : (
                filteredRuns.map((run) => (
                  <tr
                    key={run.id}
                    className="hover:bg-slate-800/40 transition cursor-pointer group"
                    onClick={() => onSelectRun(run)}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="text-indigo-400">{run.id}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans">
                        Ver: {run.agent_version_id}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadge(run.status)}`}>
                        {run.status === RunStatus.WAITING_FOR_APPROVAL && (
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                        )}
                        <span>{run.status}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-300 font-mono">
                        {run.input?.sku || 'N/A'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {run.input?.quantity ? `${run.input.quantity} units &middot; $${Number(run.input.amount || 0).toLocaleString()}` : run.input?.restock_urgency || 'Standard'}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {run.started_at ? new Date(run.started_at).toLocaleTimeString() : 'In Queue'}
                    </td>

                    <td className="py-3 px-4 max-w-xs truncate text-slate-400">
                      {run.output ? (
                        <span className="text-emerald-400 truncate block">
                          {run.output.summary || JSON.stringify(run.output)}
                        </span>
                      ) : run.failure_reason ? (
                        <span className="text-rose-400 truncate block">
                          {run.failure_reason}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Processing pipeline...</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectRun(run)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                          title="Inspect Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {(run.status === RunStatus.RUNNING || run.status === RunStatus.QUEUED) && (
                          <button
                            onClick={() => onCancelRun(run.id)}
                            className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 text-[11px] transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}

                        {(run.status === RunStatus.FAILED || run.status === RunStatus.CANCELLED) && (
                          <button
                            onClick={() => onResumeRun(run.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-500/30 text-[11px] transition cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
