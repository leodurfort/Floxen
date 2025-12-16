import { prisma } from '../lib/prisma';
import { encrypt } from '../lib/encryption';
import { env } from '../config/env';
import { OPENAI_FEED_SPEC } from '../config/openai-feed-spec';

export async function listShopsByUser(userId: string) {
  return prisma.shop.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

export async function createShop(params: {
  userId: string;
  storeUrl: string;
  shopName?: string;
  shopCurrency?: string;
  consumerKey?: string;
  consumerSecret?: string;
}) {
  const { userId, storeUrl, shopName, shopCurrency, consumerKey, consumerSecret } = params;
  return prisma.shop.create({
    data: {
      userId,
      wooStoreUrl: storeUrl,
      wooConsumerKey: consumerKey ? encrypt(consumerKey) : null,
      wooConsumerSecret: consumerSecret ? encrypt(consumerSecret) : null,
      shopName: shopName || new URL(storeUrl).hostname,
      shopCurrency: shopCurrency || 'USD',
    },
  });
}

export async function getShop(shopId: string) {
  return prisma.shop.findUnique({ where: { id: shopId } });
}

export async function updateShop(shopId: string, data: Partial<Parameters<typeof prisma.shop.update>[0]['data']>) {
  return prisma.shop.update({
    where: { id: shopId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

export async function disconnectShop(shopId: string) {
  return prisma.shop.update({
    where: { id: shopId },
    data: {
      isConnected: false,
      syncEnabled: false,
      wooConsumerKey: null,
      wooConsumerSecret: null,
    },
  });
}

export async function deleteShop(shopId: string) {
  // Delete all related data in the correct order to respect foreign key constraints
  // First, delete ProductVariants (they reference Products)
  await prisma.productVariant.deleteMany({
    where: {
      product: {
        shopId: shopId,
      },
    },
  });

  // Delete ProductAnalytics (they reference Products)
  await prisma.productAnalytics.deleteMany({
    where: {
      product: {
        shopId: shopId,
      },
    },
  });

  // Delete Products (they reference Shop)
  await prisma.product.deleteMany({
    where: {
      shopId: shopId,
    },
  });

  // Delete SyncBatches (they reference Shop)
  await prisma.syncBatch.deleteMany({
    where: {
      shopId: shopId,
    },
  });

  // Delete ShopAnalytics (they reference Shop)
  await prisma.shopAnalytics.deleteMany({
    where: {
      shopId: shopId,
    },
  });

  // Finally, delete the Shop itself
  return prisma.shop.delete({
    where: { id: shopId },
  });
}

export function buildWooAuthUrl(storeUrl: string, userId: string, shopId: string) {
  const baseCallback = env.wooRedirectUri || 'http://localhost:3001/api/v1/shops/:id/oauth/callback';
  const callback = baseCallback.replace(':id', shopId);

  // return_url: where to redirect user after approval (frontend)
  // callback_url: where to POST credentials (API)
  const returnUrl = `http://localhost:3000/dashboard?shop=${shopId}&connected=true`;

  const url = new URL('/wc-auth/v1/authorize', storeUrl);
  url.searchParams.set('app_name', 'ProductSynch');
  url.searchParams.set('scope', 'read_write');
  url.searchParams.set('user_id', userId);
  url.searchParams.set('return_url', returnUrl);
  url.searchParams.set('callback_url', callback);
  return url.toString();
}

export async function setWooCredentials(shopId: string, consumerKey: string, consumerSecret: string) {
  return prisma.shop.update({
    where: { id: shopId },
    data: {
      wooConsumerKey: encrypt(consumerKey),
      wooConsumerSecret: encrypt(consumerSecret),
      isConnected: true,
      syncStatus: 'PENDING',
      updatedAt: new Date(),
    },
  });
}

/**
 * Generate default field mappings from OpenAI feed spec
 * Returns a mapping of openai_attribute -> woocommerce_field_path
 */
export function getDefaultMappings(): Record<string, string> {
  const mappings: Record<string, string> = {};

  for (const spec of OPENAI_FEED_SPEC) {
    const mapping = spec.wooCommerceMapping;

    if (!mapping) continue;

    // Shop-level fields get special "shop." prefix
    if (mapping.shopField) {
      mappings[spec.attribute] = `shop.${mapping.shopField}`;
    }
    // Product-level fields use the field path directly
    else if (mapping.field) {
      mappings[spec.attribute] = mapping.field;
    }
  }

  return mappings;
}
