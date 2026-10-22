import React, { useState } from 'react';
import {
  Cpu,
  Plus,
  GitBranch,
  Shield,
  Layers,
  Settings,
  Sparkles,
  CheckCircle2,
  FileCode,
} from 'lucide-react';
import { Agent, AgentVersion, ToolRiskLevel } from '../types/domain';
import { toolRegistry } from '../engine/toolExecutor';

interface AgentsViewProps {
  agents: Agent[];
  versions: AgentVersion[];
  onCreateAgent: (name: string, description: string) => void;
  onCreateVersion: (agentId: string, versionData: Partial<AgentVersion>) => void;
  onTriggerRunForAgent: (agentId: string) => void;
}

export const AgentsView: React.FC<AgentsViewProps> = ({
  agents,
  versions,
  onCreateAgent,
  onCreateVersion,
  onTriggerRunForAgent,
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || '');
  const [showNewAgentModal, setShowNewAgentModal] = useState(false);
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);

  // New Agent Form State
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentDesc, setNewAgentDesc] = useState('');

  // New Version Form State
  const [model, setModel] = useState('gemini-1.5-pro');
  const [temperature, setTemperature] = useState(0.2);
  const [systemInstructions, setSystemInstructions] = useState(
    'You are an autonomous supply chain agent. Inspect out-of-stock SKUs and request purchase orders when needed.'
  );
  const [selectedTools, setSelectedTools] = useState<string[]>([
    'get_inventory',
    'create_purchase_order',
    'send_slack_alert',
  ]);
  const [maxRiskLevel, setMaxRiskLevel] = useState<ToolRiskLevel>(ToolRiskLevel.HIGH);
  const [approvalThreshold, setApprovalThreshold] = useState(1000);
  const [requireAllApprovals, setRequireAllApprovals] = useState(false);
  const [tokenBudget, setTokenBudget] = useState(4096);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];
  const agentVersions = versions
    .filter((v) => v.agent_id === selectedAgent?.id)
    .sort((a, b) => b.version - a.version);

  const allAvailableTools = toolRegistry.listTools();

  const handleToolToggle = (toolName: string) => {
    if (selectedTools.includes(toolName)) {
      setSelectedTools(selectedTools.filter((t) => t !== toolName));
    } else {
      setSelectedTools([...selectedTools, toolName]);
    }
  };

  const handleCreateAgentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName) return;
    onCreateAgent(newAgentName, newAgentDesc);
    setNewAgentName('');
    setNewAgentDesc('');
    setShowNewAgentModal(false);
  };

  const handleCreateVersionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;
    onCreateVersion(selectedAgent.id, {
      model_config_data: {
        provider: 'google',
        model,
        temperature,
      },
      system_instructions: systemInstructions,
      tool_bindings: selectedTools,
      policies: {
        max_risk_level: maxRiskLevel,
        require_approval_over_amount: approvalThreshold,
        require_all_approvals: requireAllApprovals,
      },
      context_strategy: {
        token_budget: tokenBudget,
      },
    });
    setShowNewVersionModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <span>Agent Definitions & Published Versions</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Agents contain immutable version snapshots specifying model parameters, policy boundaries, and tool bindings.
          </p>
        </div>

        <button
          onClick={() => setShowNewAgentModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Agent</span>
        </button>
      </div>

      {/* Main Grid: Left Agents List, Right Version Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Agents List */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">
            Registered Agents ({agents.length})
          </span>

          <div className="space-y-2">
            {agents.map((agent) => {
              const isSelected = agent.id === selectedAgent?.id;
              const vers = versions.filter((v) => v.agent_id === agent.id);
              return (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/30'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-white">{agent.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                      {vers.length} Ver
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{agent.description}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                    <span className="font-mono text-indigo-400">{agent.id}</span>
                    <span className="text-slate-400">Active: v{vers.find((v) => v.id === agent.active_version_id)?.version || 1}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Version History & Config */}
        <div className="lg:col-span-2 space-y-4">
          {selectedAgent && (
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{selectedAgent.name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Active Version ID: {selectedAgent.active_version_id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{selectedAgent.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowNewVersionModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Publish Version</span>
                  </button>
                  <button
                    onClick={() => onTriggerRunForAgent(selectedAgent.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition cursor-pointer shadow-sm"
                  >
                    <span>Launch Run</span>
                  </button>
                </div>
              </div>

              {/* Version History List */}
              <div className="space-y-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">
                  Version History & Policies ({agentVersions.length})
                </span>

                <div className="space-y-3">
                  {agentVersions.map((ver) => {
                    const isActive = ver.id === selectedAgent.active_version_id;
                    return (
                      <div
                        key={ver.id}
                        className={`p-4 rounded-xl border text-xs space-y-3 ${
                          isActive
                            ? 'bg-slate-950/80 border-indigo-500/40 ring-1 ring-indigo-500/20'
                            : 'bg-slate-950/40 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-600/20 text-indigo-300 font-mono font-bold text-xs border border-indigo-500/30">
                              Version {ver.version}
                            </span>
                            {isActive && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>ACTIVE</span>
                              </span>
                            )}
                            <span className="text-slate-500 font-mono text-[11px]">{ver.id}</span>
                          </div>
                          <span className="text-slate-500 text-[11px]">
                            {new Date(ver.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Model Config & System Prompt */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 font-semibold block text-[10px] uppercase mb-1">
                              Model Configuration
                            </span>
                            <div className="space-y-0.5 text-slate-300">
                              <div>Model: <code className="text-indigo-300">{ver.model_config_data.model}</code></div>
                              <div>Provider: <span className="text-slate-400">{ver.model_config_data.provider}</span></div>
                              <div>Temperature: <span className="text-slate-400">{ver.model_config_data.temperature}</span></div>
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 font-semibold block text-[10px] uppercase mb-1">
                              Enforced Security Policies
                            </span>
                            <div className="space-y-0.5 text-slate-300">
                              <div>Max Risk Level: <span className="text-amber-400 font-semibold">{ver.policies.max_risk_level}</span></div>
                              <div>Approval Threshold: <span className="text-emerald-400">${Number(ver.policies.require_approval_over_amount || 0).toLocaleString()}</span></div>
                              <div>Token Budget: <span className="text-slate-400">{ver.context_strategy.token_budget} tokens</span></div>
                            </div>
                          </div>
                        </div>

                        {/* Tool Bindings */}
                        <div>
                          <span className="text-slate-500 text-[11px] font-semibold block mb-1">Authorized Tool Bindings:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {ver.tool_bindings.map((tb) => (
                              <span
                                key={tb}
                                className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]"
                              >
                                {tb}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* System Instructions Preview */}
                        <div>
                          <span className="text-slate-500 text-[11px] font-semibold block mb-1">System Instructions:</span>
                          <p className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-slate-400 italic font-mono text-[11px]">
                            "{ver.system_instructions}"
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Agent Modal */}
      {showNewAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-white">Create New Enterprise Agent</h3>
            <form onSubmit={handleCreateAgentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Agent Name</label>
                <input
                  type="text"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="e.g. Vendor Risk Assessor"
                  className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Description</label>
                <textarea
                  value={newAgentDesc}
                  onChange={(e) => setNewAgentDesc(e.target.value)}
                  placeholder="Describe the agent's workflow objectives..."
                  className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewAgentModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer"
                >
                  Create Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Version Modal */}
      {showNewVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-white">Publish New Agent Version</h3>
            <form onSubmit={handleCreateVersionSubmit} className="space-y-3 text-xs max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Model</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  >
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Temperature ({temperature})</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full mt-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">System Instructions</label>
                <textarea
                  value={systemInstructions}
                  onChange={(e) => setSystemInstructions(e.target.value)}
                  className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Tool Bindings</label>
                <div className="space-y-1.5 p-2 rounded bg-slate-950 border border-slate-800">
                  {allAvailableTools.map((tool) => (
                    <label key={tool.name} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTools.includes(tool.name)}
                        onChange={() => handleToolToggle(tool.name)}
                        className="rounded bg-slate-900 text-indigo-600"
                      />
                      <span className="font-mono text-slate-300">{tool.name}</span>
                      <span className="text-slate-500 text-[10px]">({tool.risk_level})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Max Risk Level</label>
                  <select
                    value={maxRiskLevel}
                    onChange={(e) => setMaxRiskLevel(e.target.value as ToolRiskLevel)}
                    className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  >
                    <option value={ToolRiskLevel.LOW}>LOW</option>
                    <option value={ToolRiskLevel.MEDIUM}>MEDIUM</option>
                    <option value={ToolRiskLevel.HIGH}>HIGH</option>
                    <option value={ToolRiskLevel.CRITICAL}>CRITICAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Approval Threshold ($)</label>
                  <input
                    type="number"
                    value={approvalThreshold}
                    onChange={(e) => setApprovalThreshold(Number(e.target.value))}
                    className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewVersionModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer"
                >
                  Publish Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
