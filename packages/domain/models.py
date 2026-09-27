from typing import Any, Dict, List, Optional
from datetime import datetime
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, ConfigDict

from packages.domain.enums import (
    TenantStatus,
    RunStatus,
    ToolRiskLevel,
    ApprovalStatus,
    ToolExecutionStatus,
    EventType,
)

class BaseDomainModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class Tenant(BaseDomainModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    status: TenantStatus = TenantStatus.ACTIVE
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Project(BaseDomainModel):
    id: UUID = Field(default_factory=uuid4)
    tenant_id: UUID
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Agent(BaseDomainModel):
    id: UUID = Field(default_factory=uuid4)
    project_id: UUID
    name: str
    description: Optional[str] = None
    active_version_id: Optional[UUID] = None

class AgentVersion(BaseDomainModel):
    id: UUID = Field(default_factory=uuid4)
    agent_id: UUID
    version: int
    model_config_data: Dict[str, Any] = Field(default_factory=dict)
    system_instructions: str
    tool_bindings: List[str] = Field(default_factory=list)
    policies: Dict[str, Any] = Field(default_factory=dict)
    context_strategy: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Run(BaseDomainModel):
    id: UUID = Field(default_factory=uuid4)
    tenant_id: UUID
    agent_version_id: UUID
    status: RunStatus = RunStatus.QUEUED
    input: Dict[str, Any]
    output: Optional[Dict[str, Any]] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Checkpoint(BaseDomainModel):
    id: UUID = Field(default_factory=uuid4)
    run_id: UUID
    step_number: int
    state_snapshot: Dict[str, Any]
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ToolDefinition(BaseDomainModel):
    id: str
    name: str
    version: str
    description: str
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    risk_level: ToolRiskLevel = ToolRiskLevel.LOW
    requires_approval: bool = False
    timeout_seconds: int = 20

class ToolExecution(BaseDomainModel):
    id: UUID = Field(default_factory=uuid4)
    run_id: UUID
    tool_name: str
    idempotency_key: str
    status: ToolExecutionStatus = ToolExecutionStatus.PENDING
    input: Dict[str, Any]
    output: Optional[Dict[str, Any]] = None
    executed_at: datetime = Field(default_factory=datetime.utcnow)

class Approval(BaseDomainModel):
    id: UUID = Field(default_factory=uuid4)
    run_id: UUID
    status: ApprovalStatus = ApprovalStatus.PENDING
    requested_action: Dict[str, Any]
    decision_by: Optional[str] = None
    decided_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Event(BaseDomainModel):
    id: UUID = Field(default_factory=uuid4)
    tenant_id: UUID
    run_id: Optional[UUID] = None
    event_type: EventType
    payload: Dict[str, Any]
    created_at: datetime = Field(default_factory=datetime.utcnow)
