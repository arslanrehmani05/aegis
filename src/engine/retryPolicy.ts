export class RetryPolicy {
  maxAttempts: number;
  baseDelaySeconds: number;
  maxDelaySeconds: number;
  jitter: boolean;

  constructor(
    maxAttempts: number = 5,
    baseDelaySeconds: number = 1.0,
    maxDelaySeconds: number = 60.0,
    jitter: boolean = true
  ) {
    this.maxAttempts = maxAttempts;
    this.baseDelaySeconds = baseDelaySeconds;
    this.maxDelaySeconds = maxDelaySeconds;
    this.jitter = jitter;
  }

  calculateDelay(attempt: number, customRandom?: number): number {
    if (attempt <= 0) {
      return 0.0;
    }

    // Exponential backoff: base * 2^(attempt - 1)
    const exponentialDelay = Math.min(
      this.maxDelaySeconds,
      this.baseDelaySeconds * Math.pow(2, attempt - 1)
    );

    if (this.jitter) {
      // Full jitter formula: random between 0 and exponentialDelay
      const r = customRandom !== undefined ? customRandom : Math.random();
      return r * exponentialDelay;
    }
    return exponentialDelay;
  }

  shouldRetry(attempt: number, isTransientError: boolean): boolean {
    if (!isTransientError) {
      return false;
    }
    return attempt < this.maxAttempts;
  }
}
