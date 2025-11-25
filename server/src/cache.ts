import { LRUCache } from 'lru-cache';
import crypto from 'crypto';

const cache = new LRUCache<string, object>({
  max: 500,
  ttl: 60 * 60 * 1000, // 1 hour
  allowStale: false
});

export function cacheKey(...parts: (string | undefined)[]): string {
  return crypto
    .createHash('sha256')
    .update(parts.filter(Boolean).join('||'))
    .digest('hex');
}

export function getCached<T extends object>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setCached(key: string, value: object): void {
  cache.set(key, value);
}

export function getCacheStats() {
  return { size: cache.size, maxSize: 500 };
}
