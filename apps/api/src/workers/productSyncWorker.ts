import { Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { createWooClient, fetchAllProducts, fetchModifiedProducts, fetchStoreCurrency, fetchProductVariations, fetchStoreSettings } from '../services/wooClient';
import { transformWooProduct, mergeParentAndVariation, checksum } from '../services/productService';
import { AutoFillService } from '../services/autoFillService';
import { ValidationService } from '../services/validationService';
import { FieldDiscoveryService } from '../services/fieldDiscoveryService';
import { Shop } from '@prisma/client';

/**
 * Process a single product (simple product or merged variation)
 */
async function processProduct(data: any, shop: Shop, shopId: string) {
  const existing = await prisma.product.findUnique({
    where: { shopId_wooProductId: { shopId, wooProductId: data.wooProductId } },
  });

  if (existing && existing.checksum === data.checksum) {
    logger.info(`product-sync: skipping unchanged product`, {
      shopId,
      wooProductId: data.wooProductId,
      wooParentId: data.wooParentId,
      title: data.wooTitle,
    });
    return;
  }

  if (existing) {
    logger.info(`product-sync: updating product (checksum changed)`, {
      shopId,
      wooProductId: data.wooProductId,
      wooParentId: data.wooParentId,
      title: data.wooTitle,
      oldChecksum: existing.checksum,
      newChecksum: data.checksum,
    });
  } else {
    logger.info(`product-sync: creating new product`, {
      shopId,
      wooProductId: data.wooProductId,
      wooParentId: data.wooParentId,
      title: data.wooTitle,
    });
  }

  // Auto-fill all 63 OpenAI attributes from WooCommerce data
  const autoFillService = new AutoFillService(shop);
  const openaiAutoFilled = autoFillService.autoFillProduct(data.wooRawJson);

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
    where: { shopId_wooProductId: { shopId, wooProductId: data.wooProductId } },
    create: {
      shopId,
      status: existing?.status || 'PENDING_REVIEW',
      syncStatus: 'PENDING',
      openaiAutoFilled: openaiAutoFilled as any,
      isValid: validation.isValid,
      validationErrors: validation.errors as any,
      // Apply shop defaults for toggle fields on new products
      feedEnableSearch: shop.defaultEnableSearch,
      feedEnableCheckout: shop.defaultEnableCheckout,
      ...data,
    },
    update: {
      openaiAutoFilled: openaiAutoFilled as any,
      isValid: validation.isValid,
      validationErrors: validation.errors as any,
      ...data,
      status: existing?.status || 'PENDING_REVIEW',
      syncStatus: 'PENDING',
      // DON'T update toggle fields on sync - preserve user's product-level settings
    },
  });

  logger.info('product-sync: auto-filled and validated', {
    shopId,
    wooProductId: data.wooProductId,
    wooParentId: data.wooParentId,
    isValid: validation.isValid,
    errorCount: Object.keys(validation.errors).length,
  });
}

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

    // Refresh shop settings from WooCommerce on each sync
    logger.info('product-sync: refreshing shop settings from WooCommerce', { shopId });
    const settings = await fetchStoreSettings(client);

    if (settings) {
      // Use shop's wooStoreUrl as fallback if WooCommerce API doesn't return URL
      const sellerUrl = settings.sellerUrl || shop.wooStoreUrl;

      // Extract shop name from URL if WooCommerce API doesn't return name
      let shopName = settings.shopName;
      if (!shopName && sellerUrl) {
        try {
          const url = new URL(sellerUrl);
          const domain = url.hostname.replace(/^www\./, '');
          shopName = domain.split('.')[0];
          shopName = shopName.charAt(0).toUpperCase() + shopName.slice(1);
        } catch (e) {
          // Invalid URL, keep as null
        }
      }

      const updateData: any = {
        shopName: shopName,
        shopCurrency: settings.shopCurrency,
        dimensionUnit: settings.dimensionUnit,
        weightUnit: settings.weightUnit,
        sellerName: shopName,  // Use shopName as sellerName
        sellerUrl: sellerUrl,
      };
      // sellerPrivacyPolicy, sellerTos, returnPolicy, returnWindow are user-input only

      await prisma.shop.update({
        where: { id: shopId },
        data: updateData,
      });

      logger.info('product-sync: shop settings refreshed', {
        shopId,
        shopName: settings.shopName,
        shopCurrency: settings.shopCurrency,
        dimensionUnit: settings.dimensionUnit,
        weightUnit: settings.weightUnit,
        sellerName: settings.sellerName,
        sellerUrl: settings.sellerUrl,
      });

      // Update local shop object cache
      shop.shopCurrency = settings.shopCurrency || null;
      shop.shopName = settings.shopName || null;
      shop.dimensionUnit = settings.dimensionUnit || null;
      shop.weightUnit = settings.weightUnit || null;
      shop.sellerName = settings.sellerName || null;
      shop.sellerUrl = settings.sellerUrl || null;
    } else {
      logger.warn('product-sync: failed to fetch shop settings, using existing values', { shopId });

      // Fallback: Pull currency if not set yet
      if (!shop.shopCurrency) {
        const currency = await fetchStoreCurrency(client);
        if (currency) {
          await prisma.shop.update({ where: { id: shopId }, data: { shopCurrency: currency } });
          logger.info('product-sync: currency updated from Woo (fallback)', { shopId, currency });
          shop.shopCurrency = currency;
        }
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
      // Check if this is a variable product
      const isVariable = wooProd.type === 'variable';

      if (isVariable) {
        logger.info(`product-sync: detected variable product, fetching variations`, {
          shopId,
          parentId: wooProd.id,
          title: wooProd.name,
        });

        // Fetch all variations for this variable product
        const variations = await fetchProductVariations(client, wooProd.id);

        logger.info(`product-sync: processing ${variations.length} variations`, {
          shopId,
          parentId: wooProd.id,
        });

        // Process each variation
        for (const variation of variations) {
          await processProduct(
            mergeParentAndVariation(wooProd, variation, shop.shopCurrency || 'USD'),
            shop,
            shopId
          );
        }

        // Skip creating an entry for the parent variable product
        logger.info(`product-sync: skipped parent variable product`, {
          shopId,
          parentId: wooProd.id,
          variationsCount: variations.length,
        });
      } else {
        // Process simple products normally
        await processProduct(transformWooProduct(wooProd, shop.shopCurrency || 'USD'), shop, shopId);
      }
    }

    await prisma.shop.update({
      where: { id: shopId },
      data: { syncStatus: 'COMPLETED', lastSyncAt: new Date() },
    });

    // Automatically discover meta_data fields after sync completes
    logger.info('product-sync: triggering field discovery', { shopId });
    try {
      const discoveryResult = await FieldDiscoveryService.discoverFields(shopId);
      logger.info('product-sync: field discovery completed', {
        shopId,
        discovered: discoveryResult.discovered.length,
        saved: discoveryResult.saved,
        skipped: discoveryResult.skipped,
        errors: discoveryResult.errors.length,
      });
    } catch (discoveryErr) {
      logger.error('product-sync: field discovery failed (non-fatal)', {
        shopId,
        error: discoveryErr instanceof Error ? discoveryErr : new Error(String(discoveryErr)),
      });
      // Don't fail the sync if field discovery fails
    }
  } catch (err) {
    logger.error(`product-sync failed for shop ${shopId}`, { error: err instanceof Error ? err : new Error(String(err)) });
    await prisma.shop.update({
      where: { id: shopId },
      data: { syncStatus: 'FAILED' },
    });
  }
}
