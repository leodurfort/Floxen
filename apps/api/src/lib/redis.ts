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
  events.on('error', (err) => logger.error(`QueueEvents error (${name})`, err));
  return { queue, events };
}

export function createWorker(
  name: string,
  processor: Parameters<typeof Worker>[1],
) {
  if (!redisConnection) {
    logger.warn(`Redis not configured; worker ${name} disabled`);
    return null;
  }
  const worker = new Worker(name, processor, { connection: redisConnection });
  worker.on('failed', (job, err) => logger.error(`Job failed (${name}:${job?.id})`, err));
  return worker;
}
