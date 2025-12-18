/**
 * Clear field mappings for attributes that should now be null
 * Run this after updating openai-feed-spec.ts to remove default mappings
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// List of attributes that should have null mappings (user-configurable)
const ATTRIBUTES_TO_CLEAR = [
  'mpn',
  'condition',
  'age_group',
  'video_link',
  'model_3d_link',
  'unit_pricing_measure',
  'unit_pricing_base_measure',
  'pricing_trend',
  'availability_date',
  'expiration_date',
  'pickup_method',
  'pickup_sla',
  'color',
  'size',
  'size_system',
  'gender',
  'offer_id',
  'custom_variant1_category',
  'custom_variant1_option',
  'custom_variant2_category',
  'custom_variant2_option',
  'custom_variant3_category',
  'custom_variant3_option',
  'shipping',
  'delivery_estimate',
  'popularity_score',
  'return_rate',
  'warning',
  'warning_url',
  'age_restriction',
  'product_review_count',
  'product_review_rating',
  'store_review_count',
  'store_review_rating',
  'q_and_a',
  'raw_review_data',
  'relationship_type',
  'geo_price',
  'geo_availability',
];

async function clearFieldMappings() {
  try {
    // Get all shops
    const shops = await prisma.shop.findMany({
      select: {
        id: true,
        shopName: true,
        fieldMappings: true,
      },
    });

    console.log(`Found ${shops.length} shops\n`);

    for (const shop of shops) {
      const mappings = shop.fieldMappings || {};
      let updated = false;
      let clearedCount = 0;

      // Remove mappings for attributes that should be null
      for (const attr of ATTRIBUTES_TO_CLEAR) {
        if (mappings[attr]) {
          console.log(`  - Clearing ${attr}: ${mappings[attr]}`);
          delete mappings[attr];
          updated = true;
          clearedCount++;
        }
      }

      if (updated) {
        console.log(`\n🔧 Shop: ${shop.shopName || shop.id}`);
        console.log(`   Cleared ${clearedCount} field mappings\n`);

        await prisma.shop.update({
          where: { id: shop.id },
          data: { fieldMappings: mappings },
        });
      } else {
        console.log(`✅ Shop: ${shop.shopName || shop.id} - No mappings to clear\n`);
      }
    }

    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearFieldMappings();
