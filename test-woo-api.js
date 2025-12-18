/**
 * Test WooCommerce API to see what data is returned
 * Run with: node test-woo-api.js
 */

const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;

// Your shop credentials - get from Railway database
const SHOP_URL = 'https://ecom-leo18eccdeac6a3-hczqs.wpcomstaging.com';
const CONSUMER_KEY = 'ck_your_key_here'; // Replace with actual key
const CONSUMER_SECRET = 'cs_your_secret_here'; // Replace with actual secret

async function testWooAPI() {
  console.log('🧪 Testing WooCommerce API...\n');

  const api = new WooCommerceRestApi({
    url: SHOP_URL,
    consumerKey: CONSUMER_KEY,
    consumerSecret: CONSUMER_SECRET,
    version: 'wc/v3'
  });

  try {
    // Test 1: Index endpoint
    console.log('📋 Test 1: Index Endpoint (GET /wp-json/wc/v3)');
    console.log('=' .repeat(60));
    const indexResponse = await api.get('');
    const storeInfo = indexResponse.data || {};
    console.log('Store Name:', storeInfo.name);
    console.log('Store URL:', storeInfo.url);
    console.log('Description:', storeInfo.description);
    console.log('Full response:', JSON.stringify(storeInfo, null, 2));
    console.log('\n');

    // Test 2: General settings
    console.log('⚙️  Test 2: General Settings');
    console.log('=' .repeat(60));
    const generalResponse = await api.get('settings/general');
    const settings = Array.isArray(generalResponse.data) ? generalResponse.data : [];

    const currency = settings.find(s => s.id === 'woocommerce_currency');
    const storeAddress = settings.find(s => s.id === 'woocommerce_store_address');
    const storeUrl = settings.find(s => s.id === 'woocommerce_store_url');

    console.log('Currency:', currency?.value || 'NOT FOUND');
    console.log('Store Address Setting:', storeAddress?.value || 'NOT FOUND');
    console.log('Store URL Setting:', storeUrl?.value || 'NOT FOUND');
    console.log('\nAll general settings:');
    settings.forEach(s => {
      console.log(`  - ${s.id}: ${s.value}`);
    });
    console.log('\n');

    // Test 3: Products settings
    console.log('📦 Test 3: Products Settings');
    console.log('=' .repeat(60));
    const productsResponse = await api.get('settings/products');
    const productSettings = Array.isArray(productsResponse.data) ? productsResponse.data : [];

    const dimensionUnit = productSettings.find(s => s.id === 'woocommerce_dimension_unit');
    const weightUnit = productSettings.find(s => s.id === 'woocommerce_weight_unit');

    console.log('Dimension Unit:', dimensionUnit?.value || 'NOT FOUND');
    console.log('Weight Unit:', weightUnit?.value || 'NOT FOUND');
    console.log('\nAll product settings:');
    productSettings.forEach(s => {
      console.log(`  - ${s.id}: ${s.value}`);
    });

    // Summary
    console.log('\n');
    console.log('📊 SUMMARY');
    console.log('=' .repeat(60));
    console.log('✅ Index name:', storeInfo.name || '(empty)');
    console.log('✅ Index url:', storeInfo.url || '(empty)');
    console.log('✅ Currency:', currency?.value || '(not found)');
    console.log('✅ Dimension Unit:', dimensionUnit?.value || '(not found)');
    console.log('✅ Weight Unit:', weightUnit?.value || '(not found)');
    console.log('✅ Store Address:', storeAddress?.value || '(not found)');
    console.log('✅ Store URL:', storeUrl?.value || '(not found)');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testWooAPI();
