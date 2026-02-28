import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeotabCache } from '../../src/geotab/cache.js';

describe('GeotabCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and retrieves data by userId', () => {
    const cache = new GeotabCache<string[]>();
    cache.set('user1', ['a', 'b']);
    expect(cache.get('user1')).toEqual(['a', 'b']);
  });

  it('returns undefined for missing keys', () => {
    const cache = new GeotabCache<string>();
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('expires entries after TTL', () => {
    const cache = new GeotabCache<string>(1000); // 1 second TTL
    cache.set('user1', 'data');
    expect(cache.get('user1')).toBe('data');

    vi.advanceTimersByTime(999);
    expect(cache.get('user1')).toBe('data');

    vi.advanceTimersByTime(2);
    expect(cache.get('user1')).toBeUndefined();
  });

  it('has() returns true for valid entries, false for expired/missing', () => {
    const cache = new GeotabCache<string>(500);
    expect(cache.has('user1')).toBe(false);

    cache.set('user1', 'data');
    expect(cache.has('user1')).toBe(true);

    vi.advanceTimersByTime(501);
    expect(cache.has('user1')).toBe(false);
  });

  it('invalidates a specific user', () => {
    const cache = new GeotabCache<string>();
    cache.set('user1', 'a');
    cache.set('user2', 'b');

    cache.invalidate('user1');
    expect(cache.get('user1')).toBeUndefined();
    expect(cache.get('user2')).toBe('b');
  });

  it('invalidateAll clears everything', () => {
    const cache = new GeotabCache<string>();
    cache.set('user1', 'a');
    cache.set('user2', 'b');

    cache.invalidateAll();
    expect(cache.get('user1')).toBeUndefined();
    expect(cache.get('user2')).toBeUndefined();
  });

  it('overwrites existing entries on set', () => {
    const cache = new GeotabCache<number>();
    cache.set('user1', 1);
    cache.set('user1', 2);
    expect(cache.get('user1')).toBe(2);
  });

  it('resets TTL on overwrite', () => {
    const cache = new GeotabCache<string>(1000);
    cache.set('user1', 'first');

    vi.advanceTimersByTime(800);
    cache.set('user1', 'second');

    vi.advanceTimersByTime(800);
    // Should still be valid (800ms since last set, TTL is 1000ms)
    expect(cache.get('user1')).toBe('second');

    vi.advanceTimersByTime(201);
    expect(cache.get('user1')).toBeUndefined();
  });

  it('uses 24h TTL by default', () => {
    const cache = new GeotabCache<string>();
    cache.set('user1', 'data');

    // Just under 24 hours
    vi.advanceTimersByTime(24 * 60 * 60 * 1000 - 1);
    expect(cache.get('user1')).toBe('data');

    // Just over 24 hours
    vi.advanceTimersByTime(2);
    expect(cache.get('user1')).toBeUndefined();
  });
});
