import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  ExternalLink,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { Approval, ApprovalStatus, ToolRiskLevel } from '../types/domain';

interface ApprovalsViewProps {
  approvals: Approval[];
  onApprove: (approvalId: string, decisionBy: string) => void;
  onReject: (approvalId: string, decisionBy: string, reason: string) => void;
  onInspectRun: (runId: string) => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  approvals,
  onApprove,
  onReject,
  onInspectRun,
}) => {
  const [operatorName, setOperatorName] = useState('SecOps Lead / arslanrehmani');
  const [rejectReason, setRejectReason] = useState('Vendor pricing exceeds quarterly budget allocation');
  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);

  const pendingApprovals = approvals.filter((a) => a.status === ApprovalStatus.PENDING);
  const decidedApprovals = approvals.filter((a) => a.status !== ApprovalStatus.PENDING);

  const handleRejectConfirm = (id: string) => {
    onReject(id, operatorName, rejectReason);
    setActiveRejectId(null);
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">Human-in-the-Loop Governance Inbox</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              When an agent requests execution of tools classified as <span className="text-amber-300 font-semibold">HIGH</span> or <span className="text-rose-400 font-semibold">CRITICAL</span> risk, the Aegis runtime halts execution and preserves the state machine until an authorized operator issues a decision.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Acting Operator:</span>
            <input
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200 text-xs w-48 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Pending Approvals Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <h3 className="text-sm font-semibold text-white">Pending Requests Awaiting Operator Decision</h3>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-bold border border-amber-500/30">
            {pendingApprovals.length} Pending
          </span>
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="text-sm font-medium text-slate-300">Governance Queue Clear</div>
            <p className="text-xs text-slate-500">
              All high-risk agent tool invocations have been evaluated and approved/rejected.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingApprovals.map((approval) => (
              <div
                key={approval.id}
                className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-amber-500/30 shadow-lg space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold">
                      {approval.requested_action.risk_level || ToolRiskLevel.HIGH} RISK
                    </span>
                    <span className="font-mono text-sm font-bold text-white">
                      Tool: <span className="text-amber-400">{approval.requested_action.tool}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Requested: {new Date(approval.created_at).toLocaleTimeString()}</span>
                    <button
                      onClick={() => onInspectRun(approval.run_id)}
                      className="ml-2 text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono"
                    >
                      <span>{approval.run_id}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Reason & Payload */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="md:col-span-2 space-y-2">
                    <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-amber-200">
                      <div className="font-semibold text-amber-300 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Policy Trigger</span>
                      </div>
                      <p>{approval.requested_action.rule_triggered || 'Policy threshold exceeded.'}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-semibold uppercase text-[10px]">Action Parameters</span>
                      <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-slate-300 overflow-x-auto">
                        {JSON.stringify(approval.requested_action.args, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Operator Decision Actions */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-2">
                        Operator Authorization
                      </span>
                      <p className="text-slate-400 text-[11px]">
                        Approving will immediately transition the state machine to <code className="text-emerald-400 font-mono">QUEUED</code> and execute the pending tool call with idempotency guarantees.
                      </p>
                    </div>

                    {activeRejectId === approval.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="State reason for rejection..."
                          className="w-full p-2 rounded bg-slate-900 border border-rose-500/40 text-rose-200 text-xs focus:outline-none"
                          rows={2}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRejectConfirm(approval.id)}
                            className="flex-1 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition cursor-pointer"
                          >
                            Confirm Rejection
                          </button>
                          <button
                            onClick={() => setActiveRejectId(null)}
                            className="px-2.5 py-1.5 rounded bg-slate-800 text-slate-400 hover:text-white text-xs transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          onClick={() => onApprove(approval.id, operatorName)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer shadow-md shadow-emerald-600/20 active:scale-98"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Authorize Step Execution</span>
                        </button>
                        <button
                          onClick={() => setActiveRejectId(approval.id)}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 text-slate-300 font-medium text-xs border border-slate-700 transition cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject Invocation</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decided Approvals History */}
      {decidedApprovals.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300">Historical Decisions Audit Log</h3>
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-2.5 px-4">Run / Tool</th>
                  <th className="py-2.5 px-4">Decision</th>
                  <th className="py-2.5 px-4">Decided By</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {decidedApprovals.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-4 font-mono">
                      <span className="text-slate-300 font-semibold">{d.requested_action.tool}</span>
                      <div className="text-[10px] text-slate-500">{d.run_id}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          d.status === ApprovalStatus.APPROVED
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {d.status === ApprovalStatus.APPROVED ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{d.status}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 font-medium">
                      {d.decision_by || 'Operator'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {d.decided_at ? new Date(d.decided_at).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
