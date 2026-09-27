# Aegis: Production-Grade Durable AI Agent Runtime

> **Core Philosophy:** A language model is not an execution engine.

Aegis is a production-oriented, durable AI agent runtime designed to execute long-running, multi-step AI tasks reliably. It provides the missing execution layer that transforms fragile LLM request/response loops into recoverable, stateful, policy-controlled business workflows.

---

## Technical Documentation & Master Specification

The complete, single master architecture and technical documentation for Aegis is available in **[Aegis Master File.md](file:///Users/arslanrehmani/My%20Code%20Files/aegis-main/Aegis%20Master%20File.md)**.

### Master Document Contents
- **Part I**: The complete 42-section technical specification (Executive Summary, Goals, Conceptual ERD, State Machine Lifecycle, Distributed Queue Design, Worker Lease Protocol, Idempotency Architecture, Checkpointing Engine, Security Parameters, SQL Schemas, API Endpoints, Test Strategies, and Roadmap).
- **Part II**: The full codebase architecture and implementation reference detailing every module, package, data model, API router, worker runtime loop, and container environment.

---

## High-Level Architecture

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

## Quick Reference

- Unified Master Document: **[Aegis Master File.md](file:///Users/arslanrehmani/My%20Code%20Files/aegis-main/Aegis%20Master%20File.md)**
- Target Tech Stack: Python 3.12+, FastAPI, Pydantic v2, PostgreSQL 16+, Redis 7+, SQLAlchemy 2.0, Docker
