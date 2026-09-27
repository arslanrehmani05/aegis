from typing import Set
from packages.domain.enums import RunStatus

VALID_TRANSITIONS = {
    RunStatus.QUEUED: {RunStatus.RUNNING, RunStatus.CANCELLED},
    RunStatus.RUNNING: {
        RunStatus.WAITING_FOR_TOOL,
        RunStatus.WAITING_FOR_APPROVAL,
        RunStatus.PAUSED,
        RunStatus.RETRYING,
        RunStatus.COMPLETED,
        RunStatus.FAILED,
        RunStatus.CANCELLED,
        RunStatus.TIMED_OUT,
    },
    RunStatus.WAITING_FOR_TOOL: {
        RunStatus.RUNNING,
        RunStatus.FAILED,
        RunStatus.CANCELLED,
        RunStatus.RETRYING,
    },
    RunStatus.WAITING_FOR_APPROVAL: {
        RunStatus.RUNNING,
        RunStatus.FAILED,
        RunStatus.CANCELLED,
    },
    RunStatus.PAUSED: {
        RunStatus.RUNNING,
        RunStatus.CANCELLED,
    },
    RunStatus.RETRYING: {
        RunStatus.QUEUED,
        RunStatus.RUNNING,
        RunStatus.FAILED,
        RunStatus.CANCELLED,
    },
    RunStatus.COMPLETED: set(),
    RunStatus.FAILED: {RunStatus.QUEUED},  # Operator manual retry
    RunStatus.CANCELLED: set(),
    RunStatus.TIMED_OUT: {RunStatus.QUEUED},  # Operator retry
}

class InvalidStateTransitionError(Exception):
    def __init__(self, current_status: RunStatus, target_status: RunStatus):
        super().__init__(
            f"Invalid status transition from {current_status.value} to {target_status.value}"
        )
        self.current_status = current_status
        self.target_status = target_status

class RunStateMachine:
    def __init__(self, initial_status: RunStatus = RunStatus.QUEUED):
        self.current_status = initial_status

    def can_transition_to(self, target_status: RunStatus) -> bool:
        allowed: Set[RunStatus] = VALID_TRANSITIONS.get(self.current_status, set())
        return target_status in allowed

    def transition_to(self, target_status: RunStatus) -> RunStatus:
        if not self.can_transition_to(target_status):
            raise InvalidStateTransitionError(self.current_status, target_status)
        self.current_status = target_status
        return self.current_status
