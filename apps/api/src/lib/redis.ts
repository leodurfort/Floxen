import { Queue, QueueEvents, FlowProducer, JobsOptions } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

export const redisConnection = env.redisUrl
  ? new Redis(env.redisUrl, { maxRetriesPerRequest: null })
  : null;

export function createQueue(name: string) {
  if (!redisConnection) {
    logger.warn(`Redis not configured; queue ${name} will be disabled`);
    return null;
  }
  const queue = new Queue(name, { connection: redisConnection });
  const events = new QueueEvents(name, { connection: redisConnection });
  events.on('error', (err) => logger.error(`QueueEvents error (${name})`, { error: err instanceof Error ? err : new Error(String(err)) }));
  return { queue, events };
}

// Create shared queue instance for sync jobs
const syncQueueInstance = createQueue('sync');

export const syncQueue = syncQueueInstance?.queue || null;

// FlowProducer for dependent job chains (e.g., product-sync → feed-generation)
export const syncFlowProducer = redisConnection
  ? new FlowProducer({ connection: redisConnection })
  : null;

/**
 * Default job options for all sync-related jobs
 *
 * Retry Strategy:
 * - 3 total attempts (1 initial + 2 retries)
 * - Exponential backoff: 5s → 10s → 20s
 * - Failed jobs kept for debugging
 */
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000, // 5 seconds base delay
  },
  removeOnComplete: true,
  removeOnFail: false, // Keep failed jobs for investigation
};

/**
 * Priority levels for different job sources
 * Lower number = higher priority
 */
export const JOB_PRIORITIES = {
  WEBHOOK: 1, // Highest priority - real-time updates
  MANUAL: 2, // User-triggered syncs
  CRON: 3, // Background scheduled syncs
  REPROCESS: 4, // Lowest priority - non-urgent
} as const;

export function isQueueAvailable(): boolean {
  return syncQueue !== null;
}
