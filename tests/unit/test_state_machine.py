import pytest
from packages.domain.enums import RunStatus
from packages.orchestration.state_machine import RunStateMachine, InvalidStateTransitionError

def test_valid_transitions():
    sm = RunStateMachine(RunStatus.QUEUED)
    assert sm.can_transition_to(RunStatus.RUNNING)
    assert sm.transition_to(RunStatus.RUNNING) == RunStatus.RUNNING

    assert sm.can_transition_to(RunStatus.WAITING_FOR_TOOL)
    assert sm.transition_to(RunStatus.WAITING_FOR_TOOL) == RunStatus.WAITING_FOR_TOOL

    assert sm.can_transition_to(RunStatus.RUNNING)
    assert sm.transition_to(RunStatus.RUNNING) == RunStatus.RUNNING

    assert sm.can_transition_to(RunStatus.COMPLETED)
    assert sm.transition_to(RunStatus.COMPLETED) == RunStatus.COMPLETED

def test_invalid_transitions():
    sm = RunStateMachine(RunStatus.COMPLETED)
    assert not sm.can_transition_to(RunStatus.RUNNING)
    with pytest.raises(InvalidStateTransitionError):
        sm.transition_to(RunStatus.RUNNING)

def test_approval_transition_flow():
    sm = RunStateMachine(RunStatus.RUNNING)
    assert sm.transition_to(RunStatus.WAITING_FOR_APPROVAL) == RunStatus.WAITING_FOR_APPROVAL
    assert sm.transition_to(RunStatus.RUNNING) == RunStatus.RUNNING
