import { Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export async function productSyncProcessor(job: Job) {
  logger.info(`product-sync job received`, job.data);
  const { shopId, productId } = job.data as { shopId: string; productId?: string };
  if (!shopId) return;
  if (productId) {
    await prisma.product.update({
      where: { id: productId },
      data: { syncStatus: 'COMPLETED', status: 'SYNCED', lastSyncedAt: new Date(), updatedAt: new Date() },
    });
  } else {
    await prisma.shop.update({
      where: { id: shopId },
      data: {
        syncStatus: 'COMPLETED',
        lastSyncAt: new Date(),
      },
    });
    await prisma.product.updateMany({
      where: { shopId },
      data: { syncStatus: 'COMPLETED', status: 'SYNCED', lastSyncedAt: new Date(), updatedAt: new Date() },
    });
  }
}
