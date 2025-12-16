/**
 * ⚠️ DEVELOPMENT/TESTING ONLY - DO NOT USE IN PRODUCTION ⚠️
 *
 * This is an in-memory mock data store for local development and testing.
 * It provides demo users, shops, and products without requiring a database.
 *
 * LIMITATIONS:
 * - Data is stored in memory and resets on server restart
 * - Not thread-safe or scalable
 * - No persistence across deployments
 * - Should be replaced with real Prisma database calls in production
 *
 * TODO: Remove all references to mockStore and use Prisma exclusively
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  Product,
  ProductStatus,
  Shop,
  SubscriptionTier,
  SyncStatus,
  User,
} from '@productsynch/shared';

type StoredUser = User & { passwordHash: string };

const users: StoredUser[] = [];
const shops: Shop[] = [];
const products: Product[] = [];

function now() {
  return new Date().toISOString();
}

function seed() {
  if (users.length) return;
  const demoUser: StoredUser = {
    id: 'user_demo',
    email: 'demo@productsynch.com',
    name: 'Demo User',
    subscriptionTier: 'FREE',
    createdAt: now(),
    updatedAt: now(),
    passwordHash: bcrypt.hashSync('password123', 10),
  };

  const demoShop: Shop = {
    id: 'shop_demo',
    userId: demoUser.id,
    shopName: 'Demo Goods',
    shopCurrency: 'USD',
    isConnected: true,
    lastSyncAt: now(),
    syncStatus: 'COMPLETED',
    syncEnabled: true,
    openaiEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  };

  const demoProducts: Product[] = [
    {
      id: 'prod_a',
      shopId: demoShop.id,
      wooProductId: 101,
      wooTitle: 'Lumen Desk Lamp',
      wooDescription: 'Minimal lamp with adjustable neck and warm LED.',
      wooSku: 'LAMP-101',
      wooPrice: '120.00',
      status: 'SYNCED',
      syncStatus: 'COMPLETED',
      lastSyncedAt: now(),
      aiEnriched: true,
      feedEnableSearch: true,
      feedEnableCheckout: true,
      updatedAt: now(),
    },
    {
      id: 'prod_b',
      shopId: demoShop.id,
      wooProductId: 102,
      wooTitle: 'Orbit Chair',
      wooDescription: 'Ergonomic task chair with breathable mesh back.',
      wooSku: 'CHAIR-204',
      wooPrice: '320.00',
      status: 'PENDING_REVIEW' as ProductStatus,
      syncStatus: 'PENDING' as SyncStatus,
      lastSyncedAt: null,
      aiEnriched: false,
      feedEnableSearch: true,
      feedEnableCheckout: false,
      updatedAt: now(),
    },
  ];

  users.push(demoUser);
  shops.push(demoShop);
  products.push(...demoProducts);
}

seed();

export const mockStore = {
  users,
  shops,
  products,
  createUser(email: string, password: string, name?: string, tier: SubscriptionTier = 'FREE'): User {
    const user: StoredUser = {
      id: crypto.randomUUID(),
      email,
      name,
      subscriptionTier: tier,
      createdAt: now(),
      updatedAt: now(),
      passwordHash: bcrypt.hashSync(password, 10),
    };
    users.push(user);
    return user;
  },
  findUserByEmail(email: string) {
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },
  validateUser(email: string, password: string): User | null {
    const user = mockStore.findUserByEmail(email);
    if (!user) return null;
    if (!bcrypt.compareSync(password, user.passwordHash)) return null;
    return user;
  },
  getShopsForUser(userId: string) {
    return shops.filter((s) => s.userId === userId);
  },
  getShop(shopId: string) {
    return shops.find((s) => s.id === shopId);
  },
  createShop(userId: string, shopName: string, shopCurrency = 'USD'): Shop {
    const shop: Shop = {
      id: crypto.randomUUID(),
      userId,
      shopName,
      shopCurrency,
      isConnected: false,
      lastSyncAt: null,
      syncStatus: 'PENDING',
      syncEnabled: true,
      openaiEnabled: false,
      createdAt: now(),
      updatedAt: now(),
    };
    shops.push(shop);
    return shop;
  },
  updateShop(shopId: string, payload: Partial<Shop>) {
    const shop = shops.find((s) => s.id === shopId);
    if (!shop) return null;
    Object.assign(shop, payload, { updatedAt: now() });
    return shop;
  },
  getProducts(shopId: string) {
    return products.filter((p) => p.shopId === shopId);
  },
  getProduct(shopId: string, productId: string) {
    return products.find((p) => p.shopId === shopId && p.id === productId);
  },
  updateProduct(shopId: string, productId: string, payload: Partial<Product>) {
    const product = products.find((p) => p.shopId === shopId && p.id === productId);
    if (!product) return null;
    Object.assign(product, payload, { updatedAt: now() });
    return product;
  },
};
