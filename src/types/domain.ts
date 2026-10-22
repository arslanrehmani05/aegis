export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

export enum RunStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  WAITING_FOR_TOOL = 'WAITING_FOR_TOOL',
  WAITING_FOR_APPROVAL = 'WAITING_FOR_APPROVAL',
  PAUSED = 'PAUSED',
  RETRYING = 'RETRYING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  TIMED_OUT = 'TIMED_OUT',
}

export enum ToolRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum ToolExecutionStatus {
  PENDING = 'PENDING',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum EventType {
  RUN_CREATED = 'run.created',
  RUN_STARTED = 'run.started',
  RUN_PAUSED = 'run.paused',
  RUN_RESUMED = 'run.resumed',
  RUN_COMPLETED = 'run.completed',
  RUN_FAILED = 'run.failed',
  RUN_CANCELLED = 'run.cancelled',
  STEP_STARTED = 'step.started',
  STEP_COMPLETED = 'step.completed',
  STEP_FAILED = 'step.failed',
  TOOL_STARTED = 'tool.started',
  TOOL_COMPLETED = 'tool.completed',
  TOOL_FAILED = 'tool.failed',
  APPROVAL_REQUESTED = 'approval.requested',
  APPROVAL_COMPLETED = 'approval.completed',
  CHECKPOINT_CREATED = 'checkpoint.created',
}

export interface Tenant {
  id: string;
  name: string;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Agent {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  active_version_id?: string;
}

export interface AgentVersion {
  id: string;
  agent_id: string;
  version: number;
  model_config_data: {
    provider?: string;
    model?: string;
    temperature?: number;
    [key: string]: any;
  };
  system_instructions: string;
  tool_bindings: string[];
  policies: {
    max_risk_level?: string;
    require_approval_over_amount?: number;
    require_all_approvals?: boolean;
    [key: string]: any;
  };
  context_strategy: {
    token_budget?: number;
    [key: string]: any;
  };
  created_at: string;
}

export interface Run {
  id: string;
  tenant_id: string;
  agent_version_id: string;
  status: RunStatus;
  input: Record<string, any>;
  output?: Record<string, any> | null;
  started_at?: string | null;
  completed_at?: string | null;
  failure_reason?: string | null;
  created_at: string;
}

export interface Checkpoint {
  id: string;
  run_id: string;
  step_number: number;
  state_snapshot: Record<string, any>;
  created_at: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
  risk_level: ToolRiskLevel;
  requires_approval: boolean;
  timeout_seconds: number;
}

export interface ToolExecution {
  id: string;
  run_id: string;
  tool_name: string;
  idempotency_key: string;
  status: ToolExecutionStatus;
  input: Record<string, any>;
  output?: Record<string, any> | null;
  executed_at: string;
}

export interface Approval {
  id: string;
  run_id: string;
  status: ApprovalStatus;
  requested_action: {
    tool: string;
    args: Record<string, any>;
    risk_level?: ToolRiskLevel;
    rule_triggered?: string;
  };
  decision_by?: string | null;
  decided_at?: string | null;
  created_at: string;
}

export interface EventRecord {
  id: string;
  tenant_id: string;
  run_id?: string | null;
  event_type: EventType;
  payload: Record<string, any>;
  created_at: string;
}

export interface WorkerLease {
  run_id: string;
  worker_id: string;
  acquired_at: string;
  expires_at: string;
  ttl_seconds: number;
  heartbeat_count: number;
}

export interface RuntimeMetrics {
  runsStarted: number;
  runsCompleted: number;
  runsFailed: number;
  activeWorkerLeases: number;
  pendingApprovals: number;
  queueDepth: number;
  idempotencyCacheHits: number;
  checkpointsCreated: number;
}
