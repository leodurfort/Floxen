import { PrismaClient } from '@prisma/client';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import { decrypt } from './apps/api/src/lib/encryption';

const prisma = new PrismaClient();

async function updateSellerInfo() {
  const shop = await prisma.shop.findUnique({
    where: { id: 'cmjbrfxq1000114nj8i9keri3' }
  });

  if (!shop) {
    console.error('Shop not found');
    return;
  }

  console.log('Current shop data:', {
    id: shop.id,
    sellerName: shop.sellerName,
    sellerUrl: shop.sellerUrl,
    wooStoreUrl: shop.wooStoreUrl
  });

  // Fetch from WordPress API
  const api = new WooCommerceRestApi({
    url: shop.wooStoreUrl,
    consumerKey: decrypt(shop.wooConsumerKey!),
    consumerSecret: decrypt(shop.wooConsumerSecret!),
    version: 'wc/v3'
  });

  try {
    // First, let's see what endpoints are available at the WordPress REST API root
    console.log('Checking WordPress REST API root...');
    const wpRootResponse = await api.get('/wp-json/');
    console.log('WordPress REST API root:', JSON.stringify(wpRootResponse.data, null, 2).substring(0, 500));

    // Try to get site info from root
    const rootData = wpRootResponse.data;
    console.log('Site name from root:', rootData.name);
    console.log('Site URL from root:', rootData.url);

    const wpSettings = {
      title: rootData.name,
      url: rootData.url
    };

    console.log('WordPress settings extracted:', {
      title: wpSettings.title,
      url: wpSettings.url
    });

    // Update shop
    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        sellerName: wpSettings.title || null,
        sellerUrl: wpSettings.url || null
      }
    });

    console.log('✅ Updated shop with sellerName:', wpSettings.title, 'and sellerUrl:', wpSettings.url);
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

updateSellerInfo();
