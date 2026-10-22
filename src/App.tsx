import React, { useState, useEffect } from 'react';
import { runtimeStore, DEFAULT_AGENT_ID } from './engine/runtimeStore';
import { Run, AgentVersion } from './types/domain';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { RunsView } from './components/RunsView';
import { RunDetailModal } from './components/RunDetailModal';
import { NewRunModal } from './components/NewRunModal';
import { ApprovalsView } from './components/ApprovalsView';
import { AgentsView } from './components/AgentsView';
import { ToolsPolicyView } from './components/ToolsPolicyView';
import { EventAuditView } from './components/EventAuditView';
import { TestSuiteView } from './components/TestSuiteView';

export const App: React.FC = () => {
  const [, setTick] = useState(0);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [showNewRunModal, setShowNewRunModal] = useState<boolean>(false);

  useEffect(() => {
    // Subscribe to runtime store changes
    const unsubscribe = runtimeStore.subscribe(() => {
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  const metrics = runtimeStore.getMetrics();
  const runs = runtimeStore.runs;
  const agents = runtimeStore.agents;
  const agentVersions = runtimeStore.agentVersions;
  const approvals = runtimeStore.approvals;
  const events = runtimeStore.events;
  const activeLeases = runtimeStore.leaseManager.getAllActiveLeases();

  // Find currently selected run for detailed modal
  const selectedRun = selectedRunId ? runs.find((r) => r.id === selectedRunId) : null;
  const runCheckpoints = selectedRun
    ? runtimeStore.checkpoints.filter((c) => c.run_id === selectedRun.id)
    : [];
  const runToolExecutions = selectedRun
    ? runtimeStore.toolExecutions.filter((te) => te.run_id === selectedRun.id)
    : [];
  const runApproval = selectedRun
    ? approvals.find((a) => a.run_id === selectedRun.id)
    : undefined;

  // Actions
  const handleTriggerRun = (
    agentId: string,
    inputPayload: Record<string, any>,
    versionId?: string
  ) => {
    const newRun = runtimeStore.createRun(agentId, inputPayload, versionId);
    setSelectedRunId(newRun.id);
  };

  const handleTriggerScenario = (sku: string, amount: number, label: string) => {
    const newRun = runtimeStore.createRun(DEFAULT_AGENT_ID, {
      sku,
      quantity: Math.floor(amount / 9),
      amount,
      urgency: 'high',
      scenario_label: label,
    });
    setSelectedRunId(newRun.id);
  };

  const handleApproveStep = (approvalId: string, decisionBy: string = 'Security Officer') => {
    runtimeStore.approveStep(approvalId, decisionBy);
  };

  const handleRejectStep = (
    approvalId: string,
    decisionBy: string = 'Security Officer',
    reason?: string
  ) => {
    runtimeStore.rejectStep(approvalId, decisionBy, reason);
  };

  const handleCancelRun = (runId: string) => {
    runtimeStore.cancelRun(runId);
  };

  const handleResumeRun = (runId: string) => {
    runtimeStore.resumeRun(runId);
  };

  const handleCreateAgent = (name: string, description: string) => {
    runtimeStore.createAgent(name, description);
  };

  const handleCreateVersion = (agentId: string, versionData: Partial<AgentVersion>) => {
    runtimeStore.createAgentVersion(agentId, versionData);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        metrics={metrics}
        onOpenNewRun={() => setShowNewRunModal(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            metrics={metrics}
            runs={runs}
            activeLeases={activeLeases}
            onTriggerScenario={handleTriggerScenario}
            onNavigateTab={setCurrentTab}
          />
        )}

        {currentTab === 'runs' && (
          <RunsView
            runs={runs}
            agents={agents}
            onSelectRun={(run) => setSelectedRunId(run.id)}
            onOpenNewRun={() => setShowNewRunModal(true)}
            onCancelRun={handleCancelRun}
            onResumeRun={handleResumeRun}
          />
        )}

        {currentTab === 'approvals' && (
          <ApprovalsView
            approvals={approvals}
            onApprove={handleApproveStep}
            onReject={handleRejectStep}
            onInspectRun={(runId) => {
              setSelectedRunId(runId);
            }}
          />
        )}

        {currentTab === 'agents' && (
          <AgentsView
            agents={agents}
            versions={agentVersions}
            onCreateAgent={handleCreateAgent}
            onCreateVersion={handleCreateVersion}
            onTriggerRunForAgent={(agentId) => {
              setShowNewRunModal(true);
            }}
          />
        )}

        {currentTab === 'tools' && <ToolsPolicyView />}

        {currentTab === 'events' && <EventAuditView events={events} />}

        {currentTab === 'tests' && <TestSuiteView />}
      </main>

      {/* Run Detail Modal */}
      {selectedRun && (
        <RunDetailModal
          run={selectedRun}
          checkpoints={runCheckpoints}
          toolExecutions={runToolExecutions}
          approval={runApproval}
          onClose={() => setSelectedRunId(null)}
          onApprove={(id) => handleApproveStep(id)}
          onReject={(id) => handleRejectStep(id)}
          onCancel={handleCancelRun}
          onResume={handleResumeRun}
        />
      )}

      {/* Trigger New Run Modal */}
      {showNewRunModal && (
        <NewRunModal
          agents={agents}
          versions={agentVersions}
          onClose={() => setShowNewRunModal(false)}
          onSubmit={handleTriggerRun}
        />
      )}
    </div>
  );
};

export default App;
