/**
 * Simple test script to debug Material attribute for product ID 64
 * Uses native Node.js https module (no dependencies)
 *
 * Usage:
 * ACCESS_TOKEN=your_token SHOP_ID=your_shop_id node test-material-simple.js
 */

const https = require('https');

const SHOP_ID = process.env.SHOP_ID;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PRODUCT_ID = 64;

if (!ACCESS_TOKEN || !SHOP_ID) {
  console.error('❌ Missing environment variables');
  console.error('Usage: ACCESS_TOKEN=your_token SHOP_ID=your_shop_id node test-material-simple.js');
  process.exit(1);
}

// Determine if using localhost or production
const isLocal = process.env.USE_LOCAL === 'true';
const host = isLocal ? 'localhost:3001' : 'api-production-6a74.up.railway.app';
const protocol = isLocal ? require('http') : https;

console.log('='.repeat(80));
console.log('Testing Material Attribute - Product ID 64');
console.log('='.repeat(80));
console.log(`Host: ${host}`);
console.log(`Shop ID: ${SHOP_ID}`);
console.log('');

const options = {
  hostname: host.split(':')[0],
  port: host.includes(':') ? host.split(':')[1] : (isLocal ? 80 : 443),
  path: `/api/v1/shops/${SHOP_ID}/products/${PRODUCT_ID}`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
};

const req = protocol.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error(`❌ HTTP ${res.statusCode}: ${res.statusMessage}`);
      console.error(data);
      process.exit(1);
    }

    try {
      const json = JSON.parse(data);
      const product = json.product;

      console.log('✅ Product fetched successfully');
      console.log('');
      console.log('Product Info:');
      console.log(`  ID: ${product.id}`);
      console.log(`  Name: ${product.name}`);
      console.log(`  Type: ${product.type}`);
      console.log(`  Parent ID: ${product.parent_id || 'N/A'}`);
      console.log('');

      console.log('Attributes:');
      console.log('-'.repeat(80));
      if (!product.attributes || product.attributes.length === 0) {
        console.log('  ⚠️  No attributes');
      } else {
        product.attributes.forEach((attr, i) => {
          console.log(`  [${i}] ${attr.name}:`);
          if (attr.option !== undefined) {
            console.log(`      option: "${attr.option}" (variation format)`);
          }
          if (attr.options !== undefined) {
            console.log(`      options: ${JSON.stringify(attr.options)} (parent format)`);
          }
        });
      }
      console.log('');

      // Find Material
      const materialAttr = product.attributes?.find((a) =>
        a.name && a.name.toLowerCase() === 'material'
      );

      console.log('Material Attribute Result:');
      console.log('-'.repeat(80));
      if (!materialAttr) {
        console.log('  ❌ NOT FOUND');
      } else {
        console.log('  ✅ FOUND:');
        console.log(`     ${JSON.stringify(materialAttr, null, 2)}`);

        // Extract value
        let value = null;
        if (materialAttr.option !== undefined && materialAttr.option !== null) {
          value = materialAttr.option;
          console.log(`  📦 Extracted (variation): "${value}"`);
        } else if (Array.isArray(materialAttr.options) && materialAttr.options.length > 0) {
          value = materialAttr.options.length === 1 ? materialAttr.options[0] : materialAttr.options.join(', ');
          console.log(`  📦 Extracted (parent): "${value}"`);
        } else {
          console.log(`  ❌ Could not extract value`);
        }
      }

      console.log('');
      console.log('='.repeat(80));
      console.log('Raw attributes JSON:');
      console.log(JSON.stringify(product.attributes, null, 2));

    } catch (error) {
      console.error('❌ Parse error:', error.message);
      console.error(data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  process.exit(1);
});

req.end();
