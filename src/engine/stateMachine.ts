import { RunStatus } from '../types/domain';

export const VALID_TRANSITIONS: Record<RunStatus, Set<RunStatus>> = {
  [RunStatus.QUEUED]: new Set([RunStatus.RUNNING, RunStatus.CANCELLED]),
  [RunStatus.RUNNING]: new Set([
    RunStatus.WAITING_FOR_TOOL,
    RunStatus.WAITING_FOR_APPROVAL,
    RunStatus.PAUSED,
    RunStatus.RETRYING,
    RunStatus.COMPLETED,
    RunStatus.FAILED,
    RunStatus.CANCELLED,
    RunStatus.TIMED_OUT,
  ]),
  [RunStatus.WAITING_FOR_TOOL]: new Set([
    RunStatus.RUNNING,
    RunStatus.FAILED,
    RunStatus.CANCELLED,
    RunStatus.RETRYING,
  ]),
  [RunStatus.WAITING_FOR_APPROVAL]: new Set([
    RunStatus.RUNNING,
    RunStatus.FAILED,
    RunStatus.CANCELLED,
  ]),
  [RunStatus.PAUSED]: new Set([
    RunStatus.RUNNING,
    RunStatus.CANCELLED,
  ]),
  [RunStatus.RETRYING]: new Set([
    RunStatus.QUEUED,
    RunStatus.RUNNING,
    RunStatus.FAILED,
    RunStatus.CANCELLED,
  ]),
  [RunStatus.COMPLETED]: new Set(),
  [RunStatus.FAILED]: new Set([RunStatus.QUEUED]), // Operator manual retry
  [RunStatus.CANCELLED]: new Set(),
  [RunStatus.TIMED_OUT]: new Set([RunStatus.QUEUED]), // Operator retry
};

export class InvalidStateTransitionError extends Error {
  currentStatus: RunStatus;
  targetStatus: RunStatus;

  constructor(currentStatus: RunStatus, targetStatus: RunStatus) {
    super(`Invalid status transition from ${currentStatus} to ${targetStatus}`);
    this.name = 'InvalidStateTransitionError';
    this.currentStatus = currentStatus;
    this.targetStatus = targetStatus;
  }
}

export class RunStateMachine {
  currentStatus: RunStatus;

  constructor(initialStatus: RunStatus = RunStatus.QUEUED) {
    this.currentStatus = initialStatus;
  }

  canTransitionTo(targetStatus: RunStatus): boolean {
    const allowed = VALID_TRANSITIONS[this.currentStatus] || new Set();
    return allowed.has(targetStatus);
  }

  transitionTo(targetStatus: RunStatus): RunStatus {
    if (!this.canTransitionTo(targetStatus)) {
      throw new InvalidStateTransitionError(this.currentStatus, targetStatus);
    }
    this.currentStatus = targetStatus;
    return this.currentStatus;
  }
}
