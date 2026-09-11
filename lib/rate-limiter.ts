/**
 * Sliding window rate limiter for API endpoints.
 */
interface RateLimitRecord {
  timestamps: number[];
}

export class RateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private windowMs: number;
  private maxRequests: number;

  constructor(maxRequests = 30, windowSeconds = 60) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;
  }

  isAllowed(clientId: string): { allowed: boolean; remaining: number; resetTimeMs: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let record = this.records.get(clientId);
    if (!record) {
      record = { timestamps: [] };
      this.records.set(clientId, record);
    }

    // Filter out timestamps older than the window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= this.maxRequests) {
      const oldestTs = record.timestamps[0];
      const resetTimeMs = oldestTs + this.windowMs - now;
      return {
        allowed: false,
        remaining: 0,
        resetTimeMs: Math.max(0, resetTimeMs),
      };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: this.maxRequests - record.timestamps.length,
      resetTimeMs: this.windowMs,
    };
  }

  reset(): void {
    this.records.clear();
  }
}

export const globalRateLimiter = new RateLimiter(60, 60); // 60 requests per minute
