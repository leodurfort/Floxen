const { Client } = require('pg');

// Usage: node fix-variation-selection-raw.js "postgresql://..."
const connectionString = process.argv[2];

if (!connectionString) {
  console.error('Usage: node fix-variation-selection-raw.js "postgresql://..."');
  process.exit(1);
}

async function fixVariationSelection() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('Connected to database');

    // Find all selected parent products (products without woo_parent_id that are selected)
    const parentResult = await client.query(`
      SELECT id, shop_id, woo_product_id
      FROM "Product"
      WHERE is_selected = true
      AND woo_parent_id IS NULL
    `);

    console.log(`Found ${parentResult.rows.length} selected parent products`);

    let totalUpdated = 0;

    for (const parent of parentResult.rows) {
      // Update all variations of this parent that have isSelected=false
      const updateResult = await client.query(`
        UPDATE "Product"
        SET is_selected = true
        WHERE shop_id = $1
        AND woo_parent_id = $2
        AND is_selected = false
      `, [parent.shop_id, parent.woo_product_id]);

      if (updateResult.rowCount > 0) {
        console.log(`Parent ${parent.woo_product_id} (shop ${parent.shop_id}): Updated ${updateResult.rowCount} variations`);
        totalUpdated += updateResult.rowCount;
      }
    }

    console.log(`\nTotal variations updated: ${totalUpdated}`);
    console.log('Fix completed successfully!');
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

fixVariationSelection()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
