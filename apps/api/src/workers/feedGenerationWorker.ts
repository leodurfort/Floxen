import { Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { generateFeedPayload } from '../services/feedService';
import { logger } from '../lib/logger';

export async function feedGenerationProcessor(job: Job) {
  const { shopId } = job.data as { shopId: string };
  if (!shopId) return;
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) return;
  const products = await prisma.product.findMany({ where: { shopId } });
  const payload = generateFeedPayload(shop, products);
  logger.info(`Generated feed payload for shop ${shopId} (items: ${products.length})`, { size: JSON.stringify(payload).length });
  return payload;
}
