import React, { useState } from 'react';
import {
  FileText,
  Filter,
  Search,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { EventRecord, EventType } from '../types/domain';

interface EventAuditViewProps {
  events: EventRecord[];
}

export const EventAuditView: React.FC<EventAuditViewProps> = ({ events }) => {
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredEvents = events.filter((ev) => {
    if (selectedType !== 'ALL' && ev.event_type !== selectedType) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const idMatch = ev.id.toLowerCase().includes(term);
      const runMatch = ev.run_id?.toLowerCase().includes(term);
      const payloadMatch = JSON.stringify(ev.payload).toLowerCase().includes(term);
      return idMatch || runMatch || payloadMatch;
    }
    return true;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `aegis-audit-events-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getEventBadge = (type: EventType) => {
    if (type.startsWith('run.failed') || type.startsWith('step.failed')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    }
    if (type.startsWith('approval')) {
      return 'bg-amber-500/10 text-amber-300 border-amber-500/30 font-bold';
    }
    if (type.startsWith('checkpoint')) {
      return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
    }
    if (type.startsWith('run.completed')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-semibold';
    }
    return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <span>Event Bus Audit Trail & Stream</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable append-only event stream (PostgreSQL audit table + Redis PubSub broadcast).
          </p>
        </div>

        <button
          onClick={handleExportJson}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
        >
          <Download className="w-4 h-4 text-indigo-400" />
          <span>Export JSON Trace</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
          <span className="text-xs text-slate-400 font-semibold uppercase">Filter:</span>
          {['ALL', EventType.RUN_CREATED, EventType.RUN_STARTED, EventType.APPROVAL_REQUESTED, EventType.CHECKPOINT_CREATED, EventType.RUN_COMPLETED].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-2.5 py-1 rounded text-xs transition cursor-pointer whitespace-nowrap ${
                selectedType === type
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {type === 'ALL' ? 'All Types' : type}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search payload or IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-52 sm:w-64"
          />
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-2">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
            No events found matching current criteria.
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const isExpanded = expandedId === ev.id;
            return (
              <div
                key={ev.id}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 transition hover:border-slate-700 text-xs space-y-2"
              >
                <div
                  className="flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}

                    <span className={`px-2 py-0.5 rounded font-mono text-[11px] border ${getEventBadge(ev.event_type)}`}>
                      {ev.event_type}
                    </span>

                    {ev.run_id && (
                      <span className="font-mono text-slate-400 text-[11px] hidden sm:inline">
                        Run: <span className="text-slate-300">{ev.run_id}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                    <span className="font-mono">{ev.id}</span>
                    <span>{new Date(ev.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2 mt-2">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Event Payload JSON</span>
                      <button
                        onClick={() => handleCopy(ev.id, JSON.stringify(ev.payload, null, 2))}
                        className="flex items-center gap-1 hover:text-white"
                      >
                        {copiedId === ev.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === ev.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className="p-2 rounded bg-slate-900 font-mono text-[11px] text-slate-300 overflow-x-auto">
                      {JSON.stringify(ev.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
