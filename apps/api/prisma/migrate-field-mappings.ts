import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Migrates existing fieldMappings JSON data from Shop table
 * to the new FieldMapping table with proper foreign key relationships.
 */
async function migrateFieldMappings() {
  console.log('🔄 Starting field mappings data migration...');

  // Get all shops with field mappings
  const shops = await prisma.shop.findMany({
    where: {
      fieldMappings: {
        not: null,
      },
    },
    select: {
      id: true,
      shopName: true,
      fieldMappings: true,
    },
  });

  console.log(`Found ${shops.length} shops with field mappings to migrate`);

  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const shop of shops) {
    console.log(`\n📦 Migrating shop: ${shop.shopName} (${shop.id})`);

    const mappings = shop.fieldMappings as Record<string, string> | null;
    if (!mappings || typeof mappings !== 'object') {
      console.log(`  ⚠️  Invalid or empty mappings, skipping`);
      continue;
    }

    const entries = Object.entries(mappings);
    console.log(`  Found ${entries.length} mappings`);

    for (const [openaiAttribute, wooFieldValue] of entries) {
      try {
        // Find the OpenAI field by attribute name
        const openaiField = await prisma.openAIField.findUnique({
          where: { attribute: openaiAttribute },
        });

        if (!openaiField) {
          console.log(`  ⚠️  OpenAI field "${openaiAttribute}" not found in reference table, skipping`);
          totalSkipped++;
          continue;
        }

        // Handle special toggle values ("ENABLED" / "DISABLED")
        let wooField = null;
        if (wooFieldValue && wooFieldValue !== 'ENABLED' && wooFieldValue !== 'DISABLED') {
          // Try to find the WooCommerce field by value
          wooField = await prisma.wooCommerceField.findUnique({
            where: { value: wooFieldValue },
          });

          if (!wooField) {
            console.log(`  ⚠️  WooCommerce field "${wooFieldValue}" not found in reference table for "${openaiAttribute}", skipping`);
            totalSkipped++;
            continue;
          }
        }

        // Create or update the field mapping
        await prisma.fieldMapping.upsert({
          where: {
            shopId_openaiFieldId: {
              shopId: shop.id,
              openaiFieldId: openaiField.id,
            },
          },
          create: {
            shopId: shop.id,
            openaiFieldId: openaiField.id,
            wooFieldId: wooField?.id || null,
          },
          update: {
            wooFieldId: wooField?.id || null,
          },
        });

        console.log(`  ✅ Migrated: ${openaiAttribute} → ${wooFieldValue || 'null'}`);
        totalMigrated++;
      } catch (error) {
        console.error(`  ❌ Error migrating "${openaiAttribute}":`, error);
        totalErrors++;
      }
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`  ✅ Successfully migrated: ${totalMigrated}`);
  console.log(`  ⚠️  Skipped (invalid data): ${totalSkipped}`);
  console.log(`  ❌ Errors: ${totalErrors}`);

  console.log(`\n✨ Data migration completed!`);
  console.log(`\nNote: Old fieldMappings JSON in Shop table has been kept for backup.`);
  console.log(`You can manually remove it later by running:`);
  console.log(`  UPDATE "Shop" SET field_mappings = NULL;`);
}

migrateFieldMappings()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
