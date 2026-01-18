import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fix isSelected for variations whose parent product is selected
 *
 * Problem: Variations were created with isSelected=false even when their
 * parent variable product was selected. Variations should inherit the
 * parent's isSelected state.
 *
 * This script updates all variations that have isSelected=false
 * where their parent product has isSelected=true.
 */
async function fixVariationSelection() {
  try {
    console.log('Starting variation selection fix...');

    // Find all parent product IDs that are selected
    const selectedParents = await prisma.product.findMany({
      where: {
        isSelected: true,
        wooParentId: null, // Parent products don't have a parent ID
      },
      select: {
        shopId: true,
        wooProductId: true,
      },
    });

    console.log(`Found ${selectedParents.length} selected parent products`);

    let totalUpdated = 0;

    // For each selected parent, update its variations
    for (const parent of selectedParents) {
      const result = await prisma.product.updateMany({
        where: {
          shopId: parent.shopId,
          wooParentId: parent.wooProductId,
          isSelected: false,
        },
        data: {
          isSelected: true,
        },
      });

      if (result.count > 0) {
        console.log(`Parent ${parent.wooProductId} (shop ${parent.shopId}): Updated ${result.count} variations to isSelected=true`);
        totalUpdated += result.count;
      }
    }

    console.log(`\nTotal variations updated: ${totalUpdated}`);
    console.log('Fix completed successfully!');
  } catch (error) {
    console.error('Error fixing variation selection:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixVariationSelection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
