import { prisma } from '../lib/prisma';
import { encrypt } from '../lib/encryption';
import { env } from '../config/env';
import { fetchStoreSettings } from './wooClient';
import { logger } from '../lib/logger';

export async function listShopsByUser(userId: string) {
  const shops = await prisma.shop.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          products: {
            where: { isValid: true },
          },
        },
      },
    },
  });

  // Transform to include validProductCount
  return shops.map((shop) => ({
    ...shop,
    validProductCount: shop._count.products,
    _count: undefined,
  }));
}

export async function createShop(params: {
  userId: string;
  storeUrl: string;
  consumerKey?: string;
  consumerSecret?: string;
}) {
  const { userId, storeUrl, consumerKey, consumerSecret } = params;

  // Check if this store URL is already linked to any account
  const existingShop = await prisma.shop.findUnique({
    where: { wooStoreUrl: storeUrl },
  });

  if (existingShop) {
    throw new Error('This WooCommerce store is already connected to another account');
  }

  return prisma.shop.create({
    data: {
      userId,
      wooStoreUrl: storeUrl,
      wooConsumerKey: consumerKey ? encrypt(consumerKey) : null,
      wooConsumerSecret: consumerSecret ? encrypt(consumerSecret) : null,
      shopCurrency: null, // Will be populated after OAuth from WooCommerce API
      sellerName: null, // Will be populated after OAuth from WooCommerce API
      sellerUrl: null, // Will be populated after OAuth from WooCommerce API
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
  // Use transaction to ensure all-or-nothing deletion
  return prisma.$transaction(async (tx) => {
    // Delete all related data in the correct order to respect foreign key constraints
    await tx.productVariant.deleteMany({
      where: { product: { shopId } },
    });

    await tx.productAnalytics.deleteMany({
      where: { product: { shopId } },
    });

    await tx.product.deleteMany({
      where: { shopId },
    });

    await tx.syncBatch.deleteMany({
      where: { shopId },
    });

    await tx.shopAnalytics.deleteMany({
      where: { shopId },
    });

    return tx.shop.delete({
      where: { id: shopId },
    });
  });
}

export function buildWooAuthUrl(storeUrl: string, userId: string, shopId: string) {
  // callback_url: where WooCommerce POSTs credentials (API endpoint)
  if (!env.wooRedirectUri) {
    throw new Error('WOO_REDIRECT_URI environment variable is required for OAuth');
  }
  const callback = env.wooRedirectUri.replace(':id', shopId);

  // return_url: where to redirect user after approval (frontend)
  if (!env.webBaseUrl) {
    throw new Error('WEB_BASE_URL environment variable is required for OAuth');
  }
  const returnUrl = `${env.webBaseUrl}/shops?shop=${shopId}&connected=true`;

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
  });

  // Check if settings changed (important for reconnection scenarios where products already exist)
  const settingsChanged =
    (settings?.shopCurrency && shop.shopCurrency !== settings.shopCurrency) ||
    (settings?.dimensionUnit && shop.dimensionUnit !== settings.dimensionUnit) ||
    (settings?.weightUnit && shop.weightUnit !== settings.weightUnit);

  // Update shop with credentials and fetched settings
  return prisma.shop.update({
    where: { id: shopId },
    data: {
      wooConsumerKey: encrypt(consumerKey),
      wooConsumerSecret: encrypt(consumerSecret),
      isConnected: true,
      syncStatus: 'PENDING',
      shopCurrency: settings?.shopCurrency || shop.shopCurrency,
      dimensionUnit: settings?.dimensionUnit,
      weightUnit: settings?.weightUnit,
      // Populate sellerUrl from wooStoreUrl if not already set
      sellerUrl: shop.sellerUrl || shop.wooStoreUrl,
      // sellerName, sellerPrivacyPolicy, sellerTos, returnPolicy, returnWindow are user-input only (preserve existing values)
      // If settings changed during disconnection, trigger product reprocessing
      ...(settingsChanged && { shopSettingsUpdatedAt: new Date() }),
      updatedAt: new Date(),
    },
  });
}

