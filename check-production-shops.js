const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:TGVvrsGqOnSSoUjgPETPJJIMHPhKjgHQ@switchyard.proxy.rlwy.net:33992/railway'
});

async function listShops() {
  try {
    const shops = await prisma.shop.findMany({
      select: {
        id: true,
        shopName: true,
        wooStoreUrl: true,
        shopCurrency: true,
        dimensionUnit: true,
        weightUnit: true,
        sellerName: true,
        sellerUrl: true,
        isConnected: true,
        lastSyncAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('\n📊 Recent Shops in Production Database:\n');
    shops.forEach((shop, idx) => {
      console.log(`\n${idx + 1}. Shop ID: ${shop.id}`);
      console.log(`   Name: ${shop.shopName || '(null)'}`);
      console.log(`   URL: ${shop.wooStoreUrl || '(null)'}`);
      console.log(`   Currency: ${shop.shopCurrency || '(null)'}`);
      console.log(`   Dimension Unit: ${shop.dimensionUnit || '(null)'}`);
      console.log(`   Weight Unit: ${shop.weightUnit || '(null)'}`);
      console.log(`   Seller Name: ${shop.sellerName || '(null)'}`);
      console.log(`   Seller URL: ${shop.sellerUrl || '(null)'}`);
      console.log(`   Connected: ${shop.isConnected}`);
      console.log(`   Last Sync: ${shop.lastSyncAt || '(never)'}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listShops();
