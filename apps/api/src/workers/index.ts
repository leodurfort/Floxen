import { Worker } from 'bullmq';
import { redisConnection } from '../lib/redis';
import { productSyncProcessor } from './productSyncWorker';
import { productReprocessProcessor } from './productReprocessWorker';
import { feedGenerationProcessor } from './feedGenerationWorker';
import { logger } from '../lib/logger';

// Concurrency limit: keep low to avoid overwhelming WooCommerce APIs
const WORKER_CONCURRENCY = 2;

if (redisConnection) {
  // Create a single worker that handles all sync-related jobs
  const syncWorker = new Worker(
    'sync',
    async (job) => {
      switch (job.name) {
        case 'product-sync':
          return await productSyncProcessor(job);
        case 'product-reprocess':
          return await productReprocessProcessor(job);
        case 'feed-generation':
          return await feedGenerationProcessor(job);
        default:
          logger.warn(`Unknown job type: ${job.name}`);
      }
    },
    {
      connection: redisConnection,
      concurrency: WORKER_CONCURRENCY,
    }
  );

  syncWorker.on('completed', (job) => {
    logger.info(`Job completed: ${job.name} (${job.id})`);
  });

  syncWorker.on('failed', (job, err) => {
    logger.error(`Job failed: ${job?.name} (${job?.id})`, { error: err instanceof Error ? err : new Error(String(err)) });
  });

  logger.info(`Workers initialized with concurrency: ${WORKER_CONCURRENCY}`);
} else {
  logger.warn('Redis not configured; workers disabled');
}
