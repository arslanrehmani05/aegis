# Aegis: Production-Grade Durable AI Agent Runtime (React)

> **Core Philosophy:** A language model is not an execution engine.

Aegis is a production-oriented, durable AI agent runtime designed to execute long-running, multi-step AI tasks reliably. It provides the execution layer that transforms fragile LLM request/response loops into recoverable, stateful, policy-controlled business workflows.

This repository is rewritten as an interactive React application running on Vite with TypeScript and Tailwind CSS, preserving all core features and business logic from the original Aegis architecture.

---

## Ported Core Features & Subsystems

1. **Deterministic Finite State Machine (FSM)**:
   - Enforces strict lifecycle transitions: `QUEUED` &rarr; `RUNNING` &rarr; `WAITING_FOR_TOOL` / `WAITING_FOR_APPROVAL` &rarr; `PAUSED` / `RETRYING` / `COMPLETED` / `FAILED` / `CANCELLED` / `TIMED_OUT`.
   - Prevents invalid state jumps via `RunStateMachine` and throws `InvalidStateTransitionError`.

2. **Distributed Worker Lease Protocol**:
   - Mutual exclusion for job consumption.
   - Heartbeats and TTL expiration prevention to avoid split-brain execution across workers.

3. **Deterministic Idempotency Engine**:
   - Generates SHA-256 idempotency keys (`run_id:step_id:canonical_payload`).
   - Caches completed tool executions, guaranteeing that replaying or retrying steps never produces duplicated external side effects.

4. **Durable Checkpointing & Step Snapshots**:
   - Checkpoints recorded after every step with state snapshots.
   - Time-travel inspection and seamless crash-recovery from the latest checkpoint.

5. **Human-in-the-Loop Governance & Approval Gate**:
   - Automated risk evaluation (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
   - Policy threshold enforcement (e.g. actions over $1,000 require manual authorization).
   - Dedicated Approvals Inbox with operator authorize and reject workflows.

6. **Tool Registry & Policy Sandbox**:
   - Pre-configured enterprise tools (`get_inventory`, `create_purchase_order`, `send_slack_alert`, `query_database_record`, `cancel_open_order`).
   - Interactive policy authorization evaluator and retry policy simulator (exponential backoff with full jitter).

7. **Event Bus & Real-time Audit Stream**:
   - Structured audit events (`run.created`, `step.started`, `tool.completed`, `approval.requested`, `checkpoint.created`, `run.completed`).
   - Filterable stream with JSON export.

8. **Interactive In-Browser Test Suite**:
   - Executable test runner mirroring `test_state_machine.py`, `test_idempotency.py`, and `test_retry_policy.py`.

---

## Development & Build

```bash
# Start development server on port 3000
npm run dev

# Build production bundle
npm run build
```
