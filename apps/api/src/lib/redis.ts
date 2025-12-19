import { Queue, Worker, QueueEvents } from 'bullmq';
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

export function createWorker<T = any>(
  name: string,
  processor: (job: any) => Promise<T>,
) {
  if (!redisConnection) {
    logger.warn(`Redis not configured; worker ${name} disabled`);
    return null;
  }
  const worker = new Worker(name, processor, { connection: redisConnection });
  worker.on('failed', (job, err) => logger.error(`Job failed (${name}:${job?.id})`, { error: err instanceof Error ? err : new Error(String(err)) }));
  return worker;
}

// Create shared queue instance for sync jobs
const syncQueueInstance = createQueue('sync');

export const syncQueue = syncQueueInstance?.queue || null;

export function isQueueAvailable(): boolean {
  return syncQueue !== null;
}
