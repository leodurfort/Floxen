/**
 * Script to hard delete a user and all related data
 * Run with: npx tsx scripts/delete-user.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteUserByName(firstName: string, surname: string) {
  console.log(`\nSearching for user: ${firstName} ${surname}...\n`);

  // Find user by firstName and surname (case-insensitive)
  const users = await prisma.user.findMany({
    where: {
      AND: [
        { firstName: { equals: firstName, mode: 'insensitive' } },
        { surname: { equals: surname, mode: 'insensitive' } },
      ],
    },
    include: {
      shops: {
        include: {
          _count: {
            select: { products: true },
          },
        },
      },
      settings: true,
      verificationTokens: true,
      accountDeletion: true,
      analyticsWaitlist: true,
    },
  });

  if (users.length === 0) {
    console.log('❌ No user found with that name.');
    return;
  }

  if (users.length > 1) {
    console.log(`⚠️ Found ${users.length} users with that name:`);
    users.forEach((u, i) => {
      console.log(`  ${i + 1}. ID: ${u.id}, Email: ${u.email}, Created: ${u.createdAt}`);
    });
    console.log('\nPlease use deleteUserById() with the specific user ID.');
    return;
  }

  const user = users[0];
  console.log('Found user:');
  console.log(`  ID: ${user.id}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Name: ${user.firstName} ${user.surname}`);
  console.log(`  Created: ${user.createdAt}`);
  console.log(`  Shops: ${user.shops.length}`);
  console.log(`  Total products across shops: ${user.shops.reduce((sum, s) => sum + s._count.products, 0)}`);
  console.log();

  await deleteUserById(user.id);
}

async function deleteUserById(userId: string) {
  console.log(`🗑️  Starting deletion for user ID: ${userId}\n`);

  // Use a transaction to ensure all deletions succeed or fail together
  await prisma.$transaction(async (tx) => {
    // 1. Get all shops for this user
    const shops = await tx.shop.findMany({
      where: { userId },
      select: { id: true },
    });
    const shopIds = shops.map((s) => s.id);

    if (shopIds.length > 0) {
      // 2. Delete ProductAnalytics for all products in user's shops
      const products = await tx.product.findMany({
        where: { shopId: { in: shopIds } },
        select: { id: true },
      });
      const productIds = products.map((p) => p.id);

      if (productIds.length > 0) {
        const deletedAnalytics = await tx.productAnalytics.deleteMany({
          where: { productId: { in: productIds } },
        });
        console.log(`  ✓ Deleted ${deletedAnalytics.count} product analytics records`);

        // 3. Delete ProductVariants
        const deletedVariants = await tx.productVariant.deleteMany({
          where: { productId: { in: productIds } },
        });
        console.log(`  ✓ Deleted ${deletedVariants.count} product variants`);
      }

      // 4. Delete Products
      const deletedProducts = await tx.product.deleteMany({
        where: { shopId: { in: shopIds } },
      });
      console.log(`  ✓ Deleted ${deletedProducts.count} products`);

      // 5. Delete FieldMappings (has CASCADE but being explicit)
      const deletedMappings = await tx.fieldMapping.deleteMany({
        where: { shopId: { in: shopIds } },
      });
      console.log(`  ✓ Deleted ${deletedMappings.count} field mappings`);

      // 6. Delete FeedSnapshots (has CASCADE but being explicit)
      const deletedSnapshots = await tx.feedSnapshot.deleteMany({
        where: { shopId: { in: shopIds } },
      });
      console.log(`  ✓ Deleted ${deletedSnapshots.count} feed snapshots`);

      // 7. Delete SyncBatches
      const deletedBatches = await tx.syncBatch.deleteMany({
        where: { shopId: { in: shopIds } },
      });
      console.log(`  ✓ Deleted ${deletedBatches.count} sync batches`);

      // 8. Delete ShopAnalytics
      const deletedShopAnalytics = await tx.shopAnalytics.deleteMany({
        where: { shopId: { in: shopIds } },
      });
      console.log(`  ✓ Deleted ${deletedShopAnalytics.count} shop analytics records`);

      // 9. Delete Shops
      const deletedShops = await tx.shop.deleteMany({
        where: { userId },
      });
      console.log(`  ✓ Deleted ${deletedShops.count} shops`);
    }

    // 10. Delete VerificationTokens (has CASCADE but being explicit)
    const deletedTokens = await tx.verificationToken.deleteMany({
      where: { userId },
    });
    console.log(`  ✓ Deleted ${deletedTokens.count} verification tokens`);

    // 11. Delete AccountDeletion record if exists
    const deletedAccountDeletion = await tx.accountDeletion.deleteMany({
      where: { userId },
    });
    console.log(`  ✓ Deleted ${deletedAccountDeletion.count} account deletion records`);

    // 12. Delete AnalyticsWaitlist (has SET NULL but we're deleting the user anyway)
    const deletedWaitlist = await tx.analyticsWaitlist.deleteMany({
      where: { userId },
    });
    console.log(`  ✓ Deleted ${deletedWaitlist.count} analytics waitlist entries`);

    // 13. Delete UserSettings
    const deletedSettings = await tx.userSettings.deleteMany({
      where: { userId },
    });
    console.log(`  ✓ Deleted ${deletedSettings.count} user settings records`);

    // 14. Finally, delete the User
    await tx.user.delete({
      where: { id: userId },
    });
    console.log(`  ✓ Deleted user`);
  });

  console.log('\n✅ User and all related data have been permanently deleted.');
}

// Main execution
async function main() {
  try {
    // Delete "Maxence Debette"
    await deleteUserByName('Maxence', 'Debette');
  } catch (error) {
    console.error('❌ Error during deletion:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
