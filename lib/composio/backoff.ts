/**
 * Exponential backoff for Composio actions that fail on rate limits.
 * Composio surfaces rate limits either as a thrown HTTP error with status
 * 429 (axios) or as a successful-envelope error string mentioning
 * "rate limit" — both are treated the same way here.
 */
function isRateLimited(err: unknown): boolean {
  const status = (err as { response?: { status?: number }; status?: number })?.response?.status ?? (err as { status?: number })?.status;
  if (status === 429) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /rate.?limit/i.test(message) || /429/.test(message);
}

export async function withBackoff<T>(fn: () => Promise<T>, opts: { retries?: number; baseDelayMs?: number } = {}): Promise<T> {
  const retries = opts.retries ?? 4;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isRateLimited(err)) throw err;
      const delay = baseDelayMs * 2 ** attempt + Math.random() * baseDelayMs;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}
