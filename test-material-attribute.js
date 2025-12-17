/**
 * Test script to debug Material attribute extraction for product ID 64
 * Run with: node test-material-attribute.js
 */

const fetch = require('node-fetch');

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN; // Set this via command line
const SHOP_ID = process.env.SHOP_ID; // Set this via command line
const PRODUCT_ID = 64;

async function testMaterialAttribute() {
  console.log('='.repeat(80));
  console.log('Testing Material Attribute Extraction');
  console.log('='.repeat(80));
  console.log(`API URL: ${API_URL}`);
  console.log(`Shop ID: ${SHOP_ID}`);
  console.log(`Product ID: ${PRODUCT_ID}`);
  console.log('');

  if (!ACCESS_TOKEN || !SHOP_ID) {
    console.error('❌ ERROR: Missing environment variables');
    console.error('Usage: ACCESS_TOKEN=your_token SHOP_ID=your_shop_id node test-material-attribute.js');
    process.exit(1);
  }

  try {
    // Fetch the product from the API
    console.log(`Fetching product ${PRODUCT_ID} from shop ${SHOP_ID}...`);
    const response = await fetch(
      `${API_URL}/api/v1/shops/${SHOP_ID}/products/${PRODUCT_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const product = data.product;

    console.log('✅ Product fetched successfully\n');

    // Display product info
    console.log('Product Info:');
    console.log('-'.repeat(80));
    console.log(`  ID: ${product.id}`);
    console.log(`  Name: ${product.name}`);
    console.log(`  Type: ${product.type}`);
    console.log(`  Parent ID: ${product.parent_id || 'N/A (not a variation)'}`);
    console.log('');

    // Display attributes
    console.log('Attributes Array:');
    console.log('-'.repeat(80));
    if (!product.attributes || product.attributes.length === 0) {
      console.log('  ⚠️  No attributes found');
    } else {
      product.attributes.forEach((attr, index) => {
        console.log(`  [${index}] ${JSON.stringify(attr, null, 2)}`);
      });
    }
    console.log('');

    // Look for Material attribute specifically
    console.log('Material Attribute Search:');
    console.log('-'.repeat(80));
    const materialAttr = product.attributes?.find((a) =>
      a.name && a.name.toLowerCase() === 'material'
    );

    if (!materialAttr) {
      console.log('  ❌ Material attribute NOT FOUND');
      console.log('  Available attribute names:', product.attributes?.map(a => a.name).join(', ') || 'none');
    } else {
      console.log('  ✅ Material attribute FOUND:');
      console.log(`     Raw: ${JSON.stringify(materialAttr, null, 2)}`);
      console.log('');
      console.log('  Extraction Results:');

      // Test variation format (option)
      if (materialAttr.option !== undefined && materialAttr.option !== null) {
        console.log(`     ✅ Has "option" (variation format): "${materialAttr.option}"`);
      } else {
        console.log(`     ❌ No "option" field (variation format)`);
      }

      // Test parent format (options array)
      if (Array.isArray(materialAttr.options) && materialAttr.options.length > 0) {
        const value = materialAttr.options.length === 1
          ? materialAttr.options[0]
          : materialAttr.options.join(', ');
        console.log(`     ✅ Has "options" (parent format): ${JSON.stringify(materialAttr.options)}`);
        console.log(`     Extracted value: "${value}"`);
      } else {
        console.log(`     ❌ No "options" array (parent format)`);
      }

      // Final extraction result
      const extractedValue = materialAttr.option !== undefined && materialAttr.option !== null
        ? materialAttr.option
        : (Array.isArray(materialAttr.options) && materialAttr.options.length > 0)
          ? (materialAttr.options.length === 1 ? materialAttr.options[0] : materialAttr.options.join(', '))
          : null;

      console.log('');
      console.log(`  📦 FINAL EXTRACTED VALUE: ${extractedValue === null ? 'NULL' : `"${extractedValue}"`}`);
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('Full Product JSON (for debugging):');
    console.log('='.repeat(80));
    console.log(JSON.stringify(product, null, 2));

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testMaterialAttribute();
