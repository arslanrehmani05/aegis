import React, { useState } from 'react';
import {
  FlaskConical,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { RunStatus } from '../types/domain';
import { RunStateMachine, InvalidStateTransitionError } from '../engine/stateMachine';
import { IdempotencyManager } from '../engine/idempotency';
import { RetryPolicy } from '../engine/retryPolicy';
import { runtimeStore } from '../engine/runtimeStore';

interface TestCaseResult {
  id: string;
  suite: string;
  name: string;
  passed: boolean;
  durationMs: number;
  assertionLog: string[];
  error?: string;
}

export const TestSuiteView: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestCaseResult[]>([]);

  const runAllTests = async () => {
    setIsRunning(true);
    const testResults: TestCaseResult[] = [];

    // 1. test_valid_transitions (mirroring tests/unit/test_state_machine.py)
    {
      const start = performance.now();
      const logs: string[] = [];
      let passed = true;
      let error: string | undefined;

      try {
        const sm = new RunStateMachine(RunStatus.QUEUED);
        logs.push('Initialized RunStateMachine with QUEUED');

        if (!sm.canTransitionTo(RunStatus.RUNNING)) throw new Error('Cannot transition to RUNNING');
        sm.transitionTo(RunStatus.RUNNING);
        logs.push('Transitioned QUEUED -> RUNNING: OK');

        if (!sm.canTransitionTo(RunStatus.WAITING_FOR_TOOL)) throw new Error('Cannot transition to WAITING_FOR_TOOL');
        sm.transitionTo(RunStatus.WAITING_FOR_TOOL);
        logs.push('Transitioned RUNNING -> WAITING_FOR_TOOL: OK');

        if (!sm.canTransitionTo(RunStatus.RUNNING)) throw new Error('Cannot transition back to RUNNING');
        sm.transitionTo(RunStatus.RUNNING);
        logs.push('Transitioned WAITING_FOR_TOOL -> RUNNING: OK');

        if (!sm.canTransitionTo(RunStatus.COMPLETED)) throw new Error('Cannot transition to COMPLETED');
        sm.transitionTo(RunStatus.COMPLETED);
        logs.push('Transitioned RUNNING -> COMPLETED: OK');
      } catch (err: any) {
        passed = false;
        error = err.message;
      }

      testResults.push({
        id: 'test_valid_transitions',
        suite: 'RunStateMachine',
        name: 'test_valid_transitions (QUEUED -> RUNNING -> WAITING_FOR_TOOL -> RUNNING -> COMPLETED)',
        passed,
        durationMs: Math.round(performance.now() - start),
        assertionLog: logs,
        error,
      });
    }

    // 2. test_invalid_transitions
    {
      const start = performance.now();
      const logs: string[] = [];
      let passed = true;
      let error: string | undefined;

      try {
        const sm = new RunStateMachine(RunStatus.COMPLETED);
        logs.push('Initialized RunStateMachine in COMPLETED state');

        if (sm.canTransitionTo(RunStatus.RUNNING)) {
          throw new Error('canTransitionTo(RUNNING) should be false from COMPLETED');
        }
        logs.push('canTransitionTo(RUNNING) correctly returned FALSE');

        let threw = false;
        try {
          sm.transitionTo(RunStatus.RUNNING);
        } catch (e: any) {
          if (e instanceof InvalidStateTransitionError || e.name === 'InvalidStateTransitionError') {
            threw = true;
            logs.push(`Properly raised InvalidStateTransitionError: "${e.message}"`);
          }
        }
        if (!threw) {
          throw new Error('Did not raise InvalidStateTransitionError on prohibited transition!');
        }
      } catch (err: any) {
        passed = false;
        error = err.message;
      }

      testResults.push({
        id: 'test_invalid_transitions',
        suite: 'RunStateMachine',
        name: 'test_invalid_transitions (Terminal COMPLETED rejects unauthorized jumps)',
        passed,
        durationMs: Math.round(performance.now() - start),
        assertionLog: logs,
        error,
      });
    }

    // 3. test_approval_transition_flow
    {
      const start = performance.now();
      const logs: string[] = [];
      let passed = true;
      let error: string | undefined;

      try {
        const sm = new RunStateMachine(RunStatus.RUNNING);
        logs.push('Initialized RunStateMachine in RUNNING');

        sm.transitionTo(RunStatus.WAITING_FOR_APPROVAL);
        logs.push('Transitioned to WAITING_FOR_APPROVAL: OK');

        sm.transitionTo(RunStatus.RUNNING);
        logs.push('Transitioned back to RUNNING upon operator approval: OK');
      } catch (err: any) {
        passed = false;
        error = err.message;
      }

      testResults.push({
        id: 'test_approval_transition_flow',
        suite: 'RunStateMachine',
        name: 'test_approval_transition_flow (RUNNING -> WAITING_FOR_APPROVAL -> RUNNING)',
        passed,
        durationMs: Math.round(performance.now() - start),
        assertionLog: logs,
        error,
      });
    }

    // 4. test_idempotency_key_generation_deterministic (mirroring tests/unit/test_idempotency.py)
    {
      const start = performance.now();
      const logs: string[] = [];
      let passed = true;
      let error: string | undefined;

      try {
        const runId = 'test-run-uuid-001';
        const stepId = 'step_1';
        const payload = { sku: 'SKU-4812', amount: 100 };

        const key1 = IdempotencyManager.generateKey(runId, stepId, payload);
        const key2 = IdempotencyManager.generateKey(runId, stepId, payload);

        logs.push(`Key 1: ${key1}`);
        logs.push(`Key 2: ${key2}`);

        if (key1 !== key2) throw new Error('Idempotency keys are not identical for identical payload');
        logs.push('Deterministic match verified (key1 === key2)');

        if (key1.length !== 64) throw new Error(`Expected 64 char hex SHA-256, got length ${key1.length}`);
        logs.push('SHA-256 hex length verified (64 characters)');
      } catch (err: any) {
        passed = false;
        error = err.message;
      }

      testResults.push({
        id: 'test_idempotency_key_generation_deterministic',
        suite: 'IdempotencyEngine',
        name: 'test_idempotency_key_generation_deterministic (SHA-256 canonical hashing)',
        passed,
        durationMs: Math.round(performance.now() - start),
        assertionLog: logs,
        error,
      });
    }

    // 5. test_idempotency_key_uniqueness
    {
      const start = performance.now();
      const logs: string[] = [];
      let passed = true;
      let error: string | undefined;

      try {
        const runId = 'test-run-uuid-002';
        const key1 = IdempotencyManager.generateKey(runId, 'step_1', { sku: 'A' });
        const key2 = IdempotencyManager.generateKey(runId, 'step_1', { sku: 'B' });

        logs.push(`Key A: ${key1.slice(0, 16)}...`);
        logs.push(`Key B: ${key2.slice(0, 16)}...`);

        if (key1 === key2) throw new Error('Idempotency keys collision for differing payloads');
        logs.push('Collision freedom verified (key1 !== key2)');
      } catch (err: any) {
        passed = false;
        error = err.message;
      }

      testResults.push({
        id: 'test_idempotency_key_uniqueness',
        suite: 'IdempotencyEngine',
        name: 'test_idempotency_key_uniqueness (Differing payloads generate unique keys)',
        passed,
        durationMs: Math.round(performance.now() - start),
        assertionLog: logs,
        error,
      });
    }

    // 6. test_retry_policy_delay_calculation (mirroring tests/unit/test_retry_policy.py)
    {
      const start = performance.now();
      const logs: string[] = [];
      let passed = true;
      let error: string | undefined;

      try {
        const policy = new RetryPolicy(3, 1.0, 10.0, false);
        logs.push('Initialized RetryPolicy(max_attempts=3, base=1.0s, max=10.0s, jitter=False)');

        const d0 = policy.calculateDelay(0);
        const d1 = policy.calculateDelay(1);
        const d2 = policy.calculateDelay(2);
        const d3 = policy.calculateDelay(3);

        logs.push(`Attempt 0: ${d0}s (Expected 0.0)`);
        logs.push(`Attempt 1: ${d1}s (Expected 1.0)`);
        logs.push(`Attempt 2: ${d2}s (Expected 2.0)`);
        logs.push(`Attempt 3: ${d3}s (Expected 4.0)`);

        if (d0 !== 0.0) throw new Error(`d0 expected 0.0, got ${d0}`);
        if (d1 !== 1.0) throw new Error(`d1 expected 1.0, got ${d1}`);
        if (d2 !== 2.0) throw new Error(`d2 expected 2.0, got ${d2}`);
        if (d3 !== 4.0) throw new Error(`d3 expected 4.0, got ${d3}`);
      } catch (err: any) {
        passed = false;
        error = err.message;
      }

      testResults.push({
        id: 'test_retry_policy_delay_calculation',
        suite: 'RetryPolicy',
        name: 'test_retry_policy_delay_calculation (Exponential backoff 1s, 2s, 4s)',
        passed,
        durationMs: Math.round(performance.now() - start),
        assertionLog: logs,
        error,
      });
    }

    // 7. test_should_retry_transient_error
    {
      const start = performance.now();
      const logs: string[] = [];
      let passed = true;
      let error: string | undefined;

      try {
        const policy = new RetryPolicy(3);
        const r1 = policy.shouldRetry(1, true);
        const r2 = policy.shouldRetry(2, true);
        const r3 = policy.shouldRetry(3, true);
        const rNonTransient = policy.shouldRetry(1, false);

        logs.push(`Attempt 1 (transient): ${r1} (Expected true)`);
        logs.push(`Attempt 2 (transient): ${r2} (Expected true)`);
        logs.push(`Attempt 3 (transient): ${r3} (Expected false - max attempts exhausted)`);
        logs.push(`Attempt 1 (permanent error): ${rNonTransient} (Expected false - do not retry)`);

        if (!r1 || !r2 || r3 || rNonTransient) {
          throw new Error('shouldRetry logic failed expectation bounds');
        }
      } catch (err: any) {
        passed = false;
        error = err.message;
      }

      testResults.push({
        id: 'test_should_retry_transient_error',
        suite: 'RetryPolicy',
        name: 'test_should_retry_transient_error (Transient retry ceiling & permanent error abort)',
        passed,
        durationMs: Math.round(performance.now() - start),
        assertionLog: logs,
        error,
      });
    }

    setResults(testResults);
    setIsRunning(false);
  };

  const totalPassed = results.filter((r) => r.passed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-indigo-400" />
            <span>Aegis Core Test Suite Runner</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Executes unit and integration test suites in-memory verifying state transitions, SHA-256 idempotency, and retry backoff.
          </p>
        </div>

        <button
          onClick={runAllTests}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
        >
          {isRunning ? (
            <RotateCcw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span>{isRunning ? 'Executing Test Harness...' : 'Run All Tests'}</span>
        </button>
      </div>

      {/* Summary Scorecard */}
      {results.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full ${
                totalPassed === results.length ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            ></span>
            <span className="text-sm font-semibold text-white">
              {totalPassed} of {results.length} Tests Passed
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({results.reduce((acc, r) => acc + r.durationMs, 0)}ms total duration)
            </span>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
              totalPassed === results.length
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}
          >
            {totalPassed === results.length ? '100% SUITE PASS' : 'FAILURES DETECTED'}
          </span>
        </div>
      )}

      {/* Test Cases Results */}
      <div className="space-y-3">
        {results.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
            <FlaskConical className="w-8 h-8 text-indigo-400 mx-auto" />
            <div className="text-sm font-medium text-slate-300">Test Harness Ready</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Click "Run All Tests" to verify the ported runtime against all Aegis test assertions.
            </p>
            <button
              onClick={runAllTests}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer"
            >
              Execute Tests Now
            </button>
          </div>
        ) : (
          results.map((tc) => (
            <div
              key={tc.id}
              className={`p-4 rounded-xl border text-xs space-y-2.5 transition ${
                tc.passed
                  ? 'bg-slate-900/80 border-slate-800'
                  : 'bg-rose-950/20 border-rose-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {tc.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="font-semibold text-white">{tc.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-mono text-[11px]">{tc.durationMs}ms</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      tc.passed
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {tc.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              </div>

              {/* Assertion Log */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-[11px] space-y-1 text-slate-300">
                {tc.assertionLog.map((log, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-slate-600 select-none">&rsaquo;</span>
                    <span>{log}</span>
                  </div>
                ))}
                {tc.error && (
                  <div className="text-rose-400 pt-1 font-bold">
                    [ERROR] {tc.error}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
