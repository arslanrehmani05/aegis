import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    ForeignKey,
    DateTime,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from packages.storage.database import Base

class TenantModel(Base):
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default="ACTIVE")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    projects = relationship("ProjectModel", back_populates="tenant", cascade="all, delete-orphan")

class ProjectModel(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    tenant = relationship("TenantModel", back_populates="projects")
    agents = relationship("AgentModel", back_populates="project", cascade="all, delete-orphan")

class AgentModel(Base):
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    active_version_id = Column(UUID(as_uuid=True), nullable=True)

    project = relationship("ProjectModel", back_populates="agents")
    versions = relationship("AgentVersionModel", back_populates="agent", cascade="all, delete-orphan")

class AgentVersionModel(Base):
    __tablename__ = "agent_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    version = Column(Integer, nullable=False)
    model_config_data = Column("model_config", JSONB, nullable=False)
    system_instructions = Column(Text, nullable=False)
    tool_bindings = Column(JSONB, nullable=False, default=list)
    policies = Column(JSONB, nullable=False, default=dict)
    context_strategy = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    __table_args__ = (UniqueConstraint("agent_id", "version", name="uq_agent_version"),)

    agent = relationship("AgentModel", back_populates="versions")
    runs = relationship("RunModel", back_populates="agent_version")

class RunModel(Base):
    __tablename__ = "runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    agent_version_id = Column(UUID(as_uuid=True), ForeignKey("agent_versions.id"), nullable=False)
    status = Column(String(50), nullable=False)
    input = Column(JSONB, nullable=False)
    output = Column(JSONB, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    failure_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    agent_version = relationship("AgentVersionModel", back_populates="runs")
    checkpoints = relationship("CheckpointModel", back_populates="run", cascade="all, delete-orphan")
    tool_executions = relationship("ToolExecutionModel", back_populates="run", cascade="all, delete-orphan")
    approvals = relationship("ApprovalModel", back_populates="run", cascade="all, delete-orphan")

class CheckpointModel(Base):
    __tablename__ = "checkpoints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("runs.id", ondelete="CASCADE"), nullable=False)
    step_number = Column(Integer, nullable=False)
    state_snapshot = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    __table_args__ = (UniqueConstraint("run_id", "step_number", name="uq_run_step"),)

    run = relationship("RunModel", back_populates="checkpoints")

class ToolExecutionModel(Base):
    __tablename__ = "tool_executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("runs.id", ondelete="CASCADE"), nullable=False)
    tool_name = Column(String(255), nullable=False)
    idempotency_key = Column(String(255), unique=True, nullable=False)
    status = Column(String(50), nullable=False)
    input = Column(JSONB, nullable=False)
    output = Column(JSONB, nullable=True)
    executed_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    run = relationship("RunModel", back_populates="tool_executions")

class ApprovalModel(Base):
    __tablename__ = "approvals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("runs.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), nullable=False, default="PENDING")
    requested_action = Column(JSONB, nullable=False)
    decision_by = Column(String(255), nullable=True)
    decided_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    run = relationship("RunModel", back_populates="approvals")

class EventModel(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    run_id = Column(UUID(as_uuid=True), ForeignKey("runs.id"), nullable=True)
    event_type = Column(String(255), nullable=False)
    payload = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
