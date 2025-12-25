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

export interface WorkerOptions {
  concurrency?: number;
}

export function createWorker<T = any>(
  name: string,
  processor: (job: any) => Promise<T>,
  options: WorkerOptions = {},
) {
  if (!redisConnection) {
    logger.warn(`Redis not configured; worker ${name} disabled`);
    return null;
  }
  const { concurrency = 2 } = options; // Default to 2 concurrent jobs
  const worker = new Worker(name, processor, {
    connection: redisConnection,
    concurrency,
  });
  worker.on('failed', (job, err) => logger.error(`Job failed (${name}:${job?.id})`, { error: err instanceof Error ? err : new Error(String(err)) }));
  logger.info(`Worker ${name} created with concurrency: ${concurrency}`);
  return worker;
}

// Create shared queue instance for sync jobs
const syncQueueInstance = createQueue('sync');

export const syncQueue = syncQueueInstance?.queue || null;

export function isQueueAvailable(): boolean {
  return syncQueue !== null;
}
