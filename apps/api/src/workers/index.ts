import { Worker } from 'bullmq';
import { redisConnection } from '../lib/redis';
import { productSyncProcessor } from './productSyncWorker';
import { productReprocessProcessor } from './productReprocessWorker';
import { feedGenerationProcessor } from './feedGenerationWorker';
import { feedSubmissionProcessor } from './feedSubmissionWorker';
import { logger } from '../lib/logger';

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
        case 'feed-submission':
          return await feedSubmissionProcessor(job);
        default:
          logger.warn(`Unknown job type: ${job.name}`);
      }
    },
    {
      connection: redisConnection,
      concurrency: 5, // Process up to 5 jobs concurrently
    }
  );

  syncWorker.on('completed', (job) => {
    logger.info(`Job completed: ${job.name} (${job.id})`);
  });

  syncWorker.on('failed', (job, err) => {
    logger.error(`Job failed: ${job?.name} (${job?.id})`, { error: err instanceof Error ? err : new Error(String(err)) });
  });

  logger.info('Workers initialized and listening for jobs');
} else {
  logger.warn('Redis not configured; workers disabled');
}
