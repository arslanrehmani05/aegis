import React, { useState } from 'react';
import {
  X,
  Layers,
  ShieldCheck,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Copy,
  Check,
  AlertTriangle,
  Play,
  FileCode,
} from 'lucide-react';
import {
  Run,
  RunStatus,
  Checkpoint,
  ToolExecution,
  Approval,
  ApprovalStatus,
} from '../types/domain';

interface RunDetailModalProps {
  run: Run;
  checkpoints: Checkpoint[];
  toolExecutions: ToolExecution[];
  approval?: Approval;
  onClose: () => void;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
  onCancel: (runId: string) => void;
  onResume: (runId: string) => void;
}

export const RunDetailModal: React.FC<RunDetailModalProps> = ({
  run,
  checkpoints,
  toolExecutions,
  approval,
  onClose,
  onApprove,
  onReject,
  onCancel,
  onResume,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getStatusBadge = (status: RunStatus) => {
    switch (status) {
      case RunStatus.COMPLETED:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case RunStatus.RUNNING:
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 animate-pulse';
      case RunStatus.WAITING_FOR_APPROVAL:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case RunStatus.FAILED:
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case RunStatus.CANCELLED:
        return 'bg-slate-700 text-slate-300 border-slate-600';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-mono">{run.id}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(run.status)}`}>
                  {run.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Version ID: <span className="font-mono text-slate-300">{run.agent_version_id}</span> &middot; Created: {new Date(run.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Approval Banner if waiting */}
          {run.status === RunStatus.WAITING_FOR_APPROVAL && approval && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Human Operator Decision Required</span>
                </div>
                <p className="text-xs text-slate-200">
                  {approval.requested_action.rule_triggered}
                </p>
                <div className="text-[11px] text-slate-400">
                  Tool: <code className="text-amber-300">{approval.requested_action.tool}</code> &middot;
                  Target: {approval.requested_action.args.sku} ({approval.requested_action.args.quantity} units, ${approval.requested_action.args.amount})
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onApprove(approval.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Authorize & Resume</span>
                </button>
                <button
                  onClick={() => onReject(approval.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white font-medium text-xs transition cursor-pointer shadow-sm"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Step</span>
                </button>
              </div>
            </div>
          )}

          {/* Failure Banner */}
          {run.status === RunStatus.FAILED && (
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-1">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                <XCircle className="w-4 h-4" />
                <span>Run Execution Failed</span>
              </div>
              <p className="text-xs text-rose-200">
                {run.failure_reason || 'Unknown error occurred during step execution.'}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => onResume(run.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Operator Manual Retry (From Checkpoint)</span>
                </button>
              </div>
            </div>
          )}

          {/* Input & Output Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Input Payload</span>
                <FileCode className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 font-mono text-xs text-slate-300 overflow-x-auto max-h-40">
                {JSON.stringify(run.input, null, 2)}
              </pre>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Output Emitted</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
              </div>
              {run.output ? (
                <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 font-mono text-xs text-emerald-300 overflow-x-auto max-h-40">
                  {JSON.stringify(run.output, null, 2)}
                </pre>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 italic">
                  {run.status === RunStatus.RUNNING || run.status === RunStatus.WAITING_FOR_APPROVAL
                    ? 'Execution in progress...'
                    : 'No output generated.'}
                </div>
              )}
            </div>
          </div>

          {/* Checkpoint Engine Snapshots */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <h3 className="font-semibold text-white text-sm">Durable Step Checkpoints</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {checkpoints.length} Snapshots Saved
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Checkpoints provide durability and state recovery. If a worker process crashes, Aegis resumes from the highest completed step.
            </p>

            {checkpoints.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-center text-xs text-slate-500">
                No checkpoints committed yet for this run.
              </div>
            ) : (
              <div className="space-y-2">
                {checkpoints.map((chk) => (
                  <div
                    key={chk.id}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold text-[11px] border border-purple-500/30">
                          Step #{chk.step_number}
                        </span>
                        <span className="font-mono text-slate-400 text-[11px]">{chk.id}</span>
                      </div>
                      <span className="text-slate-500 text-[11px]">
                        {new Date(chk.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <pre className="p-2 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto">
                      {JSON.stringify(chk.state_snapshot, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tool Executions & Idempotency Keys */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-white text-sm">Tool Executions & Idempotency Cache</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Side-Effect Protection
              </span>
            </div>

            {toolExecutions.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-center text-xs text-slate-500">
                No tool executions invoked yet.
              </div>
            ) : (
              <div className="space-y-2">
                {toolExecutions.map((exec) => (
                  <div
                    key={exec.id}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-300 text-xs">{exec.tool_name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono text-[10px]">
                          {exec.status}
                        </span>
                      </div>
                      <span className="text-slate-500 text-[11px]">
                        {new Date(exec.executed_at).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Idempotency key */}
                    <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-slate-500 text-[11px] uppercase font-semibold">Idempotency SHA-256:</span>
                        <code className="text-purple-300 text-[11px] truncate font-mono">
                          {exec.idempotency_key}
                        </code>
                      </div>
                      <button
                        onClick={() => handleCopy(exec.idempotency_key)}
                        className="text-slate-400 hover:text-white transition p-1"
                        title="Copy Key"
                      >
                        {copiedKey === exec.idempotency_key ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Output */}
                    {exec.output && (
                      <pre className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                        {JSON.stringify(exec.output, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
          <div className="text-slate-400">
            Tenant: <span className="text-slate-300">{run.tenant_id}</span>
          </div>

          <div className="flex items-center gap-2">
            {(run.status === RunStatus.RUNNING || run.status === RunStatus.QUEUED) && (
              <button
                onClick={() => onCancel(run.id)}
                className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white font-medium transition cursor-pointer"
              >
                Cancel Run
              </button>
            )}

            {(run.status === RunStatus.FAILED || run.status === RunStatus.CANCELLED) && (
              <button
                onClick={() => onResume(run.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resume / Retry</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
