import { Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { createWooClient, fetchAllProducts, fetchModifiedProducts, fetchStoreCurrency } from '../services/wooClient';
import { transformWooProduct, checksum } from '../services/productService';
import { AutoFillService } from '../services/autoFillService';
import { ValidationService } from '../services/validationService';

export async function productSyncProcessor(job: Job) {
  logger.info(`product-sync job received`, job.data);
  const { shopId, productId, type } = job.data as { shopId: string; productId?: string; type?: 'FULL' | 'INCREMENTAL' };
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

    // Determine sync type: FULL if explicitly requested OR first sync
    const isForcedFullSync = type === 'FULL';
    const isIncrementalSync = !isForcedFullSync && shop.lastSyncAt;

    const products = isIncrementalSync
      ? await fetchModifiedProducts(client, shop.lastSyncAt!)
      : await fetchAllProducts(client);

    logger.info(`product-sync: fetched products`, {
      shopId,
      count: products.length,
      syncType: isForcedFullSync ? 'full (forced)' : isIncrementalSync ? 'incremental' : 'full (first sync)',
      lastSyncAt: shop.lastSyncAt?.toISOString(),
      requestedType: type || 'auto',
    });

    for (const wooProd of products) {
      const data = transformWooProduct(wooProd, shop.shopCurrency);
      const existing = await prisma.product.findUnique({
        where: { shopId_wooProductId: { shopId, wooProductId: wooProd.id } },
      });

      if (existing && existing.checksum === data.checksum) {
        logger.info(`product-sync: skipping unchanged product`, {
          shopId,
          wooProductId: wooProd.id,
          title: wooProd.name,
          wooDateModified: wooProd.date_modified,
        });
        continue;
      }

      if (existing) {
        logger.info(`product-sync: updating product (checksum changed)`, {
          shopId,
          wooProductId: wooProd.id,
          title: wooProd.name,
          wooDateModified: wooProd.date_modified,
          oldChecksum: existing.checksum,
          newChecksum: data.checksum,
        });
      } else {
        logger.info(`product-sync: creating new product`, {
          shopId,
          wooProductId: wooProd.id,
          title: wooProd.name,
          wooDateModified: wooProd.date_modified,
        });
      }

      // Auto-fill all 63 OpenAI attributes from WooCommerce data
      const autoFillService = new AutoFillService(shop);
      const openaiAutoFilled = autoFillService.autoFillProduct(wooProd);

      // Validate the product with auto-filled values
      const validationService = new ValidationService();
      const validation = validationService.validateProduct(
        openaiAutoFilled,
        existing?.openaiEdited as Record<string, any> || {},
        {
          aiTitle: existing?.aiTitle || undefined,
          aiDescription: existing?.aiDescription || undefined,
          aiCategory: existing?.aiSuggestedCategory || undefined,
          aiQAndA: existing?.aiQAndA || undefined,
        },
        existing?.selectedSources as Record<string, 'ai' | 'woo'> || {},
        existing?.feedEnableCheckout || false
      );

      await prisma.product.upsert({
        where: { shopId_wooProductId: { shopId, wooProductId: wooProd.id } },
        create: {
          shopId,
          status: existing?.status || 'PENDING_REVIEW',
          syncStatus: 'PENDING',
          openaiAutoFilled: openaiAutoFilled as any,
          isValid: validation.isValid,
          validationErrors: validation.errors as any,
          ...data,
        },
        update: {
          openaiAutoFilled: openaiAutoFilled as any,
          isValid: validation.isValid,
          validationErrors: validation.errors as any,
          ...data,
          status: existing?.status || 'PENDING_REVIEW',
          syncStatus: 'PENDING',
        },
      });

      logger.info('product-sync: auto-filled and validated', {
        shopId,
        wooProductId: wooProd.id,
        isValid: validation.isValid,
        errorCount: Object.keys(validation.errors).length,
      });
    }

    await prisma.shop.update({
      where: { id: shopId },
      data: { syncStatus: 'COMPLETED', lastSyncAt: new Date() },
    });
  } catch (err) {
    logger.error(`product-sync failed for shop ${shopId}`, { error: err instanceof Error ? err : new Error(String(err)) });
    await prisma.shop.update({
      where: { id: shopId },
      data: { syncStatus: 'FAILED' },
    });
  }
}
