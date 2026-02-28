const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Simple in-memory cache with TTL, keyed by user ID.
 * Used for Geotab data that changes infrequently (devices, drivers, groups).
 */
export class GeotabCache<T> {
  private entries = new Map<string, CacheEntry<T>>();
  private ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  get(userId: string): T | undefined {
    const entry = this.entries.get(userId);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(userId);
      return undefined;
    }
    return entry.data;
  }

  set(userId: string, data: T): void {
    this.entries.set(userId, {
      data,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  has(userId: string): boolean {
    return this.get(userId) !== undefined;
  }

  invalidate(userId: string): void {
    this.entries.delete(userId);
  }

  invalidateAll(): void {
    this.entries.clear();
  }
}

/** Cached Geotab devices per user */
export const deviceCache = new GeotabCache<unknown[]>();

/** Cached Geotab drivers/users per user */
export const driverCache = new GeotabCache<unknown[]>();

/** Cached Geotab groups per user */
export const groupCache = new GeotabCache<unknown[]>();
