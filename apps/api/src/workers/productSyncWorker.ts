import { Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { createWooClient, fetchAllProducts, fetchModifiedProducts, fetchStoreCurrency } from '../services/wooClient';
import { transformWooProduct, checksum } from '../services/productService';
import { AutoFillService } from '../services/autoFillService';
import { ValidationService } from '../services/validationService';

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
    logger.error(`product-sync failed for shop ${shopId}`, err);
    await prisma.shop.update({
      where: { id: shopId },
      data: { syncStatus: 'FAILED' },
    });
  }
}
