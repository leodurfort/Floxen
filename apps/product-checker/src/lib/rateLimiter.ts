/**
 * Rate Limiter — Simple in-memory sliding-window rate limiter.
 *
 * Allows a configurable number of requests per IP within a rolling time window.
 * Expired entries are cleaned up on every check to prevent unbounded growth.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MAX_REQUESTS = 10;
const WINDOW_MS = 60_000; // 1 minute

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Remove all entries whose window has expired.
 * Called on every `checkRateLimit` invocation to keep memory bounded.
 */
function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

/**
 * Return or create the entry for the given IP, resetting if the window
 * has elapsed.
 */
function getOrCreate(ip: string): RateLimitEntry {
  const now = Date.now();
  const existing = store.get(ip);

  if (existing && now < existing.resetAt) {
    return existing;
  }

  // Create a fresh window
  const entry: RateLimitEntry = {
    count: 0,
    resetAt: now + WINDOW_MS,
  };
  store.set(ip, entry);
  return entry;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether the given IP is allowed to make another request.
 *
 * @returns `true` if the request is within the rate limit, `false` otherwise.
 */
export function checkRateLimit(ip: string): boolean {
  cleanup();

  const entry = getOrCreate(ip);
  entry.count += 1;

  return entry.count <= MAX_REQUESTS;
}

/**
 * Generate standard rate-limit HTTP headers for the given IP.
 *
 * Always safe to call — if no entry exists yet the headers will reflect the
 * full quota.
 */
export function getRateLimitHeaders(ip: string): Record<string, string> {
  const entry = store.get(ip);

  const limit = MAX_REQUESTS;
  const remaining = entry ? Math.max(0, MAX_REQUESTS - entry.count) : MAX_REQUESTS;
  const resetAt = entry ? entry.resetAt : Date.now() + WINDOW_MS;

  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
  };
}
