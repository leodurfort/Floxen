import { Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { createWooClient, fetchAllProducts, fetchModifiedProducts, fetchStoreCurrency } from '../services/wooClient';
import { transformWooProduct, checksum } from '../services/productService';

export async function productSyncProcessor(job: Job) {
  logger.info(`product-sync job received`, job.data);
  const { shopId, productId } = job.data as { shopId: string; productId?: string };
  if (!shopId) return;
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) return;

  // If single product sync requested, just mark done for now.
  if (productId) {
    await prisma.product.update({
      where: { id: productId },
      data: { syncStatus: 'COMPLETED', status: 'SYNCED', lastSyncedAt: new Date(), updatedAt: new Date() },
    });
    return;
  }

  // If no Woo credentials, mark sync complete.
  if (!shop.wooConsumerKey || !shop.wooConsumerSecret) {
    await prisma.shop.update({
      where: { id: shopId },
      data: { syncStatus: 'COMPLETED', lastSyncAt: new Date() },
    });
    return;
  }

  try {
    const client = createWooClient({
      storeUrl: shop.wooStoreUrl,
      consumerKey: shop.wooConsumerKey,
      consumerSecret: shop.wooConsumerSecret,
    });

    // Pull currency if not set yet.
    if (!shop.shopCurrency) {
      const currency = await fetchStoreCurrency(client);
      if (currency) {
        await prisma.shop.update({ where: { id: shopId }, data: { shopCurrency: currency } });
        logger.info('product-sync: currency updated from Woo', { shopId, currency });
        shop.shopCurrency = currency;
      }
    }

    const products = shop.lastSyncAt
      ? await fetchModifiedProducts(client, shop.lastSyncAt)
      : await fetchAllProducts(client);

    for (const wooProd of products) {
      const data = transformWooProduct(wooProd, shop.shopCurrency);
      const existing = await prisma.product.findUnique({
        where: { shopId_wooProductId: { shopId, wooProductId: wooProd.id } },
      });
      if (existing && existing.checksum === data.checksum) {
        continue;
      }
      await prisma.product.upsert({
        where: { shopId_wooProductId: { shopId, wooProductId: wooProd.id } },
        create: {
          shopId,
          status: existing?.status || 'PENDING_REVIEW',
          syncStatus: 'PENDING',
          ...data,
        },
        update: {
          ...data,
          status: existing?.status || 'PENDING_REVIEW',
          syncStatus: 'PENDING',
        },
      });
    }

    await prisma.shop.update({
      where: { id: shopId },
      data: { syncStatus: 'COMPLETED', lastSyncAt: new Date() },
    });
  } catch (err) {
    logger.error(`product-sync failed for shop ${shopId}`, err);
    await prisma.shop.update({
      where: { id: shopId },
      data: { syncStatus: 'FAILED' },
    });
  }
}
