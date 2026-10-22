import React, { useState } from 'react';
import { X, Play, Sparkles, Layers, Cpu } from 'lucide-react';
import { Agent, AgentVersion } from '../types/domain';

interface NewRunModalProps {
  agents: Agent[];
  versions: AgentVersion[];
  onClose: () => void;
  onSubmit: (agentId: string, inputPayload: Record<string, any>, versionId?: string) => void;
}

export const NewRunModal: React.FC<NewRunModalProps> = ({
  agents,
  versions,
  onClose,
  onSubmit,
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id || '');
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [sku, setSku] = useState('SKU-4812');
  const [quantity, setQuantity] = useState('500');
  const [amount, setAmount] = useState('4500');
  const [urgency, setUrgency] = useState('high');
  const [notes, setNotes] = useState('Automated supply chain replenishment investigation');

  const filteredVersions = versions.filter((v) => v.agent_id === selectedAgentId);

  const handleApplyPreset = (presetSku: string, presetQty: string, presetAmount: string) => {
    setSku(presetSku);
    setQuantity(presetQty);
    setAmount(presetAmount);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      sku,
      quantity: Number(quantity),
      amount: Number(amount),
      urgency,
      notes,
    };
    onSubmit(selectedAgentId, payload, selectedVersionId || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Play className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Trigger Agent Run</h2>
              <p className="text-xs text-slate-400">Submit workflow execution request to the Aegis runtime</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Quick Presets */}
          <div>
            <span className="text-slate-400 font-medium">Quick Test Scenarios:</span>
            <div className="flex flex-wrap gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => handleApplyPreset('SKU-1020', '50', '450')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer text-[11px]"
              >
                Auto-Approval ($450)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('SKU-4812', '500', '4500')}
                className="px-2.5 py-1 rounded bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-500/30 transition cursor-pointer text-[11px]"
              >
                Approval Gate ($4,500)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('SKU-9900', '2500', '28000')}
                className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 transition cursor-pointer text-[11px]"
              >
                Critical Restock ($28k)
              </button>
            </div>
          </div>

          {/* Agent Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Target Agent</label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Version</label>
              <select
                value={selectedVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Latest Published (Default)</option>
                {filteredVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.version} ({v.model_config_data.model})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Input Parameters */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block">
              Workflow Parameters
            </span>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Product SKU</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-200 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-200 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Est. Amount ($)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-200 font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Priority Urgency</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-200"
                >
                  <option value="low">Standard / Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Audit Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Policy Notice */}
          <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20 text-slate-400 text-[11px] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              If estimated amount exceeds $1,000.00, the runtime will pause at Step 2 and await human operator sign-off before issuing the purchase order.
            </span>
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition cursor-pointer shadow-md shadow-indigo-600/20"
            >
              Launch Run Pipeline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
