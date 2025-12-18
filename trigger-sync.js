const { PrismaClient } = require('@prisma/client');
const { Queue } = require('bullmq');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:TGVvrsGqOnSSoUjgPETPJJIMHPhKjgHQ@switchyard.proxy.rlwy.net:33992/railway'
    }
  }
});

const syncQueue = new Queue('sync', {
  connection: {
    host: 'tramway.proxy.rlwy.net',
    port: 10305,
    password: 'SpVmzdREAoGwWcDPXzbbDWwfkcAOhBym'
  }
});

async function triggerSync() {
  try {
    // Get shop ID from command line argument or use first shop
    const shopIdArg = process.argv[2];

    let shop;
    if (shopIdArg) {
      shop = await prisma.shop.findUnique({
        where: { id: shopIdArg }
      });
      if (!shop) {
        console.error(`Shop with ID "${shopIdArg}" not found`);
        process.exit(1);
      }
    } else {
      shop = await prisma.shop.findFirst();
      if (!shop) {
        console.error('No shops found in database');
        process.exit(1);
      }
      console.log(`No shop ID provided, using first shop: ${shop.id} (${shop.shopName})`);
    }

    await prisma.shop.update({
      where: { id: shop.id },
      data: { syncStatus: 'SYNCING', lastSyncAt: new Date() }
    });

    await syncQueue.add('product-sync', {
      shopId: shop.id,
      type: 'FULL'
    }, {
      removeOnComplete: true,
      priority: 2
    });

    console.log('✓ Sync triggered successfully for shop:', shop.id);
    console.log('✓ Check the API logs to monitor progress');

    await prisma.$disconnect();
    await syncQueue.close();
    process.exit(0);
  } catch (error) {
    console.error('Error triggering sync:', error);
    await prisma.$disconnect();
    await syncQueue.close();
    process.exit(1);
  }
}

triggerSync();
