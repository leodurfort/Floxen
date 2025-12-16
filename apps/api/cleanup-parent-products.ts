/**
 * Cleanup Script: Remove Parent Variable Products
 *
 * This script removes parent variable products from the database.
 * Parent products are identified as products that have other products
 * referencing them as wooParentId.
 *
 * Run with: npx ts-node cleanup-parent-products.ts
 */

import { prisma } from './src/lib/prisma';
import { logger } from './src/lib/logger';

async function cleanupParentProducts() {
  logger.info('Starting cleanup of parent variable products...');

  try {
    // Get all shops
    const shops = await prisma.shop.findMany({
      select: { id: true, shopName: true },
    });

    let totalDeleted = 0;

    for (const shop of shops) {
      logger.info(`Processing shop: ${shop.shopName} (${shop.id})`);

      // Get all product IDs that are used as parent IDs
      const parentProductIds = await prisma.product.findMany({
        where: {
          shopId: shop.id,
          wooParentId: { not: null },
        },
        select: { wooParentId: true },
        distinct: ['wooParentId'],
      });

      const parentIds = parentProductIds
        .map((p) => p.wooParentId)
        .filter((id): id is number => id !== null);

      if (parentIds.length === 0) {
        logger.info(`  No parent products found for shop ${shop.shopName}`);
        continue;
      }

      // Delete parent products
      const result = await prisma.product.deleteMany({
        where: {
          shopId: shop.id,
          wooProductId: { in: parentIds },
        },
      });

      totalDeleted += result.count;

      logger.info(
        `  Deleted ${result.count} parent products from shop ${shop.shopName}`
      );
    }

    logger.info(
      `Cleanup completed! Total parent products deleted: ${totalDeleted}`
    );
  } catch (error) {
    logger.error('Cleanup failed:', {
      error: error instanceof Error ? error : new Error(String(error)),
    });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupParentProducts()
  .then(() => {
    logger.info('Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Script failed:', {
      error: error instanceof Error ? error : new Error(String(error)),
    });
    process.exit(1);
  });
