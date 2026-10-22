import React, { useState } from 'react';
import {
  Wrench,
  ShieldCheck,
  RotateCcw,
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCode,
  Sliders,
} from 'lucide-react';
import { ToolDefinition, ToolRiskLevel } from '../types/domain';
import { toolRegistry } from '../engine/toolExecutor';
import { AuthorizationEngine } from '../engine/policyEngine';
import { RetryPolicy } from '../engine/retryPolicy';

export const ToolsPolicyView: React.FC = () => {
  const [tools, setTools] = useState<ToolDefinition[]>(toolRegistry.listTools());

  // Policy Simulator State
  const [evalToolName, setEvalToolName] = useState('create_purchase_order');
  const [evalRiskLevel, setEvalRiskLevel] = useState<ToolRiskLevel>(ToolRiskLevel.HIGH);
  const [evalBindings, setEvalBindings] = useState('get_inventory, create_purchase_order, send_slack_alert');
  const [evalMaxRisk, setEvalMaxRisk] = useState<ToolRiskLevel>(ToolRiskLevel.HIGH);
  const [evalRequireAll, setEvalRequireAll] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);

  // Retry Simulator State
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [baseDelay, setBaseDelay] = useState(1.0);
  const [maxDelay, setMaxDelay] = useState(30.0);
  const [jitter, setJitter] = useState(true);
  const [retryAttempt, setRetryAttempt] = useState(3);
  const [isTransient, setIsTransient] = useState(true);

  // New Tool Form State
  const [showAddTool, setShowAddTool] = useState(false);
  const [newToolName, setNewToolName] = useState('');
  const [newToolDesc, setNewToolDesc] = useState('');
  const [newToolRisk, setNewToolRisk] = useState<ToolRiskLevel>(ToolRiskLevel.LOW);
  const [newToolRequiresApproval, setNewToolRequiresApproval] = useState(false);

  const handleEvaluatePolicy = () => {
    const bindings = evalBindings.split(',').map((s) => s.trim()).filter(Boolean);
    const policies = {
      max_risk_level: evalMaxRisk,
      require_all_approvals: evalRequireAll,
    };
    const res = AuthorizationEngine.evaluateToolPermission(
      evalToolName,
      evalRiskLevel,
      bindings,
      policies
    );
    setEvalResult(res);
  };

  const handleAddToolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newToolName) return;
    const toolDef: ToolDefinition = {
      id: `tool-${Date.now().toString(36)}`,
      name: newToolName,
      version: '1.0.0',
      description: newToolDesc || 'Custom enterprise sandbox tool',
      input_schema: { type: 'object', properties: { payload: { type: 'string' } } },
      output_schema: { type: 'object', properties: { status: { type: 'string' } } },
      risk_level: newToolRisk,
      requires_approval: newToolRequiresApproval,
      timeout_seconds: 25,
    };
    toolRegistry.registerTool(toolDef);
    setTools(toolRegistry.listTools());
    setShowAddTool(false);
    setNewToolName('');
    setNewToolDesc('');
  };

  const retryPolicyInstance = new RetryPolicy(maxAttempts, baseDelay, maxDelay, jitter);
  const calculatedDelay = retryPolicyInstance.calculateDelay(retryAttempt);
  const shouldRetryDecision = retryPolicyInstance.shouldRetry(retryAttempt, isTransient);

  const getRiskBadge = (level: ToolRiskLevel) => {
    switch (level) {
      case ToolRiskLevel.LOW:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case ToolRiskLevel.MEDIUM:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case ToolRiskLevel.HIGH:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold';
      case ToolRiskLevel.CRITICAL:
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40 font-bold animate-pulse';
    }
  };

  return (
    <div className="space-y-6">
      {/* Tool Registry Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-indigo-400" />
            <span>Tool Registry & Policy Sandboxes</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Registered execution primitives with risk classification, JSON schemas, and authorization engines.
          </p>
        </div>

        <button
          onClick={() => setShowAddTool(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Register Tool</span>
        </button>
      </div>

      {/* Tools Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-indigo-300 text-sm">{tool.name}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] border ${getRiskBadge(tool.risk_level)}`}>
                  {tool.risk_level}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{tool.description}</p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/80 text-[11px]">
              <div className="flex items-center justify-between text-slate-400">
                <span>Requires Approval:</span>
                <span className={tool.requires_approval ? 'text-amber-400 font-semibold' : 'text-slate-500'}>
                  {tool.requires_approval ? 'Yes (Mandatory)' : 'No (Automated)'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Timeout Limit:</span>
                <span className="font-mono text-slate-300">{tool.timeout_seconds}s</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Schema Validation:</span>
                <span className="text-emerald-400 font-mono">Strict JSON-Schema</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Policy Engine Sandbox & Retry Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        {/* Policy Simulator */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Policy Authorization Engine</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">AuthorizationEngine</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Target Tool</label>
                <select
                  value={evalToolName}
                  onChange={(e) => setEvalToolName(e.target.value)}
                  className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                >
                  {tools.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                  <option value="unregistered_tool">unregistered_tool (Unbound test)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Tool Risk Level</label>
                <select
                  value={evalRiskLevel}
                  onChange={(e) => setEvalRiskLevel(e.target.value as ToolRiskLevel)}
                  className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                >
                  <option value={ToolRiskLevel.LOW}>LOW</option>
                  <option value={ToolRiskLevel.MEDIUM}>MEDIUM</option>
                  <option value={ToolRiskLevel.HIGH}>HIGH</option>
                  <option value={ToolRiskLevel.CRITICAL}>CRITICAL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Agent Tool Bindings (comma separated)</label>
              <input
                type="text"
                value={evalBindings}
                onChange={(e) => setEvalBindings(e.target.value)}
                className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Policy Max Risk Level</label>
                <select
                  value={evalMaxRisk}
                  onChange={(e) => setEvalMaxRisk(e.target.value as ToolRiskLevel)}
                  className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                >
                  <option value={ToolRiskLevel.LOW}>LOW</option>
                  <option value={ToolRiskLevel.MEDIUM}>MEDIUM</option>
                  <option value={ToolRiskLevel.HIGH}>HIGH</option>
                  <option value={ToolRiskLevel.CRITICAL}>CRITICAL</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={evalRequireAll}
                    onChange={(e) => setEvalRequireAll(e.target.checked)}
                    className="rounded bg-slate-900 text-indigo-600"
                  />
                  <span>Require All Approvals</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleEvaluatePolicy}
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition cursor-pointer shadow-sm"
            >
              Evaluate Policy Decision
            </button>

            {/* Decision Result */}
            {evalResult && (
              <div
                className={`p-3.5 rounded-xl border space-y-1.5 ${
                  !evalResult.allowed
                    ? 'bg-rose-950/30 border-rose-500/40'
                    : evalResult.requires_approval
                    ? 'bg-amber-950/30 border-amber-500/40'
                    : 'bg-emerald-950/30 border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    {evalResult.allowed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span className={evalResult.allowed ? 'text-emerald-300' : 'text-rose-300'}>
                      {evalResult.allowed ? 'ALLOWED' : 'DENIED / BLOCKED'}
                    </span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-300">
                    Approval Gate: {evalResult.requires_approval ? 'YES (MANDATORY)' : 'NO'}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px]">{evalResult.reason}</p>
              </div>
            )}
          </div>
        </div>

        {/* Retry Engine Simulator */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Retry Policy Engine (Exponential Backoff & Full Jitter)</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">RetryPolicy</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-300 mb-1">Max Attempts</label>
                <input
                  type="number"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number(e.target.value))}
                  className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                  min={1}
                  max={10}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Base Delay (s)</label>
                <input
                  type="number"
                  value={baseDelay}
                  onChange={(e) => setBaseDelay(Number(e.target.value))}
                  className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                  step="0.5"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Max Delay (s)</label>
                <input
                  type="number"
                  value={maxDelay}
                  onChange={(e) => setMaxDelay(Number(e.target.value))}
                  className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Test Attempt #</label>
                <input
                  type="number"
                  value={retryAttempt}
                  onChange={(e) => setRetryAttempt(Number(e.target.value))}
                  className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                  min={0}
                  max={10}
                />
              </div>

              <div className="flex items-center gap-4 pt-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={jitter}
                    onChange={(e) => setJitter(e.target.checked)}
                    className="rounded bg-slate-900 text-indigo-600"
                  />
                  <span>Full Jitter</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={isTransient}
                    onChange={(e) => setIsTransient(e.target.checked)}
                    className="rounded bg-slate-900 text-indigo-600"
                  />
                  <span>Transient Error</span>
                </label>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Calculated Delay for Attempt {retryAttempt}:</span>
                <span className="font-mono font-bold text-indigo-400 text-sm">
                  {calculatedDelay.toFixed(3)}s
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Should Retry Trigger:</span>
                <span
                  className={`font-mono font-bold ${
                    shouldRetryDecision ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {shouldRetryDecision ? 'TRUE (Retry Allowed)' : 'FALSE (Abort / Escalate)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                Formula: <code className="text-slate-400 font-mono">min(maxDelay, baseDelay * 2^(attempt-1)) * (jitter ? random() : 1)</code>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Register Tool Modal */}
      {showAddTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-white">Register New Sandbox Tool</h3>
            <form onSubmit={handleAddToolSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Tool Identifier</label>
                <input
                  type="text"
                  value={newToolName}
                  onChange={(e) => setNewToolName(e.target.value)}
                  placeholder="e.g. query_external_pricing"
                  className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Description</label>
                <textarea
                  value={newToolDesc}
                  onChange={(e) => setNewToolDesc(e.target.value)}
                  placeholder="What does this tool execute?"
                  className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Risk Level</label>
                  <select
                    value={newToolRisk}
                    onChange={(e) => setNewToolRisk(e.target.value as ToolRiskLevel)}
                    className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  >
                    <option value={ToolRiskLevel.LOW}>LOW</option>
                    <option value={ToolRiskLevel.MEDIUM}>MEDIUM</option>
                    <option value={ToolRiskLevel.HIGH}>HIGH</option>
                    <option value={ToolRiskLevel.CRITICAL}>CRITICAL</option>
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={newToolRequiresApproval}
                      onChange={(e) => setNewToolRequiresApproval(e.target.checked)}
                      className="rounded bg-slate-900 text-indigo-600"
                    />
                    <span>Requires Approval</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTool(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
