import { WorkerLease } from '../types/domain';

export class LeaseManager {
  workerId: string;
  defaultTtlSeconds: number;
  private leases: Map<string, WorkerLease> = new Map();

  constructor(workerId: string = 'worker-1', defaultTtlSeconds: number = 30) {
    this.workerId = workerId;
    this.defaultTtlSeconds = defaultTtlSeconds;
  }

  acquireLease(runId: string, ttlSeconds?: number): boolean {
    const existing = this.leases.get(runId);
    const now = new Date();

    if (existing) {
      const expiresAt = new Date(existing.expires_at);
      if (expiresAt > now && existing.worker_id !== this.workerId) {
        // Lease held by another worker and still valid
        return false;
      }
    }

    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    const expires = new Date(now.getTime() + ttl * 1000);

    const lease: WorkerLease = {
      run_id: runId,
      worker_id: this.workerId,
      acquired_at: now.toISOString(),
      expires_at: expires.toISOString(),
      ttl_seconds: ttl,
      heartbeat_count: 0,
    };

    this.leases.set(runId, lease);
    return true;
  }

  heartbeatLease(runId: string, ttlSeconds?: number): boolean {
    const lease = this.leases.get(runId);
    if (!lease || lease.worker_id !== this.workerId) {
      return false;
    }

    const now = new Date();
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    lease.expires_at = new Date(now.getTime() + ttl * 1000).toISOString();
    lease.heartbeat_count += 1;
    return true;
  }

  releaseLease(runId: string): boolean {
    const lease = this.leases.get(runId);
    if (lease && lease.worker_id === this.workerId) {
      this.leases.delete(runId);
      return true;
    }
    return false;
  }

  isLeaseValid(runId: string): boolean {
    const lease = this.leases.get(runId);
    if (!lease || lease.worker_id !== this.workerId) {
      return false;
    }
    return new Date(lease.expires_at) > new Date();
  }

  getLease(runId: string): WorkerLease | undefined {
    return this.leases.get(runId);
  }

  getAllActiveLeases(): WorkerLease[] {
    const now = new Date();
    return Array.from(this.leases.values()).filter(
      (l) => new Date(l.expires_at) > now
    );
  }
}
