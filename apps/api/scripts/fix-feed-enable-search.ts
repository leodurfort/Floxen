import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fix feedEnableSearch for products that were discovered and then synced
 * 
 * Problem: Products discovered with feedEnableSearch=false retain that value
 * after being selected and synced, when they should inherit the shop's defaultEnableSearch.
 * 
 * This script updates all synced products that have feedEnableSearch=false
 * to use their shop's defaultEnableSearch setting.
 */
async function fixFeedEnableSearch() {
  try {
    console.log('Starting feedEnableSearch fix...');

    // Get all shops with their defaultEnableSearch setting
    const shops = await prisma.shop.findMany({
      select: {
        id: true,
        defaultEnableSearch: true,
      },
    });

    console.log(`Found ${shops.length} shops`);

    let totalUpdated = 0;

    for (const shop of shops) {
      // Update all synced, selected products that have feedEnableSearch=false
      // to use the shop's defaultEnableSearch setting
      const result = await prisma.product.updateMany({
        where: {
          shopId: shop.id,
          isSelected: true,
          syncState: 'synced',
          feedEnableSearch: false,
        },
        data: {
          feedEnableSearch: shop.defaultEnableSearch,
        },
      });

      if (result.count > 0) {
        console.log(`Shop ${shop.id}: Updated ${result.count} products to feedEnableSearch=${shop.defaultEnableSearch}`);
        totalUpdated += result.count;
      }
    }

    console.log(`\nTotal products updated: ${totalUpdated}`);
    console.log('Fix completed successfully!');
  } catch (error) {
    console.error('Error fixing feedEnableSearch:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixFeedEnableSearch()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
