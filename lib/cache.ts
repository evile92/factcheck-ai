interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * In-memory LRU-like cache with time-to-live (TTL) support.
 */
export class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTtlMs: number;

  constructor(maxSize = 500, defaultTtlSeconds = 3600) {
    this.maxSize = maxSize;
    this.defaultTtlMs = defaultTtlSeconds * 1000;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh position for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlSeconds?: number): void {
    if (this.cache.size >= this.maxSize) {
      // Evict oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    const expiresAt = Date.now() + (ttlSeconds ? ttlSeconds * 1000 : this.defaultTtlMs);
    this.cache.set(key, { value, expiresAt });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instances for verifications and API provider calls
export const verificationCache = new MemoryCache<any>(200, 1800); // 30 minutes
export const providerCache = new MemoryCache<any>(1000, 3600); // 1 hour
