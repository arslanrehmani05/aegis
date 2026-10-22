import React from 'react';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Cpu,
  ArrowRight,
  Zap,
  Play,
  RotateCcw,
  Sparkles,
  Server,
  Lock,
} from 'lucide-react';
import { Run, RunStatus, RuntimeMetrics, WorkerLease } from '../types/domain';

interface DashboardViewProps {
  metrics: RuntimeMetrics;
  runs: Run[];
  activeLeases: WorkerLease[];
  onTriggerScenario: (sku: string, amount: number, label: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  runs,
  activeLeases,
  onTriggerScenario,
  onNavigateTab,
}) => {
  // Compute runs in each state
  const stateCounts: Record<RunStatus, number> = {
    [RunStatus.QUEUED]: runs.filter((r) => r.status === RunStatus.QUEUED).length,
    [RunStatus.RUNNING]: runs.filter((r) => r.status === RunStatus.RUNNING).length,
    [RunStatus.WAITING_FOR_TOOL]: runs.filter((r) => r.status === RunStatus.WAITING_FOR_TOOL).length,
    [RunStatus.WAITING_FOR_APPROVAL]: runs.filter((r) => r.status === RunStatus.WAITING_FOR_APPROVAL).length,
    [RunStatus.PAUSED]: runs.filter((r) => r.status === RunStatus.PAUSED).length,
    [RunStatus.RETRYING]: runs.filter((r) => r.status === RunStatus.RETRYING).length,
    [RunStatus.COMPLETED]: runs.filter((r) => r.status === RunStatus.COMPLETED).length,
    [RunStatus.FAILED]: runs.filter((r) => r.status === RunStatus.FAILED).length,
    [RunStatus.CANCELLED]: runs.filter((r) => r.status === RunStatus.CANCELLED).length,
    [RunStatus.TIMED_OUT]: runs.filter((r) => r.status === RunStatus.TIMED_OUT).length,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Core Aegis Philosophy */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/20 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Core Aegis Philosophy</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              A language model is not an execution engine.
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Aegis transforms fragile LLM request/response loops into recoverable, stateful, policy-controlled business workflows with distributed worker leases, deterministic idempotency, and automated checkpoint rollbacks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onTriggerScenario('SKU-1020', 450, 'Low-Risk Auto Run')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-medium transition cursor-pointer shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run Auto ($450)</span>
            </button>
            <button
              onClick={() => onTriggerScenario('SKU-4812', 4500, 'High-Risk Gate Run')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-600/90 hover:bg-amber-500 text-white text-xs font-medium transition cursor-pointer shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Test Approval Gate ($4,500)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Runs */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Runs Started</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">{metrics.runsStarted}</span>
            <span className="text-xs text-slate-400">
              ({metrics.runsCompleted} completed &middot; {metrics.runsFailed} failed)
            </span>
          </div>
          <div className="mt-2 text-xs text-indigo-400 flex items-center gap-1 cursor-pointer hover:underline" onClick={() => onNavigateTab('runs')}>
            <span>View all runs</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Pending Approvals */}
        <div
          onClick={() => onNavigateTab('approvals')}
          className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between cursor-pointer transition ${
            metrics.pendingApprovals > 0
              ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400'
              : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-300">Human Approval Gate</span>
            <AlertTriangle className={`w-4 h-4 ${metrics.pendingApprovals > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-300">{metrics.pendingApprovals}</span>
            <span className="text-xs text-slate-400">awaiting decision</span>
          </div>
          <div className="mt-2 text-xs text-amber-400 flex items-center gap-1 font-medium">
            <span>Open Approvals Inbox</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Worker Leases & Queue Depth */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Worker Pool & Leases</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">{metrics.activeWorkerLeases}</span>
            <span className="text-xs text-slate-400">leases &middot; {metrics.queueDepth} queued</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Lease TTL: 30s with heartbeat</span>
          </div>
        </div>

        {/* Checkpoint & Idempotency Engine */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Checkpoints & Cache</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-purple-400">{metrics.checkpointsCreated}</span>
            <span className="text-xs text-slate-400">checkpoints &middot; {metrics.idempotencyCacheHits} executions</span>
          </div>
          <div className="mt-2 text-xs text-purple-400/80 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>SHA-256 side-effect safe</span>
          </div>
        </div>
      </div>

      {/* Finite State Machine Visualizer */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-indigo-400" />
              <span>Aegis Run Finite State Machine (FSM)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Strict formal state transitions enforced by <code className="text-indigo-300">RunStateMachine</code>. Zero unauthorized jumps.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <span>Active Runs in State</span>
          </div>
        </div>

        {/* States Diagram */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
          {/* QUEUED */}
          <div className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
            stateCounts[RunStatus.QUEUED] > 0
              ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/30'
              : 'bg-slate-950/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-blue-400">QUEUED</span>
              <span className={`px-2 py-0.5 text-xs font-mono font-bold rounded-full ${
                stateCounts[RunStatus.QUEUED] > 0 ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'
              }`}>
                {stateCounts[RunStatus.QUEUED]}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Run enqueued in Redis task queue waiting for lease.
            </p>
          </div>

          {/* RUNNING */}
          <div className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
            stateCounts[RunStatus.RUNNING] > 0
              ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/30'
              : 'bg-slate-950/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-indigo-400">RUNNING</span>
              <span className={`px-2 py-0.5 text-xs font-mono font-bold rounded-full ${
                stateCounts[RunStatus.RUNNING] > 0 ? 'bg-indigo-500 text-white animate-pulse' : 'bg-slate-800 text-slate-500'
              }`}>
                {stateCounts[RunStatus.RUNNING]}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Claimed by worker with lease. Steps executing.
            </p>
          </div>

          {/* WAITING_FOR_APPROVAL */}
          <div className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
            stateCounts[RunStatus.WAITING_FOR_APPROVAL] > 0
              ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/30'
              : 'bg-slate-950/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400">APPROVAL GATE</span>
              <span className={`px-2 py-0.5 text-xs font-mono font-bold rounded-full ${
                stateCounts[RunStatus.WAITING_FOR_APPROVAL] > 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-500'
              }`}>
                {stateCounts[RunStatus.WAITING_FOR_APPROVAL]}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Paused at checkpoint pending human authorization.
            </p>
          </div>

          {/* COMPLETED */}
          <div className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
            stateCounts[RunStatus.COMPLETED] > 0
              ? 'bg-emerald-950/40 border-emerald-500/40'
              : 'bg-slate-950/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-400">COMPLETED</span>
              <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {stateCounts[RunStatus.COMPLETED]}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              All workflow steps finished successfully. Output emitted.
            </p>
          </div>

          {/* FAILED */}
          <div className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
            stateCounts[RunStatus.FAILED] > 0
              ? 'bg-rose-950/40 border-rose-500/40'
              : 'bg-slate-950/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-rose-400">FAILED</span>
              <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                {stateCounts[RunStatus.FAILED]}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Rejected by operator or fatal step failure. Replayable.
            </p>
          </div>
        </div>
      </div>

      {/* Active Worker Leases & Architectural Topology */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Worker Leases Table */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Distributed Worker Lease Registry</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Redis Lock Engine</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Ensures single-worker mutual exclusion. Heartbeats extend lease TTL to prevent split-brain execution across distributed workers.
            </p>

            <div className="mt-4 space-y-2">
              {activeLeases.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-xs text-slate-400">
                  No active leases currently held. Worker is listening for jobs on queue.
                </div>
              ) : (
                activeLeases.map((lease) => (
                  <div
                    key={lease.run_id}
                    className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-emerald-400">{lease.run_id}</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px]">
                          HELD
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Worker: <span className="text-slate-300 font-mono">{lease.worker_id}</span> &middot; Heartbeats: <span className="text-indigo-400 font-mono">{lease.heartbeat_count}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-mono text-slate-300">TTL {lease.ttl_seconds}s</div>
                      <div className="text-[10px] text-slate-500">Auto-expires if silent</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Lease Key: <code className="text-indigo-300 font-mono">aegis:lease:run:{'{id}'}</code></span>
            <span className="text-emerald-400">SET key worker EX 30 NX</span>
          </div>
        </div>

        {/* High-Level Architecture Flow */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Aegis Execution Pipeline</h3>
              </div>
              <span className="text-xs text-indigo-400 font-mono">Durable Architecture</span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <div className="font-semibold text-slate-200">Run Submission & Queue</div>
                  <div className="text-slate-400 text-[11px]">API validates agent active version, writes <code className="text-indigo-300">QUEUED</code> to storage, pushes job to Redis.</div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <div className="font-semibold text-slate-200">Worker Lease & State Machine</div>
                  <div className="text-slate-400 text-[11px]">Worker claims distributed lease, triggers state transition to <code className="text-indigo-300">RUNNING</code>.</div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <div className="font-semibold text-slate-200">Policy Gates, Idempotency & Checkpoint</div>
                  <div className="text-slate-400 text-[11px]">Policy engine inspects risk levels; high-risk actions halt for human approval; steps snapshot to checkpoints.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Guaranteed at-least-once execution with idempotency</span>
            <button
              onClick={() => onNavigateTab('tests')}
              className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
            >
              Run Test Suite &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
