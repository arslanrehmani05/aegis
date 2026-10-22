import {
  Tenant,
  Project,
  Agent,
  AgentVersion,
  Run,
  Checkpoint,
  Approval,
  ToolExecution,
  EventRecord,
  TenantStatus,
  RunStatus,
  ApprovalStatus,
  ToolRiskLevel,
  ToolExecutionStatus,
  EventType,
  RuntimeMetrics,
} from '../types/domain';
import { RunStateMachine } from './stateMachine';
import { IdempotencyManager } from './idempotency';
import { LeaseManager } from './leaseManager';
import { AuthorizationEngine } from './policyEngine';
import { ToolExecutor, toolRegistry } from './toolExecutor';

// Default Seed Data matching scripts/seed.py
export const DEFAULT_TENANT_ID = 'ten-001-acme';
export const DEFAULT_PROJECT_ID = 'proj-001-supply';
export const DEFAULT_AGENT_ID = 'agent-001-sku-investigator';
export const DEFAULT_VERSION_ID = 'ver-001-v1';

const INITIAL_TENANT: Tenant = {
  id: DEFAULT_TENANT_ID,
  name: 'Acme Corp Enterprise',
  status: TenantStatus.ACTIVE,
  created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
};

const INITIAL_PROJECT: Project = {
  id: DEFAULT_PROJECT_ID,
  tenant_id: DEFAULT_TENANT_ID,
  name: 'Supply Chain Automation',
  description: 'Autonomous inventory replenishment, vendor risk assessment, and purchase order governance',
  created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
};

const INITIAL_AGENT: Agent = {
  id: DEFAULT_AGENT_ID,
  project_id: DEFAULT_PROJECT_ID,
  name: 'SKU Investigator Agent',
  description: 'Investigates out-of-stock SKUs, analyzes warehouse stock levels, and generates purchase orders',
  active_version_id: DEFAULT_VERSION_ID,
};

const INITIAL_VERSION: AgentVersion = {
  id: DEFAULT_VERSION_ID,
  agent_id: DEFAULT_AGENT_ID,
  version: 1,
  model_config_data: {
    provider: 'google',
    model: 'gemini-1.5-pro',
    temperature: 0.2,
  },
  system_instructions:
    'You are an autonomous supply chain agent. Inspect out-of-stock SKUs, check warehouse safety thresholds, and request purchase orders when needed under strict policy governance.',
  tool_bindings: ['get_inventory', 'create_purchase_order', 'send_slack_alert'],
  policies: {
    max_risk_level: 'HIGH',
    require_approval_over_amount: 1000.0,
    require_all_approvals: false,
  },
  context_strategy: {
    token_budget: 4096,
  },
  created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
};

export class RuntimeStore {
  tenants: Tenant[] = [INITIAL_TENANT];
  projects: Project[] = [INITIAL_PROJECT];
  agents: Agent[] = [INITIAL_AGENT];
  agentVersions: AgentVersion[] = [INITIAL_VERSION];
  runs: Run[] = [];
  checkpoints: Checkpoint[] = [];
  approvals: Approval[] = [];
  toolExecutions: ToolExecution[] = [];
  events: EventRecord[] = [];
  leaseManager = new LeaseManager('worker-us-east-1');

  private listeners: Set<() => void> = new Set();

  constructor() {
    this.seedHistoricalData();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  private seedHistoricalData() {
    // 1. A pre-completed historical run
    const run1Id = 'run-hist-101';
    this.runs.push({
      id: run1Id,
      tenant_id: DEFAULT_TENANT_ID,
      agent_version_id: DEFAULT_VERSION_ID,
      status: RunStatus.COMPLETED,
      input: { sku: 'SKU-2091', restock_urgency: 'high' },
      output: {
        summary: 'Out-of-stock investigation completed and purchase order issued.',
        po_id: 'PO-SKU-2091-8841',
        amount: 850.0,
      },
      started_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      completed_at: new Date(Date.now() - 3600000 * 4 + 45000).toISOString(),
      failure_reason: null,
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    });

    const key1 = IdempotencyManager.generateKey(run1Id, 'step_1', { tool: 'get_inventory' });
    this.toolExecutions.push({
      id: 'exec-1',
      run_id: run1Id,
      tool_name: 'get_inventory',
      idempotency_key: key1,
      status: ToolExecutionStatus.COMPLETED,
      input: { sku: 'SKU-2091' },
      output: { sku: 'SKU-2091', quantity: 4, warehouse: 'WH-NORTH-04', safety_stock_threshold: 50 },
      executed_at: new Date(Date.now() - 3600000 * 4 + 1000).toISOString(),
    });

    this.checkpoints.push({
      id: 'chk-1',
      run_id: run1Id,
      step_number: 1,
      state_snapshot: {
        inventory: { sku: 'SKU-2091', quantity: 4, warehouse: 'WH-NORTH-04' },
      },
      created_at: new Date(Date.now() - 3600000 * 4 + 2000).toISOString(),
    });

    this.checkpoints.push({
      id: 'chk-2',
      run_id: run1Id,
      step_number: 2,
      state_snapshot: {
        inventory: { sku: 'SKU-2091', quantity: 4 },
        purchase_order: { po_id: 'PO-SKU-2091-8841', sku: 'SKU-2091', quantity: 100, amount: 850.0 },
      },
      created_at: new Date(Date.now() - 3600000 * 4 + 15000).toISOString(),
    });

    // 2. An active run waiting for human approval
    const run2Id = 'run-pending-202';
    this.runs.push({
      id: run2Id,
      tenant_id: DEFAULT_TENANT_ID,
      agent_version_id: DEFAULT_VERSION_ID,
      status: RunStatus.WAITING_FOR_APPROVAL,
      input: { sku: 'SKU-4812', target_warehouse: 'WH-NORTH-04', priority: 'critical' },
      output: null,
      started_at: new Date(Date.now() - 1800000).toISOString(),
      completed_at: null,
      failure_reason: null,
      created_at: new Date(Date.now() - 1800000).toISOString(),
    });

    const approvalId = 'appr-001';
    this.approvals.push({
      id: approvalId,
      run_id: run2Id,
      status: ApprovalStatus.PENDING,
      requested_action: {
        tool: 'create_purchase_order',
        args: { sku: 'SKU-4812', quantity: 500, amount: 4500.0, supplier: 'Global Logistics Apex' },
        risk_level: ToolRiskLevel.HIGH,
        rule_triggered: 'Purchase Order amount ($4,500.00) exceeds auto-approval threshold ($1,000.00)',
      },
      decision_by: null,
      decided_at: null,
      created_at: new Date(Date.now() - 1790000).toISOString(),
    });

    const key2 = IdempotencyManager.generateKey(run2Id, 'step_1', { tool: 'get_inventory' });
    this.toolExecutions.push({
      id: 'exec-2',
      run_id: run2Id,
      tool_name: 'get_inventory',
      idempotency_key: key2,
      status: ToolExecutionStatus.COMPLETED,
      input: { sku: 'SKU-4812' },
      output: { sku: 'SKU-4812', quantity: 12, warehouse: 'WH-NORTH-04', safety_stock_threshold: 50 },
      executed_at: new Date(Date.now() - 1795000).toISOString(),
    });

    this.checkpoints.push({
      id: 'chk-3',
      run_id: run2Id,
      step_number: 1,
      state_snapshot: {
        step: 1,
        step_name: 'Inventory Inspection',
        inventory: { sku: 'SKU-4812', quantity: 12, warehouse: 'WH-NORTH-04' },
      },
      created_at: new Date(Date.now() - 1792000).toISOString(),
    });

    // Seed events
    this.recordEvent(DEFAULT_TENANT_ID, EventType.RUN_CREATED, { run_id: run1Id }, run1Id);
    this.recordEvent(DEFAULT_TENANT_ID, EventType.RUN_STARTED, { run_id: run1Id }, run1Id);
    this.recordEvent(DEFAULT_TENANT_ID, EventType.STEP_COMPLETED, { run_id: run1Id, step: 1 }, run1Id);
    this.recordEvent(DEFAULT_TENANT_ID, EventType.CHECKPOINT_CREATED, { run_id: run1Id, step: 1 }, run1Id);
    this.recordEvent(DEFAULT_TENANT_ID, EventType.RUN_COMPLETED, { run_id: run1Id }, run1Id);

    this.recordEvent(DEFAULT_TENANT_ID, EventType.RUN_CREATED, { run_id: run2Id }, run2Id);
    this.recordEvent(DEFAULT_TENANT_ID, EventType.RUN_STARTED, { run_id: run2Id }, run2Id);
    this.recordEvent(DEFAULT_TENANT_ID, EventType.TOOL_COMPLETED, { run_id: run2Id, tool: 'get_inventory' }, run2Id);
    this.recordEvent(DEFAULT_TENANT_ID, EventType.CHECKPOINT_CREATED, { run_id: run2Id, step: 1 }, run2Id);
    this.recordEvent(DEFAULT_TENANT_ID, EventType.APPROVAL_REQUESTED, { run_id: run2Id, approval_id: approvalId }, run2Id);
  }

  recordEvent(tenantId: string, eventType: EventType, payload: Record<string, any>, runId?: string | null) {
    const ev: EventRecord = {
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tenant_id: tenantId,
      run_id: runId,
      event_type: eventType,
      payload,
      created_at: new Date().toISOString(),
    };
    this.events.unshift(ev);
    // Keep max 150 events in memory
    if (this.events.length > 150) {
      this.events = this.events.slice(0, 150);
    }
  }

  getMetrics(): RuntimeMetrics {
    const runsStarted = this.runs.filter((r) => r.status !== RunStatus.QUEUED).length;
    const runsCompleted = this.runs.filter((r) => r.status === RunStatus.COMPLETED).length;
    const runsFailed = this.runs.filter((r) => r.status === RunStatus.FAILED).length;
    const pendingApprovals = this.approvals.filter((a) => a.status === ApprovalStatus.PENDING).length;
    const activeWorkerLeases = this.leaseManager.getAllActiveLeases().length;
    const queueDepth = this.runs.filter((r) => r.status === RunStatus.QUEUED).length;
    const checkpointsCreated = this.checkpoints.length;
    const idempotencyCacheHits = this.toolExecutions.filter((t) => t.status === ToolExecutionStatus.COMPLETED).length;

    return {
      runsStarted,
      runsCompleted,
      runsFailed,
      pendingApprovals,
      activeWorkerLeases,
      queueDepth,
      idempotencyCacheHits,
      checkpointsCreated,
    };
  }

  // Submit Run (mirrors POST /v1/agents/{agent_id}/runs)
  createRun(agentId: string, inputPayload: Record<string, any>, versionId?: string): Run {
    const agent = this.agents.find((a) => a.id === agentId);
    if (!agent) throw new Error('Agent not found');

    const vId = versionId || agent.active_version_id;
    if (!vId) throw new Error('Agent does not have an active published version.');

    const project = this.projects.find((p) => p.id === agent.project_id);
    const tenantId = project?.tenant_id || DEFAULT_TENANT_ID;

    const newRun: Run = {
      id: `run-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
      tenant_id: tenantId,
      agent_version_id: vId,
      status: RunStatus.QUEUED,
      input: inputPayload,
      output: null,
      started_at: null,
      completed_at: null,
      failure_reason: null,
      created_at: new Date().toISOString(),
    };

    this.runs.unshift(newRun);
    this.recordEvent(tenantId, EventType.RUN_CREATED, { run_id: newRun.id, input: inputPayload }, newRun.id);
    this.notify();

    // Trigger asynchronous execution loop
    setTimeout(() => {
      this.executeRunPipeline(newRun.id);
    }, 400);

    return newRun;
  }

  // Execute Run Pipeline (mirrors Worker loop in apps/worker/main.py)
  async executeRunPipeline(runId: string) {
    const run = this.runs.find((r) => r.id === runId);
    if (!run) return;

    if (run.status !== RunStatus.QUEUED && run.status !== RunStatus.RUNNING) {
      return;
    }

    // 1. Acquire worker lease
    const acquired = this.leaseManager.acquireLease(runId, 30);
    if (!acquired) {
      console.warn('Could not acquire lease for run', runId);
      return;
    }

    try {
      // 2. Transition status to RUNNING via RunStateMachine
      const sm = new RunStateMachine(run.status);
      run.status = sm.transitionTo(RunStatus.RUNNING);
      run.started_at = run.started_at || new Date().toISOString();
      this.recordEvent(run.tenant_id, EventType.RUN_STARTED, { run_id: runId }, runId);
      this.notify();

      // Find Agent Version
      const version = this.agentVersions.find((v) => v.id === run.agent_version_id);
      if (!version) {
        run.status = RunStatus.FAILED;
        run.failure_reason = 'Agent version configuration missing.';
        this.recordEvent(run.tenant_id, EventType.RUN_FAILED, { error: run.failure_reason }, runId);
        this.notify();
        return;
      }

      // Check checkpoints to determine starting step
      const runCheckpoints = this.checkpoints
        .filter((c) => c.run_id === runId)
        .sort((a, b) => b.step_number - a.step_number);
      const latestChk = runCheckpoints[0];
      const startStep = latestChk ? latestChk.step_number + 1 : 1;

      // Small simulation delay
      await new Promise((r) => setTimeout(r, 600));

      // STEP 1: Inventory Check (Tool: get_inventory)
      if (startStep <= 1) {
        this.leaseManager.heartbeatLease(runId);
        this.recordEvent(run.tenant_id, EventType.STEP_STARTED, { step: 1, name: 'Inventory Inspection' }, runId);
        this.recordEvent(run.tenant_id, EventType.TOOL_STARTED, { tool: 'get_inventory' }, runId);

        const toolName = 'get_inventory';
        const sku = run.input.sku || 'SKU-4812';
        const idempotencyKey = IdempotencyManager.generateKey(runId, 'step_1', { tool: toolName, sku });

        // Check idempotency cache
        let cached = this.toolExecutions.find((te) => te.idempotency_key === idempotencyKey);
        let toolRes: Record<string, any>;

        if (!cached) {
          const execRecord: ToolExecution = {
            id: `exec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            run_id: runId,
            tool_name: toolName,
            idempotency_key: idempotencyKey,
            status: ToolExecutionStatus.EXECUTING,
            input: { sku },
            executed_at: new Date().toISOString(),
          };
          this.toolExecutions.unshift(execRecord);
          this.notify();

          toolRes = await ToolExecutor.executeTool(toolName, { sku });
          execRecord.status = ToolExecutionStatus.COMPLETED;
          execRecord.output = toolRes;
        } else {
          toolRes = cached.output || {};
        }

        this.recordEvent(run.tenant_id, EventType.TOOL_COMPLETED, { tool: toolName, output: toolRes }, runId);

        // Create Checkpoint 1
        const chk1: Checkpoint = {
          id: `chk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          run_id: runId,
          step_number: 1,
          state_snapshot: {
            step: 1,
            step_name: 'Inventory Inspection',
            sku,
            inventory: toolRes,
            decision: 'Stock below safety threshold. Restock required.',
          },
          created_at: new Date().toISOString(),
        };
        this.checkpoints.push(chk1);
        this.recordEvent(run.tenant_id, EventType.CHECKPOINT_CREATED, { step: 1, checkpoint_id: chk1.id }, runId);
        this.recordEvent(run.tenant_id, EventType.STEP_COMPLETED, { step: 1 }, runId);
        this.notify();

        await new Promise((r) => setTimeout(r, 600));
      }

      // STEP 2: Purchase Order Authorization & High Risk Gate
      if (startStep <= 2) {
        this.leaseManager.heartbeatLease(runId);
        const toolName = 'create_purchase_order';
        const toolDef = toolRegistry.getTool(toolName);
        const orderAmount = Number(run.input.amount) || 4500.0;
        const sku = run.input.sku || 'SKU-4812';
        const quantity = Number(run.input.quantity) || 500;

        // Policy evaluation
        const authRes = AuthorizationEngine.evaluateToolPermission(
          toolName,
          toolDef?.risk_level || ToolRiskLevel.HIGH,
          version.tool_bindings,
          version.policies
        );

        const requiresApproval =
          authRes.requires_approval ||
          (version.policies.require_approval_over_amount &&
            orderAmount > version.policies.require_approval_over_amount);

        if (requiresApproval) {
          // Check if approval was already granted
          const existingApproval = this.approvals.find(
            (a) => a.run_id === runId && a.requested_action.tool === toolName
          );

          if (!existingApproval) {
            // Halt run in WAITING_FOR_APPROVAL
            run.status = RunStatus.WAITING_FOR_APPROVAL;
            const newApproval: Approval = {
              id: `appr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              run_id: runId,
              status: ApprovalStatus.PENDING,
              requested_action: {
                tool: toolName,
                args: { sku, quantity, amount: orderAmount, supplier: 'Vertex Global Cargo' },
                risk_level: ToolRiskLevel.HIGH,
                rule_triggered: `Action '${toolName}' ($${orderAmount.toLocaleString()}) requires human operator approval according to policy: ${authRes.reason}`,
              },
              decision_by: null,
              decided_at: null,
              created_at: new Date().toISOString(),
            };
            this.approvals.unshift(newApproval);
            this.recordEvent(
              run.tenant_id,
              EventType.APPROVAL_REQUESTED,
              { approval_id: newApproval.id, requested_action: newApproval.requested_action },
              runId
            );
            this.notify();
            return; // Exit worker loop while waiting for human
          } else if (existingApproval.status === ApprovalStatus.PENDING) {
            // Still waiting
            run.status = RunStatus.WAITING_FOR_APPROVAL;
            this.notify();
            return;
          } else if (existingApproval.status === ApprovalStatus.REJECTED) {
            run.status = RunStatus.FAILED;
            run.failure_reason = `Execution rejected by operator '${existingApproval.decision_by || 'Admin'}'`;
            this.recordEvent(run.tenant_id, EventType.RUN_FAILED, { reason: run.failure_reason }, runId);
            this.notify();
            return;
          }
        }

        // If authorized or approved, execute purchase order
        this.recordEvent(run.tenant_id, EventType.STEP_STARTED, { step: 2, name: 'Issue Purchase Order' }, runId);
        this.recordEvent(run.tenant_id, EventType.TOOL_STARTED, { tool: toolName }, runId);

        const idempotencyKey = IdempotencyManager.generateKey(runId, 'step_2', {
          tool: toolName,
          sku,
          quantity,
          amount: orderAmount,
        });

        let cached = this.toolExecutions.find((te) => te.idempotency_key === idempotencyKey);
        let poRes: Record<string, any>;

        if (!cached) {
          const execRecord: ToolExecution = {
            id: `exec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            run_id: runId,
            tool_name: toolName,
            idempotency_key: idempotencyKey,
            status: ToolExecutionStatus.EXECUTING,
            input: { sku, quantity, amount: orderAmount },
            executed_at: new Date().toISOString(),
          };
          this.toolExecutions.unshift(execRecord);
          this.notify();

          poRes = await ToolExecutor.executeTool(toolName, { sku, quantity, amount: orderAmount });
          execRecord.status = ToolExecutionStatus.COMPLETED;
          execRecord.output = poRes;
        } else {
          poRes = cached.output || {};
        }

        this.recordEvent(run.tenant_id, EventType.TOOL_COMPLETED, { tool: toolName, output: poRes }, runId);

        // Checkpoint 2
        const chk2: Checkpoint = {
          id: `chk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          run_id: runId,
          step_number: 2,
          state_snapshot: {
            step: 2,
            step_name: 'Issue Purchase Order',
            purchase_order: poRes,
            vendor_status: 'CONFIRMED',
          },
          created_at: new Date().toISOString(),
        };
        this.checkpoints.push(chk2);
        this.recordEvent(run.tenant_id, EventType.CHECKPOINT_CREATED, { step: 2, checkpoint_id: chk2.id }, runId);
        this.recordEvent(run.tenant_id, EventType.STEP_COMPLETED, { step: 2 }, runId);
        this.notify();

        await new Promise((r) => setTimeout(r, 400));
      }

      // Complete Run
      run.status = RunStatus.COMPLETED;
      run.completed_at = new Date().toISOString();
      run.output = {
        summary: 'Out-of-stock investigation completed and purchase order issued successfully.',
        sku: run.input.sku || 'SKU-4812',
        checkpoints_recorded: 2,
        execution_status: 'SUCCESS_POLICY_VERIFIED',
      };
      this.recordEvent(run.tenant_id, EventType.RUN_COMPLETED, { output: run.output }, runId);
      this.notify();
    } catch (err: any) {
      console.error('Error during run execution:', err);
      run.status = RunStatus.FAILED;
      run.failure_reason = err.message || 'Execution error';
      this.recordEvent(run.tenant_id, EventType.RUN_FAILED, { error: run.failure_reason }, runId);
      this.notify();
    } finally {
      this.leaseManager.releaseLease(runId);
      this.notify();
    }
  }

  // Approve a pending step (mirrors POST /v1/approvals/{id}/approve)
  async approveStep(approvalId: string, decisionBy: string = 'Security Officer / Op Admin') {
    const approval = this.approvals.find((a) => a.id === approvalId);
    if (!approval) throw new Error('Approval request not found');

    approval.status = ApprovalStatus.APPROVED;
    approval.decision_by = decisionBy;
    approval.decided_at = new Date().toISOString();

    const run = this.runs.find((r) => r.id === approval.run_id);
    if (run) {
      run.status = RunStatus.QUEUED;
      this.recordEvent(
        run.tenant_id,
        EventType.APPROVAL_COMPLETED,
        { approval_id: approvalId, status: 'APPROVED', decision_by: decisionBy },
        run.id
      );
      this.notify();

      // Resume execution
      setTimeout(() => {
        this.executeRunPipeline(run.id);
      }, 300);
    }
  }

  // Reject a pending step (mirrors POST /v1/approvals/{id}/reject)
  rejectStep(approvalId: string, decisionBy: string = 'Security Officer / Op Admin', rejectionReason?: string) {
    const approval = this.approvals.find((a) => a.id === approvalId);
    if (!approval) throw new Error('Approval request not found');

    approval.status = ApprovalStatus.REJECTED;
    approval.decision_by = decisionBy;
    approval.decided_at = new Date().toISOString();

    const run = this.runs.find((r) => r.id === approval.run_id);
    if (run) {
      run.status = RunStatus.FAILED;
      run.failure_reason =
        rejectionReason || `Human operator '${decisionBy}' rejected execution step.`;
      this.recordEvent(
        run.tenant_id,
        EventType.APPROVAL_COMPLETED,
        { approval_id: approvalId, status: 'REJECTED', decision_by: decisionBy },
        run.id
      );
      this.recordEvent(
        run.tenant_id,
        EventType.RUN_FAILED,
        { reason: run.failure_reason },
        run.id
      );
      this.notify();
    }
  }

  // Cancel a run (mirrors POST /v1/runs/{id}/cancel)
  cancelRun(runId: string) {
    const run = this.runs.find((r) => r.id === runId);
    if (!run) throw new Error('Run not found');

    const sm = new RunStateMachine(run.status);
    if (!sm.canTransitionTo(RunStatus.CANCELLED)) {
      throw new Error(`Cannot cancel run in state ${run.status}`);
    }

    run.status = RunStatus.CANCELLED;
    this.leaseManager.releaseLease(runId);
    this.recordEvent(run.tenant_id, EventType.RUN_CANCELLED, { run_id: runId }, runId);
    this.notify();
  }

  // Resume or Retry a failed/paused run (mirrors POST /v1/runs/{id}/resume)
  resumeRun(runId: string) {
    const run = this.runs.find((r) => r.id === runId);
    if (!run) throw new Error('Run not found');

    run.status = RunStatus.QUEUED;
    run.failure_reason = null;
    this.recordEvent(run.tenant_id, EventType.RUN_RESUMED, { run_id: runId }, runId);
    this.notify();

    setTimeout(() => {
      this.executeRunPipeline(runId);
    }, 300);
  }

  // Create new Agent Version (mirrors POST /v1/agents/{id}/versions)
  createAgentVersion(agentId: string, versionData: Partial<AgentVersion>): AgentVersion {
    const agent = this.agents.find((a) => a.id === agentId);
    if (!agent) throw new Error('Agent not found');

    const existingVersions = this.agentVersions.filter((v) => v.agent_id === agentId);
    const nextVer = existingVersions.length + 1;

    const newVersion: AgentVersion = {
      id: `ver-${agentId}-${nextVer}`,
      agent_id: agentId,
      version: nextVer,
      model_config_data: versionData.model_config_data || {
        provider: 'google',
        model: 'gemini-1.5-pro',
        temperature: 0.2,
      },
      system_instructions:
        versionData.system_instructions || 'You are an autonomous enterprise agent.',
      tool_bindings: versionData.tool_bindings || ['get_inventory', 'create_purchase_order'],
      policies: versionData.policies || {
        max_risk_level: 'HIGH',
        require_approval_over_amount: 1000.0,
      },
      context_strategy: versionData.context_strategy || {
        token_budget: 4096,
      },
      created_at: new Date().toISOString(),
    };

    this.agentVersions.push(newVersion);
    agent.active_version_id = newVersion.id;
    this.notify();
    return newVersion;
  }

  // Create new Agent (mirrors POST /v1/agents)
  createAgent(name: string, description: string, projectId: string = DEFAULT_PROJECT_ID): Agent {
    const newAgent: Agent = {
      id: `agent-${Date.now().toString(36)}`,
      project_id: projectId,
      name,
      description,
    };
    this.agents.push(newAgent);

    // Create v1 for this agent
    const v1 = this.createAgentVersion(newAgent.id, {
      system_instructions: `Autonomous agent ${name} initialized for project workflows.`,
      tool_bindings: ['get_inventory', 'send_slack_alert'],
    });

    newAgent.active_version_id = v1.id;
    this.notify();
    return newAgent;
  }
}

export const runtimeStore = new RuntimeStore();
