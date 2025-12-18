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
    const shop = await prisma.shop.findUnique({
      where: { id: 'cmjaehhf50001m6s7prcf7skj' }
    });

    if (!shop) {
      console.error('Shop not found');
      process.exit(1);
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
