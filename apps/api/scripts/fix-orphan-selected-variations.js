const { Client } = require('pg');

// Usage: node fix-orphan-selected-variations.js "postgresql://..."
const connectionString = process.argv[2];

if (!connectionString) {
  console.error('Usage: node fix-orphan-selected-variations.js "postgresql://..."');
  process.exit(1);
}

/**
 * Fix orphan selected variations
 *
 * Problem: Variations were left with isSelected=true even when their
 * parent product was deselected. This causes the catalog to show
 * more items than expected.
 *
 * Fix: Deselect variations whose parent is not selected
 */
async function fixOrphanSelectedVariations() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('Connected to database');

    // Find variations that are selected but their parent is not selected
    const orphanResult = await client.query(`
      UPDATE "Product" AS variation
      SET is_selected = false
      WHERE variation.woo_parent_id IS NOT NULL
        AND variation.is_selected = true
        AND NOT EXISTS (
          SELECT 1 FROM "Product" AS parent
          WHERE parent.shop_id = variation.shop_id
            AND parent.woo_product_id = variation.woo_parent_id
            AND parent.is_selected = true
        )
      RETURNING variation.id, variation.shop_id, variation.woo_product_id, variation.woo_parent_id
    `);

    console.log(`\nDeselected ${orphanResult.rowCount} orphan variations:`);

    // Group by shop for summary
    const byShop = {};
    for (const row of orphanResult.rows) {
      if (!byShop[row.shop_id]) byShop[row.shop_id] = 0;
      byShop[row.shop_id]++;
    }

    for (const [shopId, count] of Object.entries(byShop)) {
      console.log(`  Shop ${shopId}: ${count} variations deselected`);
    }

    console.log('\nFix completed successfully!');
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

fixOrphanSelectedVariations()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
