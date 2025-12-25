/**
 * Cron Scheduler Service
 *
 * Manages all scheduled jobs for ProductSynch:
 * - Periodic sync (every 15 minutes)
 * - Feed generation (creates FeedSnapshot for OpenAI)
 * - Health checks
 * - Analytics aggregation
 */

import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { syncQueue, isQueueAvailable } from '../lib/redis';

export class CronScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private isRunning = false;

  /**
   * Schedule periodic sync every 15 minutes
   * OpenAI accepts feed updates every 15 minutes (max frequency)
   */
  schedulePeriodicSync() {
    const job = cron.schedule('*/15 * * * *', async () => {
      logger.info('Cron: Periodic sync triggered');
      await this.triggerAllShopsSync();
    }, {
      scheduled: false, // Don't start immediately
    });

    this.jobs.set('periodic-sync', job);
    logger.info('Cron: Periodic sync scheduled (every 15 minutes)');
  }

  /**
   * Trigger sync for all active shops
   * Enqueues jobs for each shop with staggered delays to avoid thundering herd
   */
  async triggerAllShopsSync() {
    // Check Redis availability before attempting to queue jobs
    if (!isQueueAvailable()) {
      logger.error('Cron: Cannot trigger sync - Redis queue not available');
      return;
    }

    try {
      const shops = await prisma.shop.findMany({
        where: {
          isConnected: true,
          syncEnabled: true,
        },
        select: {
          id: true,
          sellerName: true,
        },
      });

      logger.info(`Cron: Triggering sync for ${shops.length} shops`);

      // Stagger jobs to avoid thundering herd
      // Add 5 second delay between each shop
      for (let i = 0; i < shops.length; i++) {
        const shop = shops[i];
        const delay = i * 5000; // 5 seconds per shop

        setTimeout(async () => {
          try {
            // 1. Product sync (fetch from WooCommerce)
            await syncQueue!.add('product-sync', {
              shopId: shop.id,
              triggeredBy: 'cron',
            }, {
              priority: 3, // Normal priority for scheduled syncs
              delay: 0,
            });

            // 2. Feed generation (after product sync completes)
            // This creates/updates FeedSnapshot + uploads to storage
            await syncQueue!.add('feed-generation', {
              shopId: shop.id,
            }, {
              priority: 3,
              delay: 30000, // 30 seconds after product sync
            });

            logger.info(`Cron: Enqueued jobs for shop ${shop.sellerName || shop.id}`, {
              shopId: shop.id,
              delay: `${delay / 1000}s`,
            });
          } catch (err) {
            logger.error(`Cron: Failed to enqueue jobs for shop ${shop.sellerName || shop.id}`, { error: err instanceof Error ? err : new Error(String(err)) });
          }
        }, delay);
      }
    } catch (err) {
      logger.error('Cron: Failed to trigger all shops sync', { error: err instanceof Error ? err : new Error(String(err)) });
    }
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    if (this.isRunning) {
      logger.warn('Cron: Scheduler already running');
      return;
    }

    this.schedulePeriodicSync();

    // Start all jobs
    this.jobs.forEach((job, name) => {
      job.start();
      logger.info(`Cron: Started job "${name}"`);
    });

    this.isRunning = true;
    logger.info('Cron: Scheduler started');
  }

  /**
   * Stop all scheduled jobs (for graceful shutdown)
   */
  stop() {
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Cron: Stopped job "${name}"`);
    });

    this.isRunning = false;
    logger.info('Cron: Scheduler stopped');
  }

  /**
   * Get status of all jobs
   */
  getStatus() {
    const status: Record<string, boolean> = {};
    this.jobs.forEach((job, name) => {
      status[name] = this.isRunning;
    });
    return {
      isRunning: this.isRunning,
      jobs: status,
    };
  }

  /**
   * Manually trigger a sync cycle (for testing or manual triggering)
   */
  async triggerManualSync() {
    logger.info('Cron: Manual sync triggered');
    await this.triggerAllShopsSync();
  }
}

// Singleton instance
export const cronScheduler = new CronScheduler();
