/**
 * Check field mappings for a specific shop
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkMappings() {
  const shopId = 'cmjbj5csf006d7xy1mws8mvdb';

  try {
    const mappings = await prisma.fieldMapping.findMany({
      where: { shopId },
      include: {
        openaiField: true,
        wooField: true,
      },
      orderBy: {
        openaiField: { attribute: 'asc' },
      },
    });

    console.log(`\n📊 Field Mappings for shop ${shopId}\n`);
    console.log(`Total mappings: ${mappings.length}\n`);

    for (const mapping of mappings) {
      const attr = mapping.openaiField.attribute;
      const wooField = mapping.wooField?.value || '(null)';
      console.log(`  ${attr.padEnd(30)} → ${wooField}`);
    }

    // Check specifically for problematic fields
    const problemFields = ['mpn', 'material', 'color', 'size'];
    console.log(`\n🔍 Checking specific fields:\n`);

    for (const field of problemFields) {
      const mapping = mappings.find(m => m.openaiField.attribute === field);
      if (mapping) {
        console.log(`  ${field}: MAPPED to "${mapping.wooField?.value || 'null'}"`);
      } else {
        console.log(`  ${field}: NOT IN DATABASE`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkMappings();
