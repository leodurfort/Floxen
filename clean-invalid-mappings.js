/**
 * Script to clean invalid field mappings
 * Removes mappings that reference WooCommerce fields that no longer exist
 *
 * Run with: DATABASE_URL="..." node clean-invalid-mappings.js [shopId]
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanInvalidMappings(shopId) {
  console.log(`\n🧹 Cleaning invalid mappings for shop: ${shopId}`);

  // Fetch shop
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
  });

  if (!shop) {
    console.error(`❌ Shop not found: ${shopId}`);
    return;
  }

  console.log(`   Shop: ${shop.shopName || shop.wooStoreUrl}`);

  // Get current field mappings
  const currentMappings = shop.fieldMappings || {};
  console.log(`   Current mappings count: ${Object.keys(currentMappings).length}`);

  // Fetch all valid WooCommerce fields from database
  const validFields = await prisma.wooCommerceField.findMany({
    select: { value: true },
  });

  const validFieldValues = new Set(validFields.map(f => f.value));
  console.log(`   Valid WooCommerce fields: ${validFieldValues.size}`);

  // Special mappings that should be preserved (toggle fields, locked fields, etc.)
  const specialMappings = new Set(['ENABLED', 'DISABLED', 'id', 'title', 'link', 'availability']);

  // Find invalid mappings
  const invalidMappings = [];
  const cleanedMappings = {};

  for (const [attribute, wooField] of Object.entries(currentMappings)) {
    // Skip if no mapping
    if (!wooField || wooField === null) {
      cleanedMappings[attribute] = wooField;
      continue;
    }

    // Preserve special mappings
    if (specialMappings.has(wooField)) {
      cleanedMappings[attribute] = wooField;
      continue;
    }

    // Check if the WooCommerce field exists
    if (validFieldValues.has(wooField)) {
      cleanedMappings[attribute] = wooField;
    } else {
      invalidMappings.push({ attribute, wooField });
      console.log(`   ⚠️  Invalid mapping: ${attribute} -> ${wooField}`);
      // Set to null instead of removing
      cleanedMappings[attribute] = null;
    }
  }

  if (invalidMappings.length === 0) {
    console.log('✅ No invalid mappings found!');
    return;
  }

  console.log(`\n🔧 Found ${invalidMappings.length} invalid mapping(s)`);
  console.log('   Removing invalid mappings...');

  // Update shop with cleaned mappings
  await prisma.shop.update({
    where: { id: shopId },
    data: {
      fieldMappings: cleanedMappings,
      updatedAt: new Date(),
    },
  });

  console.log('✅ Invalid mappings cleaned successfully!');
  console.log(`   Removed: ${invalidMappings.length} invalid mapping(s)`);
  console.log(`   Remaining: ${Object.keys(cleanedMappings).filter(k => cleanedMappings[k]).length} valid mapping(s)`);
}

async function cleanAllShops() {
  console.log('🔍 Fetching all shops...\n');

  const shops = await prisma.shop.findMany({
    select: { id: true, shopName: true, wooStoreUrl: true },
  });

  console.log(`Found ${shops.length} shop(s)\n`);

  for (const shop of shops) {
    try {
      await cleanInvalidMappings(shop.id);
    } catch (error) {
      console.error(`❌ Error cleaning shop ${shop.id}:`, error.message);
    }
  }
}

async function main() {
  const shopId = process.argv[2];

  if (shopId) {
    // Clean specific shop
    await cleanInvalidMappings(shopId);
  } else {
    // Clean all shops
    await cleanAllShops();
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});
