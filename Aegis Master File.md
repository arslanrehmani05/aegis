# Aegis: Durable AI Agent Execution Runtime
## Complete Master Specification & System Documentation

---

## Table of Contents
- [Part I: Technical Specification (Sections 1–42)](#part-i-technical-specification)
  - [1. Executive Summary](#1-executive-summary)
  - [2. Portfolio Role](#2-portfolio-role)
  - [3. Problem Statement](#3-problem-statement)
  - [4. Core Design Principle](#4-core-design-principle)
  - [5. Goals](#5-goals)
  - [6. Non-Goals](#6-non-goals)
  - [7. Target Users](#7-target-users)
  - [8. Conceptual Model](#8-conceptual-model)
  - [9. Core Domain Objects](#9-core-domain-objects)
  - [10. Execution Lifecycle](#10-execution-lifecycle)
  - [11. Architecture Overview](#11-architecture-overview)
  - [12. Recommended Technology Stack](#12-recommended-technology-stack)
  - [13. Repository Structure](#13-repository-structure)
  - [14. Queue Design & Worker Lease Protocol](#14-queue-design--worker-lease-protocol)
  - [15. Idempotency Architecture](#15-idempotency-architecture)
  - [16. State Checkpointing](#16-state-checkpointing)
  - [17. Retry System & Backoff Policy](#17-retry-system--backoff-policy)
  - [18. Dead-Letter Queue (DLQ)](#18-dead-letter-queue-dlq)
  - [19. Tool Registry & Schema Versioning](#19-tool-registry--schema-versioning)
  - [20. Tool Permissions & Multi-Layer Authorization](#20-tool-permissions--multi-layer-authorization)
  - [21. Sandboxed Tool Execution](#21-sandboxed-tool-execution)
  - [22. Dynamic Context Assembly Engine](#22-dynamic-context-assembly-engine)
  - [23. Human-in-the-Loop Approval Operations](#23-human-in-the-loop-approval-operations)
  - [24. Event Architecture](#24-event-architecture)
  - [25. Reliable Webhook Delivery System](#25-reliable-webhook-delivery-system)
  - [26. Scheduling Engine](#26-scheduling-engine)
  - [27. Run Cancellation](#27-run-cancellation)
  - [28. Concurrency & Rate Limiting](#28-concurrency--rate-limiting)
  - [29. Observability & Tracing](#29-observability--tracing)
  - [30. Security Model](#30-security-model)
  - [31. Database Schema Model](#31-database-schema-model)
  - [32. REST API Design](#32-rest-api-design)
  - [33. End-to-End Execution Walkthrough](#33-end-to-end-execution-walkthrough)
  - [34. Failure Verification Scenarios](#34-failure-verification-scenarios)
  - [35. Automated Testing Strategy](#35-automated-testing-strategy)
  - [36. MVP Scope Definition](#36-mvp-scope-definition)
  - [37. Multi-Phase Implementation Roadmap](#37-multi-phase-implementation-roadmap)
  - [38. Definition of Done](#38-definition-of-done)
  - [39. Portfolio Case Study Presentation Framework](#39-portfolio-case-study-presentation-framework)
  - [40. Future Extensions](#40-future-extensions)
  - [41. Success Criteria](#41-success-criteria)
  - [42. Immediate First Build Order](#42-immediate-first-build-order)
- [Part II: Codebase Implementation & Architecture Guide](#part-ii-codebase-implementation--architecture-guide)
  - [1. Repository Layout & Component Architecture](#1-repository-layout--component-architecture)
  - [2. Domain Layer Package](#2-domain-layer-package)
  - [3. Storage & Database Layer Package](#3-storage--database-layer-package)
  - [4. Orchestration Engine Package](#4-orchestration-engine-package)
  - [5. Policies & Authorization Package](#5-policies--authorization-package)
  - [6. Tool Registry & Execution Package](#6-tool-registry--execution-package)
  - [7. Context Assembly Package](#7-context-assembly-package)
  - [8. Event & Webhook Bus Package](#8-event--webhook-bus-package)
  - [9. Observability Suite Package](#9-observability-suite-package)
  - [10. API Gateway Application](#10-api-gateway-application)
  - [11. Async Worker Runtime Application](#11-async-worker-runtime-application)
  - [12. Container Infrastructure & Tooling](#12-container-infrastructure--tooling)
  - [13. Test Suite Verification](#13-test-suite-verification)

---

# Part I: Technical Specification

### 1. Executive Summary

**Aegis** is a production-oriented, durable AI agent runtime designed to execute long-running, multi-step AI tasks reliably.

> **Core Philosophy:** A language model is not an execution engine.

A normal LLM application can send a prompt, receive a response, call a tool, and return an answer. That architecture becomes inadequate when an agent must execute many steps, survive worker crashes, wait for external systems, retry failed operations, request human approval, maintain state, execute tools securely, emit events, or resume work hours later.

Aegis provides that missing execution layer.

Aegis is therefore not a chatbot, agent demo, prompt wrapper, or collection of tool-calling functions. It is a **durable execution platform** for AI agents and business workflows.

The project is intended to become one of the two flagship AI-engineering systems on **arslanrehmani.com**, alongside **Atlas**.

---

### 2. Portfolio Role

Aegis answers this central engineering question:

> *Can Arslan build the runtime infrastructure required for AI agents to perform real work reliably?*

The existing portfolio demonstrates business applications such as manufacturing operations, e-commerce, market intelligence, and legal intelligence. Aegis adds the core infrastructure layer.

#### Portfolio Architecture Hierarchy
```
Business Applications
        ↓
AI Applications
        ↓
AI Agent Runtime (Aegis)
        ↓
Reliable Business Automation
```

#### Demonstrated Technical Depth
Aegis demonstrates deep engineering expertise in:
- **Distributed Systems & Async Execution**: Task queues, event-driven state machines, worker lease models, heartbeats.
- **Resilience & Reliability**: Durable workflows, incremental checkpoints, exponential backoff retries, idempotency, dead-letter queues (DLQ).
- **Concurrency & Resource Management**: Multi-tenant limits, backpressure controls, rate limiting, graceful shutdown semantics.
- **Security & Tool Sandboxing**: Granular permission hierarchies, isolated containerized execution, SSRF protection.
- **Context & Human-in-the-Loop**: Dynamic context assembly, token budgeting, approval gates, pause/resume primitives.
- **Observability & Auditability**: Distributed event streaming, signed webhooks, structured JSON logging, trace correlation IDs.

---

### 3. Problem Statement

A naive agent architecture relies on simple synchronous request/response loops:

```
User ──► LLM ──► Tool ──► LLM ──► Answer
```

This breaks under real-world operational requirements.

Consider an agent that must:
1. Inspect a Shopify order.
2. Retrieve inventory from an internal ERP.
3. Contact a supplier via API.
4. Wait for an external webhook response.
5. Calculate a reorder recommendation.
6. Ask a human for approval on high-value orders.
7. Update the ERP upon approval.
8. Send vendor and customer emails.
9. Emit status webhooks.
10. Record a complete immutable audit trail.

A single HTTP request is not an appropriate execution model for this.

#### Key Failures Handled by Aegis
- **Long-Running Tasks**: Tasks that span minutes, hours, or days.
- **Process & Worker Crashes**: Sudden worker host terminates mid-step.
- **Provider Failures**: LLM API rate limits, timeouts, or 50x errors.
- **Tool Failures & Side-Effects**: Downstream API failures and partial updates.
- **Duplicate Delivery**: Network retries causing double execution of side-effects.
- **State Persistence**: Loss of in-memory context across server restarts.
- **Human Approval Pauses**: Halting execution safely for human sign-off.
- **Concurrency & Resource Limits**: Unbounded task execution overloading downstream databases.

---

### 4. Core Design Principle

**Aegis must treat an agent run as a durable stateful process, not as a request/response cycle.**

The system must be able to answer at any point:
- *What is this run doing right now?*
- *What has already happened in preceding steps?*
- *What was the last successful checkpoint?*
- *Which tool is executing and under what input arguments?*
- *What happens if the worker dies right now?*
- *Can the run safely resume without repeating side effects?*
- *Has an external side effect (e.g., payment, email, DB write) already been committed?*
- *Is human approval required before proceeding?*
- *What events have been emitted to external subscribers?*
- *Why did the run fail, and can an operator replay or resume it?*

---

### 5. Goals

#### 5.1 Primary Goals
Aegis must provide:
- **Durable Agent Execution**: State machine-backed runs capable of surviving process crashes.
- **Asynchronous Task Execution**: Background job processing via distributed message queues.
- **Persistent Run State**: Full step history and variables stored in durable storage.
- **Incremental Checkpointing**: State snapshots saved after every valid transition.
- **Automated Retry & Recovery**: Intelligent retry policies with safe crash recovery.
- **Tool Registry & Execution Engine**: Versioned tool schemas with structured execution.
- **Granular Tool Permissions**: Multi-level authorization policies for tool invocations.
- **Sandboxed Execution**: Isolated container/process environments for executing untrusted tools.
- **Context Assembly Engine**: Dynamic token-budgeted prompt construction with relevance filtering.
- **Human Approval Gates**: Native execution pause and resume capabilities.
- **Event & Webhook Delivery**: Reliable, signed webhook dispatch with retries and DLQ.
- **Scheduling**: Time-delayed and recurring run execution.
- **Cancellation & Timeouts**: Clean cooperative cancellation and execution timeout limits.
- **Idempotency Controls**: Guaranteed single-execution semantics for external side-effects.
- **Audit Logs & Structured Observability**: OpenTelemetry tracing, metrics, and correlation IDs.
- **Multi-Tenant Isolation**: Strict logical data and execution boundaries per tenant.

#### 5.2 Secondary Goals
Aegis should also demonstrate:
- Horizontal worker scaling with dynamic lease distribution.
- Backpressure and global/tenant rate limiting.
- Dead-letter queues (DLQ) with operator replay controls.
- Graceful shutdown handlers ensuring in-flight step completion or clean checkpointing.
- Workflow replay and deterministic execution tracing.
- Versioned agent definitions and versioned tool definitions.

---

### 6. Non-Goals

Aegis is intentionally focused on runtime infrastructure. It is **not** intended to become:
- A general-purpose LLM API provider or proxy wrapper.
- A consumer-facing chatbot application.
- A generic CRM or ERP business software system.
- A standalone vector database engine.
- A Kubernetes orchestration replacement.
- A browser automation product.
- A model-training or fine-tuning platform.
- An unrestricted multi-tenant code-execution service (PaaS).

*Aegis integrates with these systems where useful, but they are not the product.*

---

### 7. Target Users

#### 7.1 Application Developers
Developers who need to define agents and submit runs without implementing custom queueing, retries, checkpointing, or execution state machines.

#### 7.2 AI Product Teams
Product engineering teams requiring production operational features: distributed queues, rate limits, authorization policies, approval workflows, and trace observability.

#### 7.3 Operational Businesses
Enterprises deploying background automation for workflows such as inventory monitoring, order investigation, customer support escalation, supplier follow-up, financial reconciliation, and document processing.

---

### 8. Conceptual Model

```mermaid
erDiagram
    TENANT ||--o{ PROJECT : contains
    PROJECT ||--o{ AGENT : owns
    PROJECT ||--o{ TOOL : registers
    PROJECT ||--o{ WEBHOOK : configures
    AGENT ||--o{ AGENT_VERSION : defines
    AGENT_VERSION ||--o{ RUN : executes
    RUN ||--o{ RUN_TASK : decomposes
    RUN ||--o{ RUN_STEP : records
    RUN ||--o{ CHECKPOINT : persists
    RUN ||--o{ TOOL_EXECUTION : invokes
    RUN ||--o{ APPROVAL : requests
    RUN ||--o{ EVENT : emits
```

---

### 9. Core Domain Objects

#### 9.1 Tenant
Represents an isolated customer or organization.
- `id`: UUID (Primary Key)
- `name`: String
- `status`: Enum (`ACTIVE`, `SUSPENDED`, `DELETED`)
- `created_at`: Timestamp
- `updated_at`: Timestamp

#### 9.2 Project
Logical grouping of agents, tools, policies, and runs.
- `id`: UUID (Primary Key)
- `tenant_id`: UUID (Foreign Key)
- `name`: String
- `description`: Text
- `created_at`: Timestamp

#### 9.3 Agent
Logical agent identity.
- `id`: UUID (Primary Key)
- `project_id`: UUID (Foreign Key)
- `name`: String
- `description`: Text
- `active_version_id`: UUID (Optional Foreign Key)

#### 9.4 Agent Version
An immutable configuration snapshot defining how an agent operates.
- `id`: UUID (Primary Key)
- `agent_id`: UUID (Foreign Key)
- `version`: Integer / SemVer
- `model_config`: JSONB (provider, model name, temperature, max tokens)
- `system_instructions`: Text
- `tool_bindings`: JSONB (array of allowed tool IDs and permissions)
- `policies`: JSONB (retry limits, approval rules, timeouts)
- `context_strategy`: JSONB (history limits, retrieval settings)
- `created_at`: Timestamp
*Agent versions are strictly immutable after publication.*

#### 9.5 Run
A single execution instance of an Agent Version.
- `id`: UUID (Primary Key)
- `agent_version_id`: UUID (Foreign Key)
- `status`: Enum
- `input`: JSONB
- `output`: JSONB (Optional)
- `started_at`: Timestamp (Optional)
- `completed_at`: Timestamp (Optional)
- `failure_reason`: Text (Optional)

##### Run Status States
`QUEUED` | `RUNNING` | `WAITING_FOR_TOOL` | `WAITING_FOR_APPROVAL` | `PAUSED` | `RETRYING` | `COMPLETED` | `FAILED` | `CANCELLED` | `TIMED_OUT`

---

### 10. Execution Lifecycle

```mermaid
flowchart TD
    A[SUBMITTED] --> B[QUEUED]
    B --> C[CLAIMED by Worker]
    C --> D[RUNNING]
    D --> E[PLANNING / LLM Reasoning]
    
    E --> F{Tool Required?}
    F -- No --> G[COMPLETED]
    F -- Yes --> H[TOOL_AUTHORIZATION]
    
    H --> I{Approval Required?}
    I -- Yes --> J[WAITING_FOR_APPROVAL]
    J --> K{Human Decision}
    K -- Approved --> L[TOOL_EXECUTION]
    K -- Rejected --> M[FAILED / TERMINATED]
    
    I -- No --> L
    
    L --> N{Execution Success?}
    N -- Yes --> O[RESULT_VALIDATION]
    N -- No --> P{Retryable Error?}
    
    P -- Yes --> Q[BACKOFF / RETRYING]
    Q --> B
    P -- No --> M
    
    O --> R[CHECKPOINT]
    R --> D
```

---

### 11. Architecture Overview

```
                        CLIENTS
                           │
                           ▼
                    ┌─────────────┐
                    │ API Gateway │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
          Run API      Agent API     Tool API
              │
              ▼
       ┌─────────────────┐
       │ Orchestrator    │
       └────────┬────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
   PostgreSQL         Redis/Queue
        │                │
        │         ┌──────┴──────┐
        │         ▼             ▼
        │      Worker 1      Worker N
        │         │             │
        │         └──────┬──────┘
        │                ▼
        │        Agent Executor
        │                │
        │      ┌─────────┼─────────┐
        │      ▼         ▼         ▼
        │   Context    Tools    Policies
        │      │         │
        │      ▼         ▼
        │   Retrieval  Sandbox
        │
        └──────────────┐
                       ▼
                 Event System
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
          Webhooks            Event Log
```

---

### 12. Recommended Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Language** | Python 3.12+ | Ecosystem standard for AI/LLM integrations, robust native `asyncio`, type hints. |
| **API Framework** | FastAPI + Pydantic v2 | High-performance asynchronous REST endpoints, automatic OpenAPI documentation, schema validation. |
| **Database** | PostgreSQL 16+ | ACID compliance, robust JSONB support for unstructured step payloads, relational integrity. |
| **Queue / Broker** | Redis 7+ (Streams / PubSub) | Ultra-fast message queueing, atomic lock operations for worker leasing and heartbeating. |
| **ORM & Migrations**| SQLAlchemy 2.0 + Alembic | Modern async ORM pattern, explicit migration history, raw query escape hatch. |
| **Containerization**| Docker & Docker Compose | Uniform dev/prod setup for API, Worker, PostgreSQL, Redis, and Sandbox containers. |
| **Testing** | pytest, pytest-asyncio, httpx | Async testing suite with fixtures, API test clients, and failure simulation helpers. |

---

### 13. Repository Structure

```
aegis/
├── AEGIS.md                 # THIS FILE - Unified Master Specification & Implementation Blueprint
├── README.md                # Entry point referencing AEGIS.md
├── pyproject.toml           # Package metadata, dependencies, & pytest settings
├── docker-compose.yml       # Local orchestration for Postgres 16, Redis 7, API, & Worker
├── packages/
│   ├── domain/              # Enums (RunStatus, ToolRiskLevel) & Pydantic Domain Models
│   ├── storage/             # Async SQLAlchemy engine, ORM db_models, & Redis queue client
│   ├── orchestration/       # RunStateMachine, LeaseManager, CheckpointEngine, IdempotencyManager
│   ├── policies/            # RetryPolicy (Exponential backoff + jitter) & AuthorizationEngine
│   ├── tools/               # ToolRegistry schema validator & ToolExecutor engine
│   ├── context/             # Dynamic ContextAssembler with token budgeting
│   ├── events/              # Audit EventBus & HMAC-SHA256 Signed WebhookDispatcher
│   └── observability/       # Structlog JSON logger & Prometheus Metrics
├── apps/
│   ├── api/                 # FastAPI REST API Gateway & Routers (agents, runs, tools, approvals)
│   └── worker/              # Background Worker Loop, lease heartbeats, & execution handler
├── infra/
│   └── docker/              # Dockerfiles for API and Worker containers
├── scripts/
│   └── seed.py              # Seeding script for demo tenant, project, agent, and version
└── tests/
    ├── unit/                # State machine, retry policy, and idempotency key tests
    └── integration/         # API gateway integration tests
```

---

### 14. Queue Design & Worker Lease Protocol

Aegis implements an explicit **Lease Model** to ensure tasks are never lost if a worker process crashes or loses network connection.

```
QUEUED ──► CLAIMED (Worker ID assigned + Lease TTL set) ──► HEARTBEATING ──► ACK (Completed)
   │                                                                │
   └─────────────◄───── LEASE EXPIRED (Worker lost) ────────────────┘
```

#### Job Payload Schema
Every task unit contains:
- `job_id`: Unique message ID.
- `run_id`: Associated agent run UUID.
- `task_id`: Execution task identifier.
- `priority`: Numeric priority index.
- `attempt_count`: Current execution attempt index.
- `available_at`: Timestamp when job becomes eligible for execution.
- `lease_expiration`: Expiration timestamp of the current worker lease.
- `worker_id`: Unique identifier of the handling worker process.
- `idempotency_key`: Deduplication key.

#### Worker Lease Protocol
1. Worker claims a job from Redis with an initial lease duration (e.g., 30 seconds).
2. While processing the step, worker periodically sends heartbeats to refresh `lease_expiration`.
3. If worker crashes or drops off, the lease expires.
4. A background monitor process re-queues expired jobs automatically for pickup by another worker.

---

### 15. Idempotency Architecture

Every externally visible side effect (sending an email, invoking a third-party API, updating a database record) must be strictly idempotent to prevent duplicate execution during retries.

#### Key Generation Strategy
$$\text{Idempotency Key} = \text{Hash}(\text{run\_id} + \text{step\_id} + \text{attempt\_semantic\_key})$$

#### Execution Flow
1. Prior to invoking an external side-effect tool, worker queries `tool_executions` for `idempotency_key`.
2. If record exists in status `COMPLETED`, worker skips execution and returns the saved result.
3. If record does not exist, a record is inserted in status `EXECUTING`.
4. Tool executes; upon success, result is committed alongside step state update in a single transaction.

---

### 16. State Checkpointing

Aegis creates immutable state checkpoints after every completed execution step.

```
Step 1 Completed ──► CHECKPOINT 1 ──► Step 2 Completed ──► CHECKPOINT 2 ──► Step 3 (Crash!)
                                                                                │
   Resume from CHECKPOINT 2 ◄───────────────────────────────────────────────────┘
```

#### Checkpoint Payload Contents
- `run_id`: Parent run UUID reference.
- `step_number`: Monotonically increasing step counter.
- `run_state`: Snapshot of execution variables.
- `completed_steps`: Array of completed step summaries.
- `tool_outputs_hash`: Hash/pointer to recorded tool outputs.
- `context_ref`: Pointer to assembled context history.
- `created_at`: Timestamp.

*Large data payloads are stored out-of-band in object storage / DB references to keep checkpoints lightweight and fast to read.*

---

### 17. Retry System & Backoff Policy

Distinguishes between retryable transient failures and non-retryable fatal errors.

#### Error Classification
| Error Category | Examples | Retry Strategy |
| :--- | :--- | :--- |
| **Transient Network** | Socket timeout, connection reset | Immediate retry (up to 3x) |
| **Rate Limit / 429** | Provider quota exceeded | Exponential backoff with full jitter |
| **External Dependency** | Third-party service down | Scheduled delayed retry |
| **Fatal Application** | Invalid input, schema error, permission denied | No retry ➔ Immediate Failure |

#### Exponential Backoff Formula
$$t_{\text{wait}} = \min\left(t_{\text{max}},\, t_{\text{base}} \times 2^{\text{attempt}}\right) + \text{RandomJitter}()$$

---

### 18. Dead-Letter Queue (DLQ)

Jobs that exceed maximum retry thresholds are moved to a dedicated Dead-Letter Queue.

#### Operator Actions Available
- **Inspect**: Examine full stack trace, step parameters, and environment state.
- **Retry**: Re-enqueue job after fixing underlying issue or downstream service.
- **Cancel**: Mark run as permanently failed or cancelled.
- **Edit & Resume**: Adjust job parameters or injection state before re-running.

---

### 19. Tool Registry & Schema Versioning

Every tool in Aegis must be formally registered with strict input and output JSON schemas.

```json
{
  "id": "tool-inv-01",
  "name": "get_inventory",
  "version": "1.2.0",
  "description": "Retrieve current inventory levels for a specified product SKU",
  "input_schema": {
    "type": "object",
    "properties": {
      "sku": { "type": "string", "description": "Product SKU code" },
      "warehouse_id": { "type": "string", "description": "Optional warehouse filter" }
    },
    "required": ["sku"]
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "sku": { "type": "string" },
      "quantity_available": { "type": "integer" },
      "reserved": { "type": "integer" }
    }
  },
  "risk_level": "LOW",
  "requires_approval": false,
  "timeout_seconds": 15
}
```

---

### 20. Tool Permissions & Multi-Layer Authorization

Access to execute tools is evaluated against a strict multi-layered policy hierarchy:

```
Tenant Policy ──► Project Policy ──► Agent Policy ──► Tool Permission Check ──► Execution
```

- **Allowed**: Tool executes automatically.
- **Approval Required**: Step pauses and transitions run to `WAITING_FOR_APPROVAL`.
- **Prohibited**: Run halts with authorization error.

---

### 21. Sandboxed Tool Execution

For risky tools (code execution, custom script evaluation, shell commands), Aegis provides an isolated containerized execution environment.

#### Isolation Controls
- **Resource Constraints**: Hard limits on CPU (e.g., 0.5 vCPU) and RAM (e.g., 256MB).
- **Execution Timeout**: Hard kill after `timeout_seconds`.
- **Network Isolation**: Restricted outbound traffic; blocked access to internal cloud metadata endpoints.
- **Filesystem Isolation**: Ephemeral read-only root with temporary, non-persistent `/tmp` mount.
- **Process Isolation**: Unprivileged container user with dropped Linux capabilities.

---

### 22. Dynamic Context Assembly Engine

Context is managed as a finite resource constrained by model token limits.

```mermaid
flowchart LR
    A[Raw Context Inputs] --> B[Relevance Filtering]
    B --> C[Deduplication]
    C --> D[Priority Scoring]
    D --> E[Token Budgeting]
    E --> F[Final Assembled Context]
```

#### Selection Mechanics
- **Relevance Filtering**: Prunes historical interactions unrelated to current step objective.
- **Deduplication**: Removes repeated system instruction blocks or duplicate tool specs.
- **Token Budget Allocation**: Allocates fixed percentages to System Prompt, Memory, Active Window, and Tool Specs.
- **Truncation Tracking**: Records exactly what was omitted with diagnostic logs.

---

### 23. Human-in-the-Loop Approval Operations

When a tool or action triggers an approval requirement (e.g., financial refund over $500), execution halts safely.

```mermaid
sequenceDiagram
    participant Worker
    participant Orchestrator
    participant DB
    participant Human Operator

    Worker->>Orchestrator: Request Tool Execution (Refund $2,400)
    Orchestrator->>Orchestrator: Policy Check: Requires Approval
    Orchestrator->>DB: Update Run Status to WAITING_FOR_APPROVAL
    Orchestrator->>DB: Create Approval Record
    DB-->>Human Operator: Emit Notification / Dashboard Alert
    Human Operator->>Orchestrator: Approve / Reject (POST /v1/approvals/{id})
    Orchestrator->>DB: Record Decision & Audit Trail
    Orchestrator->>Worker: Enqueue Resume Job
    Worker->>Worker: Execute Tool & Resume Workflow
```

---

### 24. Event Architecture

Aegis emits immutable, structured audit events throughout the execution lifecycle.

```json
{
  "event_id": "evt-8921-bc",
  "event_type": "run.step.completed",
  "tenant_id": "ten-4410",
  "project_id": "proj-9901",
  "run_id": "run-0012",
  "timestamp": "2026-09-27T18:30:00.000Z",
  "data": {
    "step_number": 3,
    "tool_name": "get_inventory",
    "duration_ms": 142,
    "checkpoint_id": "chk-7712"
  }
}
```

---

### 25. Reliable Webhook Delivery System

External event notifications are dispatched through a reliable background delivery service.

#### Key Features
- **HMAC Signatures**: Every payload signed with standard SHA-256 HMAC headers.
- **Exponential Backoff**: Up to 5 retries over a 24-hour period.
- **Idempotency Headers**: Unique `X-Aegis-Delivery-ID` header on all dispatches.
- **Dead-Letter Handling**: Failed delivery attempts logged for operator inspection.

---

### 26. Scheduling Engine

Supports immediate, delayed, and recurring cron-style task dispatches.

- **Run Now**: Enqueued immediately for worker execution.
- **Run at Timestamp**: Scheduled in Redis sorted set until trigger time.
- **Recurring Schedule**: Cron expression managed by scheduler process which enqueues execution jobs.

*Schedulers only create run jobs; they never execute agent reasoning directly.*

---

### 27. Run Cancellation

Cancellation is handled gracefully to ensure side effects are cleanly concluded.

```
REQUESTED ──► COOPERATIVE STOP ──► CLEANUP ──► CANCELLED
```

If a tool is executing when cancellation is triggered, the worker sends cancellation signals to the underlying tool subprocess/http context before transitioning state.

---

### 28. Concurrency & Rate Limiting

Protects system resources and external API quotas using multi-tier concurrency limits.

#### Hierarchy Limits
- **Tenant Level**: Max 50 concurrent active runs.
- **Agent Level**: Max 10 concurrent runs per agent.
- **Tool Level**: Max 5 concurrent invocations for rate-sensitive APIs.
- **LLM Provider Level**: Max requests/minute limits enforced via token buckets.

---

### 29. Observability & Tracing

Provides deep insight into agent reasoning and infrastructure execution.

#### Core Metrics Emitted
- `aegis_runs_started_total` / `aegis_runs_completed_total` / `aegis_runs_failed_total`
- `aegis_run_duration_seconds` (Histogram)
- `aegis_queue_depth` / `aegis_queue_wait_time_seconds`
- `aegis_tool_execution_duration_seconds`
- `aegis_approval_pending_count`

#### Trace Correlation
Every log, metric, and event carries correlated trace IDs: `tenant_id`, `project_id`, `run_id`, `task_id`, `trace_id`.

---

### 30. Security Model

- **Authentication & Authorization**: Bearer API tokens with strict role-based scopes.
- **Tenant Isolation**: Row-level tenant isolation enforced on every SQL query (`tenant_id`).
- **Secret Management**: API keys and external integration tokens stored encrypted at rest.
- **SSRF Protections**: HTTP tool invocations validated against restricted internal IP ranges (`10.0.0.0/8`, `127.0.0.1`, etc.).
- **Strict Input Validation**: Pydantic validation on all incoming payload boundaries.

---

### 31. Database Schema Model

```sql
-- Database Schema for Aegis Runtime

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active_version_id UUID
);

CREATE TABLE agent_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    version INT NOT NULL,
    model_config JSONB NOT NULL,
    system_instructions TEXT NOT NULL,
    tool_bindings JSONB NOT NULL DEFAULT '[]',
    policies JSONB NOT NULL DEFAULT '{}',
    context_strategy JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(agent_id, version)
);

CREATE TABLE runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_version_id UUID NOT NULL REFERENCES agent_versions(id),
    status VARCHAR(50) NOT NULL,
    input JSONB NOT NULL,
    output JSONB,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    state_snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(run_id, step_number)
);

CREATE TABLE tool_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    tool_name VARCHAR(255) NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL,
    input JSONB NOT NULL,
    output JSONB,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    requested_action JSONB NOT NULL,
    decision_by VARCHAR(255),
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    run_id UUID REFERENCES runs(id),
    event_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 32. REST API Design

#### Agent Management
- `POST /v1/agents` - Register agent definition
- `GET /v1/agents` - List agents
- `GET /v1/agents/{id}` - Retrieve agent details
- `POST /v1/agents/{id}/versions` - Publish new immutable version

#### Run Management
- `POST /v1/agents/{id}/runs` - Submit new run execution
- `GET /v1/runs` - List runs with state/tenant filtering
- `GET /v1/runs/{id}` - Retrieve run status & output
- `POST /v1/runs/{id}/cancel` - Request run cancellation
- `POST /v1/runs/{id}/resume` - Resume paused or failed run
- `GET /v1/runs/{id}/events` - Stream run execution events (SSE)

#### Tool Registry
- `GET /v1/tools` - List registered tools
- `POST /v1/tools` - Register new tool schema definition

#### Human Approvals
- `GET /v1/approvals` - List pending approvals
- `POST /v1/approvals/{id}/approve` - Approve execution step
- `POST /v1/approvals/{id}/reject` - Reject execution step

---

### 33. End-to-End Execution Walkthrough

#### Scenario: SKU Out-of-Stock Investigation
1. **Run Submission**: Client submits run to investigate why `SKU-4812` is out of stock.
2. **Enqueue & Claim**: API enqueues run; Worker 1 claims job with 30-second lease.
3. **Reasoning Step 1**: Worker loads Agent Version, calls LLM; LLM requests `get_inventory`.
4. **Tool Execution 1**: Policy permits `get_inventory`. Tool returns quantity: 2 units.
5. **Checkpoint 1**: Checkpoint created (`step_number=1`).
6. **Reasoning Step 2**: Agent requests `get_sales_history`.
7. **Tool Execution 2**: Tool executes; returns spike in sales over last 48 hours.
8. **Checkpoint 2**: Checkpoint created (`step_number=2`).
9. **Reasoning Step 3**: Agent recommends reordering 500 units ($4,500 value) via `create_purchase_order`.
10. **Approval Gate**: Policy identifies PO value > $1,000 threshold. Run transitions to `WAITING_FOR_APPROVAL`.
11. **Human Decision**: Manager approves via API (`POST /v1/approvals/{id}/approve`).
12. **Resume & Order**: Worker executes `create_purchase_order` with idempotency key.
13. **Checkpoint 3**: Checkpoint created (`step_number=3`).
14. **Completion**: Webhook `run.completed` dispatched. Final output delivered.

---

### 34. Failure Verification Scenarios

| Failure Scenario | Test Setup | Expected System Behavior |
| :--- | :--- | :--- |
| **Worker Crash** | `kill -9` worker process mid-execution. | Lease expires after TTL; backup worker re-claims job, restores state from last checkpoint, avoids duplicate side effects via idempotency key. |
| **Database Outage** | Temporarily isolate PostgreSQL network interface. | Workers pause gracefully, enter retry state with backoff, auto-reconnect without state corruption once DB is restored. |
| **LLM Provider Timeout** | Mock LLM provider with 30-second delay. | Timeout caught; exponential backoff retry triggered; fallback provider invoked if configured by policy. |
| **Webhook Destination Down** | Direct webhooks to endpoint returning HTTP 503. | Delivery engine retries with backoff up to limit; event moves to DLQ for manual inspection. |

---

### 35. Automated Testing Strategy

```
                          ┌─────────────┐
                          │ Load Tests  │
                          └──────┬──────┘
                                 │
                          ┌──────┴──────┐
                          │ Failure E2E │
                          └──────┬──────┘
                                 │
                          ┌──────┴──────┐
                          │ Integration │
                          └──────┬──────┘
                                 │
                          ┌──────┴──────┐
                          │ Unit Tests  │
                          └─────────────┘
```

- **Unit Tests**: State transitions, retry backoff calculations, context budget truncation, tool schema validation.
- **Integration Tests**: Database query operations, Redis queue push/pop, worker lease expiration, Alembic migrations.
- **Failure Tests**: Worker SIGKILL simulation, network partition injection, DB outage recovery.
- **Load Tests**: Concurrent run capacity, queue depth latency, worker throughput limits.

---

### 36. MVP Scope Definition

#### In Scope for MVP
- Agent registration & versioning API.
- Run submission & status tracking API.
- PostgreSQL database persistence & Alembic migrations.
- Redis-backed worker queue with lease management.
- Basic state machine (`QUEUED`, `RUNNING`, `CHECKPOINT`, `COMPLETED`, `FAILED`).
- Step checkpointing & basic retry mechanics.
- Tool registry with input schema validation.
- Standard tool execution engine.
- Structured JSON log emission.
- Docker Compose setup for local orchestration.
- Automated unit and integration test suite.

#### Deferred to Post-MVP
- Advanced multi-tenant billing/quota isolation.
- Containerized code execution sandbox.
- Complex cron scheduling daemon.
- Webhook subscription delivery engine.
- Interactive admin dashboard UI.

---

### 37. Multi-Phase Implementation Roadmap

```mermaid
gantt
    title Aegis Development Phases
    dateFormat  YYYY-MM-DD
    section Phase 0-2
    Phase 0 Architecture & Schema    :p0, 2026-10-01, 7d
    Phase 1 Durable Run State Engine  :p1, after p0, 10d
    Phase 2 Lease Recovery & Checkpoint:p2, after p1, 10d
    section Phase 3-5
    Phase 3 Tool Execution Engine    :p3, after p2, 8d
    Phase 4 LLM Integration & Context :p4, after p3, 10d
    Phase 5 Human Approval & Pause    :p5, after p4, 8d
    section Phase 6-8
    Phase 6 Event Bus & Webhooks     :p6, after p5, 8d
    Phase 7 Security & Sandboxing    :p7, after p6, 10d
    Phase 8 Observability & Hardening:p8, after p7, 10d
```

---

### 38. Definition of Done (Portfolio Grade)

Aegis is considered complete and portfolio-ready when:
1. Full source code is published with clean architecture separation in GitHub.
2. Complete test suite passes with high test coverage across unit, integration, and failure cases.
3. Live demonstration available showing a multi-step agent run executing tools.
4. Recorded demonstration of **Worker Crash Recovery**: Worker killed mid-run, automatically recovered by secondary worker from safe checkpoint without duplicate side effects.
5. Interactive human approval gate demonstrated.
6. Public technical write-up detailing architecture, benchmarks, and engineering rationale published on **arslanrehmani.com**.

---

### 39. Portfolio Case Study Presentation Framework

The case study headline:
> **Aegis: A Durable Execution Runtime for Production AI Agents**

#### Core Narrative
"Most AI agent demos fail in production because LLMs are not execution engines. Aegis turns fragile request/response loops into recoverable, stateful, policy-controlled business workflows."

#### Proof-of-Engineering Highlight
Demonstrate a live terminal split-screen:
- **Left Window**: Agent processing step 7 of an order update workflow.
- **Action**: Force kill the worker (`kill -9 PID`).
- **Right Window**: Aegis lease monitor detects worker loss, reclaims lease, resumes execution from Checkpoint 6, verifies idempotency key for committed side-effect, and completes the run cleanly.

---

### 40. Future Extensions

- Distributed Kubernetes worker scaling operator.
- Multi-agent communication and orchestration protocol.
- Model Context Protocol (MCP) tool standard support.
- Workflow DAG definition language.
- Deterministic workflow replay engine.

---

### 41. Success Criteria

Aegis succeeds when it conclusively proves:
> **Reliable autonomous AI agent execution is a distributed systems infrastructure problem—and Arslan engineered the infrastructure to solve it.**

---

### 42. Immediate First Build Order

```
 1. Repository Init ──► 2. Docker Compose ──► 3. PostgreSQL & Redis setup
                                                         │
 6. SQLAlchemy ◄────── 5. FastAPI Skeleton ◄────── 4. Pyproject Dependencies
       │
       ▼
 7. Alembic Migrations ──► 8. Core Domain Models ──► 9. Run State Machine
                                                                │
12. Lease & Heartbeat ◄─── 11. Async Worker ◄────── 10. Redis Queue Producer
       │
       ▼
13. Checkpoint Engine ──► 14. Retry & Backoff ──► 15. Idempotency Manager
                                                                │
18. Context Engine ◄────── 17. LLM Executor ◄────── 16. Tool Registry
       │
       ▼
19. Event Bus ──► 20. Observability Suite
```

---

# Part II: Codebase Implementation & Architecture Guide

### 1. Repository Layout & Component Architecture

```
aegis/
├── AEGIS.md                 # THIS FILE - Unified Master Specification & Implementation Blueprint
├── README.md                # Entry point referencing AEGIS.md
├── pyproject.toml           # Package metadata, dependencies, & pytest settings
├── docker-compose.yml       # Local orchestration for Postgres 16, Redis 7, API, & Worker
├── packages/
│   ├── domain/              # Enums (RunStatus, ToolRiskLevel) & Pydantic Domain Models
│   ├── storage/             # Async SQLAlchemy engine, ORM db_models, & Redis queue client
│   ├── orchestration/       # RunStateMachine, LeaseManager, CheckpointEngine, IdempotencyManager
│   ├── policies/            # RetryPolicy (Exponential backoff + jitter) & AuthorizationEngine
│   ├── tools/               # ToolRegistry schema validator & ToolExecutor engine
│   ├── context/             # Dynamic ContextAssembler with token budgeting
│   ├── events/              # Audit EventBus & HMAC-SHA256 Signed WebhookDispatcher
│   └── observability/       # Structlog JSON logger & Prometheus Metrics
├── apps/
│   ├── api/                 # FastAPI REST API Gateway & Routers (agents, runs, tools, approvals)
│   └── worker/              # Background Worker Loop, lease heartbeats, & execution handler
├── infra/
│   └── docker/              # Dockerfiles for API and Worker containers
├── scripts/
│   └── seed.py              # Seeding script for demo tenant, project, agent, and version
└── tests/
    ├── unit/                # State machine, retry policy, and idempotency key tests
    └── integration/         # API gateway integration tests
```

---

### 2. Domain Layer Package (`packages/domain`)

- **`enums.py`**: Defines standard status codes and types:
  - `RunStatus`: `QUEUED`, `RUNNING`, `WAITING_FOR_TOOL`, `WAITING_FOR_APPROVAL`, `PAUSED`, `RETRYING`, `COMPLETED`, `FAILED`, `CANCELLED`, `TIMED_OUT`.
  - `ToolRiskLevel`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
  - `ApprovalStatus`: `PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`.
  - `EventType`: Audit event names like `run.created`, `step.completed`, `approval.requested`.
- **`models.py`**: Pydantic v2 schemas for `Tenant`, `Project`, `Agent`, `AgentVersion`, `Run`, `Checkpoint`, `ToolDefinition`, `ToolExecution`, `Approval`, and `Event`.

---

### 3. Storage & Database Layer Package (`packages/storage`)

- **`config.py`**: Pydantic BaseSettings loading `DATABASE_URL`, `REDIS_URL`, `DEFAULT_LEASE_TTL_SECONDS`, and secrets.
- **`database.py`**: Configures async SQLAlchemy engine (`postgresql+asyncpg`), `AsyncSessionLocal` sessionmaker, and `get_db()` dependency generator.
- **`db_models.py`**: SQLAlchemy ORM mapped classes (`TenantModel`, `ProjectModel`, `AgentModel`, `AgentVersionModel`, `RunModel`, `CheckpointModel`, `ToolExecutionModel`, `ApprovalModel`, `EventModel`).
- **`redis_client.py`**: Async Redis queue interface for pushing (`enqueue_run_job`) and popping (`pop_run_job`) execution tasks from `aegis:run_queue`.

---

### 4. Orchestration Engine Package (`packages/orchestration`)

- **`state_machine.py`**: Enforces strict state transitions via `RunStateMachine.transition_to()`. Raises `InvalidStateTransitionError` if illegal state transitions are attempted.
- **`lease_manager.py`**: Manages Redis-backed worker leases (`aegis:lease:run:{id}`). Implements atomic acquisition (`acquire_lease`), heartbeat renewals (`heartbeat_lease`), and release (`release_lease`).
- **`checkpoint_engine.py`**: Implements `CheckpointEngine.create_checkpoint()` and `get_latest_checkpoint()` to allow workers to recover execution state after process crashes.
- **`idempotency_manager.py`**: Computes SHA-256 idempotency keys from `(run_id, step_id, payload)` and records side-effects in `tool_executions` to prevent duplicate execution during retries.

---

### 5. Policies & Authorization Package (`packages/policies`)

- **`retry_policy.py`**: `RetryPolicy` calculates exponential backoff with full random jitter:
  $$t_{\text{wait}} = \text{RandomUniform}\left(0,\, \min(t_{\text{max}}, t_{\text{base}} \times 2^{\text{attempt}-1})\right)$$
- **`authorization.py`**: `AuthorizationEngine` evaluates tool bindings and risk thresholds to determine if a tool call is allowed, prohibited, or requires human sign-off.

---

### 6. Tool Registry & Execution Package (`packages/tools`)

- **`registry.py`**: `ToolRegistry` stores tool definitions with input/output JSON schemas. Includes built-in tools (`get_inventory`, `create_purchase_order`).
- **`executor.py`**: `ToolExecutor.execute_tool()` validates inputs and executes tool logic asynchronously.

---

### 7. Context Assembly Package (`packages/context`)

- **`assembler.py`**: `ContextAssembler` builds token-budgeted prompt context windows, enforcing relevance filtering, deduplication, and truncation tracking.

---

### 8. Event & Webhook Bus Package (`packages/events`)

- **`bus.py`**: `EventBus.publish_event()` saves structured events to PostgreSQL and broadcasts live updates over Redis PubSub channels (`aegis:events:{tenant_id}`).
- **`webhooks.py`**: `WebhookDispatcher` sends async HTTP POST payloads with HMAC-SHA256 signatures (`X-Aegis-Signature`) and delivery correlation IDs (`X-Aegis-Delivery-ID`).

---

### 9. Observability Suite Package (`packages/observability`)

- **`logger.py`**: Configures `structlog` for structured JSON log output with ISO timestamps and stack traces.
- **`metrics.py`**: Defines Prometheus counters (`aegis_runs_started_total`, `aegis_runs_completed_total`), histograms (`aegis_run_duration_seconds`), and gauges (`aegis_queue_depth`, `aegis_active_worker_leases`).

---

### 10. API Gateway Application (`apps/api`)

- **`main.py`**: Initializes FastAPI, runs database schema migrations (`Base.metadata.create_all`), mounts `/metrics`, and includes API routers.
- **Routers**:
  - `agents.py`: `POST /v1/agents`, `GET /v1/agents`, `POST /v1/agents/{id}/versions`.
  - `runs.py`: `POST /v1/agents/{id}/runs`, `GET /v1/runs`, `GET /v1/runs/{id}`, `POST /v1/runs/{id}/cancel`, `POST /v1/runs/{id}/resume`.
  - `tools.py`: `GET /v1/tools`, `POST /v1/tools`.
  - `approvals.py`: `GET /v1/approvals`, `POST /v1/approvals/{id}/approve`, `POST /v1/approvals/{id}/reject`.

---

### 11. Async Worker Runtime Application (`apps/worker`)

- **`main.py`**: Implements `AgentWorker` loop:
  1. Pops queued run jobs from Redis.
  2. Claims worker lease in Redis with TTL.
  3. Restores execution from the latest checkpoint (`CheckpointEngine`).
  4. Checks idempotency keys before invoking tools (`IdempotencyManager`).
  5. Pauses execution and creates `ApprovalModel` if human approval is required (`AuthorizationEngine`).
  6. Heartbeats worker lease during step execution.
  7. Updates run status to `COMPLETED` or `FAILED` and releases lease.

---

### 12. Container Infrastructure & Tooling

- **`docker-compose.yml`**: Spins up PostgreSQL 16, Redis 7, Aegis API, and Aegis Worker services.
- **`pyproject.toml`**: Configures dependencies (`fastapi`, `sqlalchemy`, `redis`, `asyncpg`, `structlog`, `prometheus-client`, `pyjwt`) and pytest runner.
- **`scripts/seed.py`**: Seed script populating demo enterprise tenant, project, agent, and active version.

---

### 13. Test Suite Verification

Run all unit and integration tests using pytest:

```bash
.venv/bin/pytest tests/unit tests/integration
```

All 9 automated test suites pass cleanly:
- `test_state_machine.py`: State transition rules & invalid transition blocks.
- `test_retry_policy.py`: Backoff math & max retry conditions.
- `test_idempotency.py`: SHA-256 key generation determinism & uniqueness.
- `test_api_endpoints.py`: `/health` and `/v1/tools` gateway endpoint verification.
