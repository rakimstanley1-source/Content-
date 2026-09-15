/**
 * Server-side response cache with a 15 minute TTL, per the product spec.
 * Process-local (in-memory) — correct for a single Next.js server instance;
 * swap for Redis if this ever runs multi-instance.
 */
type Entry<T> = { value: T; expiresAt: number; syncedAt: number };

const store = new Map<string, Entry<unknown>>();

const DEFAULT_TTL_MS = 15 * 60 * 1000;

export async function cached<T>(key: string, fn: () => Promise<T>, ttlMs: number = DEFAULT_TTL_MS): Promise<{ value: T; syncedAt: number; fromCache: boolean }> {
  const hit = store.get(key) as Entry<T> | undefined;
  const now = Date.now();
  if (hit && hit.expiresAt > now) {
    return { value: hit.value, syncedAt: hit.syncedAt, fromCache: true };
  }
  const value = await fn();
  const syncedAt = now;
  store.set(key, { value, expiresAt: now + ttlMs, syncedAt });
  return { value, syncedAt, fromCache: false };
}

/** Drops every cache entry for a key prefix — used by the manual refresh button. */
export function invalidate(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export function cacheKey(...parts: Array<string | number>): string {
  return parts.join(":");
}
