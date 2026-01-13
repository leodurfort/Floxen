import { logger } from './logger';

/**
 * Adaptive Concurrency Manager
 *
 * Manages API request concurrency per shop with automatic scaling:
 * - Scales DOWN on 429 (rate limit) errors
 * - Scales UP after consecutive successful batches
 *
 * In-memory only - resets each sync job
 */

interface ConcurrencyState {
  current: number;
  consecutiveSuccesses: number;
  lastAdjustmentTime: number;
}

const DEFAULT_CONCURRENCY = 5;
const MIN_CONCURRENCY = 1;
const MAX_CONCURRENCY = 10;
const SUCCESSES_BEFORE_SCALE_UP = 3; // Scale up after 3 successful batches
const SCALE_UP_COOLDOWN_MS = 5000; // Wait 5s between scale-ups

// In-memory state per shop (cleared when sync completes)
const shopConcurrencyState = new Map<string, ConcurrencyState>();

/**
 * Get or initialize concurrency state for a shop
 */
export function getConcurrency(shopId: string): number {
  const state = shopConcurrencyState.get(shopId);
  return state?.current ?? DEFAULT_CONCURRENCY;
}

/**
 * Initialize concurrency tracking for a new sync
 */
export function initConcurrency(shopId: string): number {
  const state: ConcurrencyState = {
    current: DEFAULT_CONCURRENCY,
    consecutiveSuccesses: 0,
    lastAdjustmentTime: Date.now(),
  };
  shopConcurrencyState.set(shopId, state);

  logger.info('adaptive-concurrency: initialized', {
    shopId,
    concurrency: state.current,
  });

  return state.current;
}

/**
 * Record a successful batch - may scale up concurrency
 */
export function recordSuccess(shopId: string): number {
  const state = shopConcurrencyState.get(shopId);
  if (!state) return DEFAULT_CONCURRENCY;

  state.consecutiveSuccesses++;

  // Check if we should scale up
  const timeSinceLastAdjustment = Date.now() - state.lastAdjustmentTime;
  const canScaleUp =
    state.current < MAX_CONCURRENCY &&
    state.consecutiveSuccesses >= SUCCESSES_BEFORE_SCALE_UP &&
    timeSinceLastAdjustment >= SCALE_UP_COOLDOWN_MS;

  if (canScaleUp) {
    state.current++;
    state.consecutiveSuccesses = 0;
    state.lastAdjustmentTime = Date.now();

    logger.info('adaptive-concurrency: scaled UP', {
      shopId,
      newConcurrency: state.current,
      reason: `${SUCCESSES_BEFORE_SCALE_UP} consecutive successes`,
    });
  }

  return state.current;
}

/**
 * Record a rate limit (429) error - scales down concurrency
 */
export function recordRateLimit(shopId: string): number {
  const state = shopConcurrencyState.get(shopId);
  if (!state) return MIN_CONCURRENCY;

  const oldConcurrency = state.current;

  // Scale down by 1, but don't go below minimum
  state.current = Math.max(MIN_CONCURRENCY, state.current - 1);
  state.consecutiveSuccesses = 0;
  state.lastAdjustmentTime = Date.now();

  logger.warn('adaptive-concurrency: scaled DOWN due to rate limit', {
    shopId,
    oldConcurrency,
    newConcurrency: state.current,
  });

  return state.current;
}

/**
 * Check if an error is a rate limit (429) error
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const err = error as Record<string, unknown>;

  // Check Axios response format
  if (err.response && typeof err.response === 'object') {
    const response = err.response as Record<string, unknown>;
    if (response.status === 429) return true;
  }

  // Check direct status
  if (err.status === 429 || err.statusCode === 429) return true;

  // Check error message
  const message = err instanceof Error ? err.message : String(err);
  if (message.toLowerCase().includes('429') ||
      message.toLowerCase().includes('too many requests') ||
      message.toLowerCase().includes('rate limit')) {
    return true;
  }

  return false;
}

/**
 * Clean up concurrency state for a shop (call when sync completes)
 */
export function cleanupConcurrency(shopId: string): void {
  const state = shopConcurrencyState.get(shopId);
  if (state) {
    logger.info('adaptive-concurrency: cleanup', {
      shopId,
      finalConcurrency: state.current,
    });
  }
  shopConcurrencyState.delete(shopId);
}

/**
 * Get current stats for logging
 */
export function getConcurrencyStats(shopId: string): {
  current: number;
  consecutiveSuccesses: number;
} | null {
  const state = shopConcurrencyState.get(shopId);
  if (!state) return null;

  return {
    current: state.current,
    consecutiveSuccesses: state.consecutiveSuccesses,
  };
}
