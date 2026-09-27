from prometheus_client import Counter, Histogram, Gauge

RUNS_STARTED = Counter("aegis_runs_started_total", "Total number of agent runs started", ["tenant_id"])
RUNS_COMPLETED = Counter("aegis_runs_completed_total", "Total number of agent runs completed", ["tenant_id"])
RUNS_FAILED = Counter("aegis_runs_failed_total", "Total number of agent runs failed", ["tenant_id", "reason"])

RUN_DURATION = Histogram(
    "aegis_run_duration_seconds",
    "Agent run total duration in seconds",
    ["tenant_id"],
    buckets=(1.0, 5.0, 15.0, 30.0, 60.0, 120.0, 300.0, 600.0),
)

TOOL_EXECUTION_DURATION = Histogram(
    "aegis_tool_execution_duration_seconds",
    "Tool execution duration in seconds",
    ["tool_name"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0),
)

QUEUE_DEPTH = Gauge("aegis_queue_depth", "Current number of queued jobs in Redis")
PENDING_APPROVALS = Gauge("aegis_pending_approvals_total", "Current number of pending human approvals")
WORKER_LEASE_COUNT = Gauge("aegis_active_worker_leases", "Number of currently active worker leases")
