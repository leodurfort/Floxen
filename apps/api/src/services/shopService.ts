import { prisma } from '../lib/prisma';
import { encrypt } from '../lib/encryption';
import { env } from '../config/env';

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

export function buildWooAuthUrl(storeUrl: string, userId: string, shopId: string) {
  const baseCallback = env.wooRedirectUri || 'http://localhost:3001/api/v1/shops/:id/oauth/callback';
  const callback = baseCallback.replace(':id', shopId);
  const url = new URL('/wc-auth/v1/authorize', storeUrl);
  url.searchParams.set('app_name', 'ProductSynch');
  url.searchParams.set('scope', 'read_write');
  url.searchParams.set('user_id', userId);
  url.searchParams.set('return_url', callback);
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
