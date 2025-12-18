import { prisma } from '../lib/prisma';
import { encrypt } from '../lib/encryption';
import { env } from '../config/env';
import { DEFAULT_FIELD_MAPPINGS } from '../config/default-field-mappings';
import { fetchStoreSettings } from './wooClient';
import { logger } from '../lib/logger';

export async function listShopsByUser(userId: string) {
  return prisma.shop.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

export async function createShop(params: {
  userId: string;
  storeUrl: string;
  consumerKey?: string;
  consumerSecret?: string;
}) {
  const { userId, storeUrl, consumerKey, consumerSecret } = params;
  return prisma.shop.create({
    data: {
      userId,
      wooStoreUrl: storeUrl,
      wooConsumerKey: consumerKey ? encrypt(consumerKey) : null,
      wooConsumerSecret: consumerSecret ? encrypt(consumerSecret) : null,
      shopName: null, // Will be populated after OAuth from WooCommerce API
      shopCurrency: null, // Will be populated after OAuth from WooCommerce API
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
  const baseCallback = env.wooRedirectUri || 'https://api-production-6a74.up.railway.app/api/v1/shops/:id/oauth/callback';
  const callback = baseCallback.replace(':id', shopId);

  // return_url: where to redirect user after approval (frontend)
  // callback_url: where to POST credentials (API)
  const returnUrl = `https://web-production-3178a.up.railway.app/dashboard?shop=${shopId}&connected=true`;

  const url = new URL('/wc-auth/v1/authorize', storeUrl);
  url.searchParams.set('app_name', 'ProductSynch');
  url.searchParams.set('scope', 'read_write');
  url.searchParams.set('user_id', userId);
  url.searchParams.set('return_url', returnUrl);
  url.searchParams.set('callback_url', callback);
  return url.toString();
}

export async function setWooCredentials(shopId: string, consumerKey: string, consumerSecret: string) {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new Error('Shop not found');

  // Create WooCommerce client with plain text credentials (not encrypted yet)
  // Note: Don't use createWooClient() here as it expects encrypted credentials
  const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
  const wooClient = new WooCommerceRestApi({
    url: shop.wooStoreUrl,
    consumerKey: consumerKey,
    consumerSecret: consumerSecret,
    version: 'wc/v3',
  });

  // Fetch store settings from WooCommerce API
  const settings = await fetchStoreSettings(wooClient);

  logger.info('Fetched store settings from WooCommerce', {
    shopId,
    settings,
    hasSellerName: !!settings?.sellerName,
    hasSellerUrl: !!settings?.sellerUrl,
  });

  // Update shop with credentials and fetched settings
  return prisma.shop.update({
    where: { id: shopId },
    data: {
      wooConsumerKey: encrypt(consumerKey),
      wooConsumerSecret: encrypt(consumerSecret),
      isConnected: true,
      syncStatus: 'PENDING',
      shopName: settings?.shopName || shop.shopName,
      shopCurrency: settings?.shopCurrency || shop.shopCurrency,
      // Populate seller fields from WooCommerce (only sellerName and sellerUrl)
      sellerName: settings?.sellerName || shop.sellerName,
      sellerUrl: settings?.sellerUrl || shop.sellerUrl,
      // sellerPrivacyPolicy, sellerTos, returnPolicy, returnWindow are user-input only (preserve existing values)
      updatedAt: new Date(),
    },
  });
}

/**
 * Get default field mappings suggestions
 * Returns a mapping of openai_attribute -> woocommerce_field_value
 * The object is cloned to avoid accidental mutations of the defaults
 */
export function getDefaultMappings(): Record<string, string | null> {
  return { ...DEFAULT_FIELD_MAPPINGS };
}
