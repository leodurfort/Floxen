/**
 * Script to update dimension and weight units for existing shops
 * Run with: DATABASE_URL="..." node update-shop-units.js [shopId]
 */

const { PrismaClient } = require('@prisma/client');
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const crypto = require('crypto');

const prisma = new PrismaClient();

// Encryption settings (must match your API)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!';
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function decrypt(text) {
  if (!text) return null;
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
      iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return null;
  }
}

async function fetchStoreSettings(api) {
  try {
    // Fetch general settings for store name
    const generalResponse = await api.get('settings/general');
    const generalSettings = Array.isArray(generalResponse.data) ? generalResponse.data : [];
    const storeName = generalSettings.find((s) => s.id === 'woocommerce_store_name');

    // Fetch products settings for dimension and weight units
    const productsResponse = await api.get('settings/products');
    const productSettings = Array.isArray(productsResponse.data) ? productsResponse.data : [];
    const dimensionUnitSetting = productSettings.find((s) => s.id === 'woocommerce_dimension_unit');
    const weightUnitSetting = productSettings.find((s) => s.id === 'woocommerce_weight_unit');

    // Fetch currency from general settings
    const currencySetting = generalSettings.find((s) => s.id === 'woocommerce_currency');

    return {
      shopName: storeName?.value || 'Unknown',
      shopCurrency: currencySetting?.value || 'USD',
      dimensionUnit: dimensionUnitSetting?.value || 'in',
      weightUnit: weightUnitSetting?.value || 'lb',
    };
  } catch (error) {
    console.error('Failed to fetch store settings:', error.message);
    return null;
  }
}

async function updateShopUnits(shopId) {
  console.log(`\n📦 Updating units for shop: ${shopId}`);

  // Fetch shop from database
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
  });

  if (!shop) {
    console.error(`❌ Shop not found: ${shopId}`);
    return;
  }

  console.log(`   Shop: ${shop.shopName || shop.wooStoreUrl}`);
  console.log(`   Connected: ${shop.isConnected ? 'Yes' : 'No'}`);
  console.log(`   Current dimensionUnit: ${shop.dimensionUnit || 'null'}`);
  console.log(`   Current weightUnit: ${shop.weightUnit || 'null'}`);

  if (!shop.isConnected || !shop.wooConsumerKey || !shop.wooConsumerSecret) {
    console.error('❌ Shop is not connected or missing credentials. Please reconnect the shop.');
    return;
  }

  // Decrypt credentials
  const consumerKey = decrypt(shop.wooConsumerKey);
  const consumerSecret = decrypt(shop.wooConsumerSecret);

  if (!consumerKey || !consumerSecret) {
    console.error('❌ Failed to decrypt credentials');
    return;
  }

  // Create WooCommerce API client
  const wooClient = new WooCommerceRestApi({
    url: shop.wooStoreUrl,
    consumerKey: consumerKey,
    consumerSecret: consumerSecret,
    version: 'wc/v3',
  });

  // Fetch store settings
  console.log('\n🔍 Fetching units from WooCommerce API...');
  const settings = await fetchStoreSettings(wooClient);

  if (!settings) {
    console.error('❌ Failed to fetch store settings from WooCommerce');
    return;
  }

  console.log(`   Fetched dimensionUnit: ${settings.dimensionUnit}`);
  console.log(`   Fetched weightUnit: ${settings.weightUnit}`);

  // Update shop in database
  console.log('\n💾 Updating database...');
  await prisma.shop.update({
    where: { id: shopId },
    data: {
      dimensionUnit: settings.dimensionUnit,
      weightUnit: settings.weightUnit,
      updatedAt: new Date(),
    },
  });

  console.log('✅ Shop units updated successfully!');
  console.log(`   New dimensionUnit: ${settings.dimensionUnit}`);
  console.log(`   New weightUnit: ${settings.weightUnit}`);
}

async function updateAllShops() {
  console.log('🔍 Fetching all connected shops...\n');

  const shops = await prisma.shop.findMany({
    where: {
      isConnected: true,
    },
  });

  console.log(`Found ${shops.length} connected shop(s)\n`);

  for (const shop of shops) {
    try {
      await updateShopUnits(shop.id);
    } catch (error) {
      console.error(`❌ Error updating shop ${shop.id}:`, error.message);
    }
  }
}

async function main() {
  const shopId = process.argv[2];

  if (shopId) {
    // Update specific shop
    await updateShopUnits(shopId);
  } else {
    // Update all connected shops
    await updateAllShops();
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});
