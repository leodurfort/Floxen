import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { syncFlowProducer, isQueueAvailable, DEFAULT_JOB_OPTIONS, JOB_PRIORITIES } from '../lib/redis';
import { cleanupExpiredTokens } from './verificationService';

const STUCK_SYNC_TIMEOUT_MS = 5 * 60 * 1000;
const ORPHANED_SHOP_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

export class CronScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private isRunning = false;

  schedulePeriodicSync() {
    const job = cron.schedule('0 * * * *', async () => {
      logger.info('Cron: Periodic sync triggered');
      await this.triggerAllShopsSync();
    }, {
      scheduled: false, // Don't start immediately
    });

    this.jobs.set('periodic-sync', job);
    logger.info('Cron: Periodic sync scheduled (every hour)');
  }

  async triggerAllShopsSync() {
    if (!isQueueAvailable() || !syncFlowProducer) {
      logger.error('Cron: Cannot trigger sync - Redis queue not available');
      return;
    }

    try {
      const shops = await prisma.shop.findMany({
        where: {
          isConnected: true,
          syncEnabled: true,
          openaiEnabled: true,
        },
        select: {
          id: true,
          sellerName: true,
        },
      });

      logger.info(`Cron: Triggering sync for ${shops.length} shops`);

      for (let i = 0; i < shops.length; i++) {
        const shop = shops[i];
        const delay = i * 5000;

        setTimeout(async () => {
          try {
            await syncFlowProducer!.add({
              name: 'feed-generation',
              queueName: 'sync',
              data: { shopId: shop.id, triggeredBy: 'cron' },
              opts: {
                ...DEFAULT_JOB_OPTIONS,
                priority: JOB_PRIORITIES.CRON,
              },
              children: [
                {
                  name: 'product-sync',
                  queueName: 'sync',
                  data: { shopId: shop.id, triggeredBy: 'cron' },
                  opts: {
                    ...DEFAULT_JOB_OPTIONS,
                    priority: JOB_PRIORITIES.CRON,
                  },
                },
              ],
            });

            logger.info(`Cron: Enqueued sync flow for shop ${shop.sellerName || shop.id}`, {
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

  scheduleStuckSyncRecovery() {
    const job = cron.schedule('* * * * *', async () => {
      await this.recoverStuckSyncs();
    }, {
      scheduled: false,
    });

    this.jobs.set('stuck-sync-recovery', job);
    logger.info('Cron: Stuck sync recovery scheduled (every minute)');
  }

  async recoverStuckSyncs() {
    try {
      const cutoffTime = new Date(Date.now() - STUCK_SYNC_TIMEOUT_MS);

      // Find shops that have been SYNCING for too long
      const stuckShops = await prisma.shop.findMany({
        where: {
          syncStatus: 'SYNCING',
          updatedAt: { lt: cutoffTime },
        },
        select: { id: true, sellerName: true, updatedAt: true },
      });

      if (stuckShops.length === 0) return;

      logger.warn(`Cron: Found ${stuckShops.length} stuck syncs, resetting to FAILED`, {
        shopIds: stuckShops.map(s => s.id),
      });

      for (const shop of stuckShops) {
        await prisma.shop.update({
          where: { id: shop.id },
          data: { syncStatus: 'FAILED' },
        });

        logger.info('Cron: Reset stuck sync', {
          shopId: shop.id,
          sellerName: shop.sellerName,
          stuckSince: shop.updatedAt,
        });
      }
    } catch (err) {
      logger.error('Cron: Failed to recover stuck syncs', {
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }

  scheduleTokenCleanup() {
    const job = cron.schedule('0 * * * *', async () => {
      logger.info('Cron: Token cleanup triggered');
      try {
        const cleanedCount = await cleanupExpiredTokens();
        if (cleanedCount > 0) {
          logger.info(`Cron: Cleaned up ${cleanedCount} expired tokens`);
        }
      } catch (err) {
        logger.error('Cron: Failed to cleanup expired tokens', {
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    }, {
      scheduled: false,
    });

    this.jobs.set('token-cleanup', job);
    logger.info('Cron: Token cleanup scheduled (hourly)');
  }

  scheduleOrphanedShopCleanup() {
    // Run every 15 minutes to clean up shops where OAuth was never completed
    const job = cron.schedule('*/15 * * * *', async () => {
      await this.cleanupOrphanedShops();
    }, {
      scheduled: false,
    });

    this.jobs.set('orphaned-shop-cleanup', job);
    logger.info('Cron: Orphaned shop cleanup scheduled (every 15 minutes)');
  }

  async cleanupOrphanedShops() {
    try {
      const cutoffTime = new Date(Date.now() - ORPHANED_SHOP_TIMEOUT_MS);

      // Find shops that are not connected and were created more than 1 hour ago
      const orphanedShops = await prisma.shop.findMany({
        where: {
          isConnected: false,
          createdAt: { lt: cutoffTime },
        },
        select: { id: true, wooStoreUrl: true, createdAt: true },
      });

      if (orphanedShops.length === 0) return;

      logger.info(`Cron: Found ${orphanedShops.length} orphaned shops to clean up`, {
        shopIds: orphanedShops.map(s => s.id),
      });

      for (const shop of orphanedShops) {
        await prisma.shop.delete({
          where: { id: shop.id },
        });

        logger.info('Cron: Deleted orphaned shop', {
          shopId: shop.id,
          wooStoreUrl: shop.wooStoreUrl,
          createdAt: shop.createdAt,
        });
      }

      logger.info(`Cron: Cleaned up ${orphanedShops.length} orphaned shops`);
    } catch (err) {
      logger.error('Cron: Failed to cleanup orphaned shops', {
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }

  start() {
    if (this.isRunning) {
      logger.warn('Cron: Scheduler already running');
      return;
    }

    this.schedulePeriodicSync();
    this.scheduleStuckSyncRecovery();
    this.scheduleTokenCleanup();
    this.scheduleOrphanedShopCleanup();

    this.jobs.forEach((job, name) => {
      job.start();
      logger.info(`Cron: Started job "${name}"`);
    });

    this.isRunning = true;
    logger.info('Cron: Scheduler started');
  }

  stop() {
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Cron: Stopped job "${name}"`);
    });

    this.isRunning = false;
    logger.info('Cron: Scheduler stopped');
  }

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

  async triggerManualSync() {
    logger.info('Cron: Manual sync triggered');
    await this.triggerAllShopsSync();
  }
}

// Singleton instance
export const cronScheduler = new CronScheduler();
