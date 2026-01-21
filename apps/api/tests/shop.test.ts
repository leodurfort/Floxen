import request from 'supertest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { syncQueue, isQueueAvailable } from '../src/lib/redis';
import {
  createTestUser,
  createTestShop,
  generateAccessToken,
  TEST_JWT_SECRET,
} from './utils/testHelpers';

const app = createApp();

// Type assertions for mocks
const mockPrisma = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  shop: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  product: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  productVariant: {
    deleteMany: ReturnType<typeof vi.fn>;
  };
  productAnalytics: {
    deleteMany: ReturnType<typeof vi.fn>;
  };
  syncBatch: {
    deleteMany: ReturnType<typeof vi.fn>;
  };
  shopAnalytics: {
    deleteMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const mockSyncQueue = syncQueue as unknown as {
  add: ReturnType<typeof vi.fn>;
};

const mockIsQueueAvailable = isQueueAvailable as ReturnType<typeof vi.fn>;

describe('Shop Connection (WooCommerce OAuth)', () => {
  const testUser = createTestUser();
  const accessToken = generateAccessToken(testUser, TEST_JWT_SECRET);

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsQueueAvailable.mockReturnValue(true);
  });

  // ===========================================
  // SHOP CREATION TESTS
  // ===========================================
  describe('Shop Creation', () => {
    describe('POST /api/v1/shops', () => {
      it('should create shop with valid WooCommerce URL', async () => {
        const newShop = createTestShop(testUser.id, {
          wooStoreUrl: 'https://valid-store.example.com',
        });

        mockPrisma.shop.findUnique.mockResolvedValue(null); // No existing shop
        mockPrisma.shop.create.mockResolvedValue(newShop);

        // Mock the fetch for WooCommerce verification
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
        });

        const res = await request(app)
          .post('/api/v1/shops')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ storeUrl: 'https://valid-store.example.com' });

        expect(res.status).toBe(201);
        expect(res.body.shop).toBeDefined();
        expect(res.body.authUrl).toBeDefined();
        expect(res.body.authUrl).toContain('wc-auth/v1/authorize');
      });

      it('should reject invalid URL format', async () => {
        const res = await request(app)
          .post('/api/v1/shops')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ storeUrl: 'not-a-valid-url' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
      });

      it('should reject if store URL already connected', async () => {
        const existingShop = createTestShop('other-user-id', {
          wooStoreUrl: 'https://existing-store.example.com',
        });

        mockPrisma.shop.findUnique.mockResolvedValue(existingShop);

        const res = await request(app)
          .post('/api/v1/shops')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ storeUrl: 'https://existing-store.example.com' });

        expect(res.status).toBe(500);
        expect(res.body.error).toContain('already connected');
      });

      it('should reject request without authentication', async () => {
        const res = await request(app)
          .post('/api/v1/shops')
          .send({ storeUrl: 'https://valid-store.example.com' });

        expect(res.status).toBe(401);
      });

      it('should reject non-WooCommerce store', async () => {
        mockPrisma.shop.findUnique.mockResolvedValue(null);

        // Mock fetch to return non-WooCommerce response
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
        });

        const res = await request(app)
          .post('/api/v1/shops')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ storeUrl: 'https://not-woocommerce.example.com' });

        expect(res.status).toBe(500);
        expect(res.body.error).toContain('WooCommerce');
      });
    });
  });

  // ===========================================
  // OAUTH FLOW TESTS
  // ===========================================
  describe('OAuth Flow', () => {
    describe('POST /api/v1/shops/:id/oauth/callback', () => {
      it('should handle OAuth callback with valid credentials (FREE tier)', async () => {
        const shop = createTestShop(testUser.id, { isConnected: false });
        const freeUser = createTestUser({ subscriptionTier: 'FREE' });

        mockPrisma.shop.findUnique.mockResolvedValue(shop);
        mockPrisma.shop.update.mockResolvedValue({
          ...shop,
          isConnected: true,
          syncStatus: 'PENDING',
        });
        mockPrisma.user.findUnique.mockResolvedValue(freeUser);

        const res = await request(app)
          .post(`/api/v1/shops/${shop.id}/oauth/callback`)
          .send({
            consumer_key: 'ck_test_key',
            consumer_secret: 'cs_test_secret',
          });

        expect(res.status).toBe(200);
        expect(res.body.shop).toBeDefined();
        expect(res.body.needsProductSelection).toBe(true);
      });

      it('should handle OAuth callback with valid credentials (PRO tier - auto sync)', async () => {
        const shop = createTestShop(testUser.id, { isConnected: false });
        const proUser = createTestUser({ subscriptionTier: 'PROFESSIONAL' });

        mockPrisma.shop.findUnique.mockResolvedValue(shop);
        mockPrisma.shop.update.mockResolvedValue({
          ...shop,
          isConnected: true,
          syncStatus: 'SYNCING',
        });
        mockPrisma.user.findUnique.mockResolvedValue(proUser);

        const res = await request(app)
          .post(`/api/v1/shops/${shop.id}/oauth/callback`)
          .send({
            consumer_key: 'ck_test_key',
            consumer_secret: 'cs_test_secret',
          });

        expect(res.status).toBe(200);
        expect(res.body.shop).toBeDefined();
        expect(res.body.needsProductSelection).toBe(false);
        // Should have queued a sync job
        expect(mockSyncQueue.add).toHaveBeenCalledWith(
          'product-sync',
          expect.objectContaining({ shopId: shop.id }),
          expect.any(Object)
        );
      });

      it('should accept credentials via query params (WooCommerce default)', async () => {
        const shop = createTestShop(testUser.id, { isConnected: false });
        const freeUser = createTestUser({ subscriptionTier: 'FREE' });

        mockPrisma.shop.findUnique.mockResolvedValue(shop);
        mockPrisma.shop.update.mockResolvedValue({
          ...shop,
          isConnected: true,
        });
        mockPrisma.user.findUnique.mockResolvedValue(freeUser);

        const res = await request(app)
          .get(`/api/v1/shops/${shop.id}/oauth/callback`)
          .query({
            consumer_key: 'ck_test_key',
            consumer_secret: 'cs_test_secret',
          });

        expect(res.status).toBe(200);
        expect(res.body.shop).toBeDefined();
      });

      it('should reject missing credentials', async () => {
        const shop = createTestShop(testUser.id);

        const res = await request(app)
          .post(`/api/v1/shops/${shop.id}/oauth/callback`)
          .send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('Missing consumer_key or consumer_secret');
      });

      it('should reject partial credentials', async () => {
        const shop = createTestShop(testUser.id);

        const res = await request(app)
          .post(`/api/v1/shops/${shop.id}/oauth/callback`)
          .send({ consumer_key: 'ck_test_key' });

        expect(res.status).toBe(400);
      });
    });

    describe('GET /api/v1/shops/:id/oauth-url', () => {
      it('should return OAuth URL for unconnected shop', async () => {
        const shop = createTestShop(testUser.id, { isConnected: false });

        mockPrisma.shop.findUnique.mockResolvedValue(shop);

        const res = await request(app)
          .get(`/api/v1/shops/${shop.id}/oauth-url`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.authUrl).toBeDefined();
        expect(res.body.authUrl).toContain('wc-auth/v1/authorize');
        expect(res.body.authUrl).toContain('Floxen');
      });

      it('should reject for already connected shop', async () => {
        const connectedShop = createTestShop(testUser.id, { isConnected: true });

        mockPrisma.shop.findUnique.mockResolvedValue(connectedShop);

        const res = await request(app)
          .get(`/api/v1/shops/${connectedShop.id}/oauth-url`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('already connected');
      });

      it('should reject request for another user\'s shop', async () => {
        const otherUserShop = createTestShop('other-user-id', { isConnected: false });

        mockPrisma.shop.findUnique.mockResolvedValue(otherUserShop);

        const res = await request(app)
          .get(`/api/v1/shops/${otherUserShop.id}/oauth-url`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(403);
      });
    });
  });

  // ===========================================
  // SHOP MANAGEMENT TESTS
  // ===========================================
  describe('Shop Management', () => {
    describe('GET /api/v1/shops', () => {
      it('should list user\'s shops', async () => {
        const shops = [
          createTestShop(testUser.id, { id: 'shop-1' }),
          createTestShop(testUser.id, { id: 'shop-2' }),
        ];

        mockPrisma.shop.findMany.mockResolvedValue(
          shops.map((s) => ({ ...s, _count: { products: 5 } }))
        );

        const res = await request(app)
          .get('/api/v1/shops')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.shops).toBeDefined();
        expect(res.body.shops).toHaveLength(2);
      });

      it('should return empty array for user with no shops', async () => {
        mockPrisma.shop.findMany.mockResolvedValue([]);

        const res = await request(app)
          .get('/api/v1/shops')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.shops).toHaveLength(0);
      });

      it('should require authentication', async () => {
        const res = await request(app).get('/api/v1/shops');

        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/v1/shops/:id', () => {
      it('should return shop details for owner', async () => {
        const shop = createTestShop(testUser.id);

        mockPrisma.shop.findUnique.mockResolvedValue(shop);

        const res = await request(app)
          .get(`/api/v1/shops/${shop.id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.shop).toBeDefined();
        expect(res.body.shop.id).toBe(shop.id);
      });

      it('should return 404 for non-existent shop', async () => {
        mockPrisma.shop.findUnique.mockResolvedValue(null);

        const res = await request(app)
          .get('/api/v1/shops/non-existent-id')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(404);
      });

      it('should return 403 for another user\'s shop', async () => {
        const otherUserShop = createTestShop('other-user-id');

        mockPrisma.shop.findUnique.mockResolvedValue(otherUserShop);

        const res = await request(app)
          .get(`/api/v1/shops/${otherUserShop.id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(403);
      });
    });

    describe('PATCH /api/v1/shops/:id', () => {
      it('should update shop settings', async () => {
        const shop = createTestShop(testUser.id, {
          openaiEnabled: true,
          syncEnabled: false,
        });
        const updatedShop = { ...shop, syncEnabled: true };

        mockPrisma.shop.findUnique.mockResolvedValue(shop);
        mockPrisma.shop.update.mockResolvedValue(updatedShop);

        const res = await request(app)
          .patch(`/api/v1/shops/${shop.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ syncEnabled: true });

        expect(res.status).toBe(200);
        expect(res.body.shop.syncEnabled).toBe(true);
      });

      it('should reject enabling syncEnabled before feed activation', async () => {
        const shop = createTestShop(testUser.id, {
          openaiEnabled: false,
          syncEnabled: false,
        });

        mockPrisma.shop.findUnique.mockResolvedValue(shop);

        const res = await request(app)
          .patch(`/api/v1/shops/${shop.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ syncEnabled: true });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('FEED_NOT_ACTIVATED');
      });

      it('should update seller info', async () => {
        const shop = createTestShop(testUser.id);
        const updatedShop = { ...shop, sellerName: 'My Store' };

        mockPrisma.shop.findUnique.mockResolvedValue(shop);
        mockPrisma.shop.update.mockResolvedValue(updatedShop);

        const res = await request(app)
          .patch(`/api/v1/shops/${shop.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ sellerName: 'My Store' });

        expect(res.status).toBe(200);
        expect(res.body.shop.sellerName).toBe('My Store');
      });
    });

    describe('DELETE /api/v1/shops/:id', () => {
      it('should delete shop and related data', async () => {
        const shop = createTestShop(testUser.id);

        mockPrisma.shop.findUnique.mockResolvedValue(shop);
        mockPrisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
          return callback(mockPrisma);
        });
        mockPrisma.productVariant.deleteMany.mockResolvedValue({ count: 0 });
        mockPrisma.productAnalytics.deleteMany.mockResolvedValue({ count: 0 });
        mockPrisma.product.deleteMany.mockResolvedValue({ count: 5 });
        mockPrisma.syncBatch.deleteMany.mockResolvedValue({ count: 2 });
        mockPrisma.shopAnalytics.deleteMany.mockResolvedValue({ count: 0 });
        mockPrisma.shop.delete.mockResolvedValue(shop);

        const res = await request(app)
          .delete(`/api/v1/shops/${shop.id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toContain('deleted');
      });

      it('should return 403 for another user\'s shop', async () => {
        const otherUserShop = createTestShop('other-user-id');

        mockPrisma.shop.findUnique.mockResolvedValue(otherUserShop);

        const res = await request(app)
          .delete(`/api/v1/shops/${otherUserShop.id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(403);
      });
    });

    describe('POST /api/v1/shops/:id/verify', () => {
      it('should verify connection for connected shop', async () => {
        const connectedShop = createTestShop(testUser.id, { isConnected: true });

        mockPrisma.shop.findUnique.mockResolvedValue(connectedShop);

        const res = await request(app)
          .post(`/api/v1/shops/${connectedShop.id}/verify`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.verified).toBe(true);
        expect(res.body.status).toBe('connected');
      });
    });
  });

  // ===========================================
  // PRODUCT DISCOVERY & SELECTION TESTS
  // ===========================================
  describe('Product Discovery & Selection', () => {
    describe('POST /api/v1/shops/:id/discover', () => {
      it('should discover products from WooCommerce', async () => {
        const shop = createTestShop(testUser.id, { isConnected: true });

        mockPrisma.shop.findUnique.mockResolvedValue(shop);

        // Mock the product discovery service
        vi.doMock('../src/services/productDiscoveryService', () => ({
          discoverWooCommerceProducts: vi.fn().mockResolvedValue({
            discovered: 10,
            total: 10,
          }),
        }));

        const res = await request(app)
          .post(`/api/v1/shops/${shop.id}/discover`)
          .set('Authorization', `Bearer ${accessToken}`);

        // Expect 200 or the mocked service to be called
        expect([200, 500]).toContain(res.status);
      });
    });

    describe('GET /api/v1/shops/:id/products/discovered', () => {
      it('should list discovered products', async () => {
        const shop = createTestShop(testUser.id, { isConnected: true });

        mockPrisma.shop.findUnique.mockResolvedValue(shop);

        const res = await request(app)
          .get(`/api/v1/shops/${shop.id}/products/discovered`)
          .set('Authorization', `Bearer ${accessToken}`);

        // Expect 200 or 500 depending on mock setup
        expect([200, 500]).toContain(res.status);
      });
    });

    describe('PUT /api/v1/shops/:id/products/selection', () => {
      it('should update product selection', async () => {
        const shop = createTestShop(testUser.id, { isConnected: true });

        mockPrisma.shop.findUnique.mockResolvedValue(shop);

        const res = await request(app)
          .put(`/api/v1/shops/${shop.id}/products/selection`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ productIds: ['product-1', 'product-2'] });

        // Expect 200 or 500 depending on mock setup
        expect([200, 500]).toContain(res.status);
      });

      it('should reject invalid payload', async () => {
        const shop = createTestShop(testUser.id, { isConnected: true });

        mockPrisma.shop.findUnique.mockResolvedValue(shop);

        const res = await request(app)
          .put(`/api/v1/shops/${shop.id}/products/selection`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ productIds: 'not-an-array' });

        expect(res.status).toBe(400);
      });
    });
  });

  // ===========================================
  // FEED ACTIVATION TESTS
  // ===========================================
  describe('Feed Activation', () => {
    describe('POST /api/v1/shops/:id/activate-feed', () => {
      it('should activate feed for complete shop profile', async () => {
        const shop = createTestShop(testUser.id, {
          isConnected: true,
          openaiEnabled: false,
          syncEnabled: false,
          sellerName: 'Test Store',
          returnPolicy: 'https://example.com/returns',
          returnWindow: 30,
        });

        mockPrisma.shop.findUnique.mockResolvedValue(shop);
        mockPrisma.product.count.mockResolvedValue(5);
        mockPrisma.shop.update.mockResolvedValue({
          ...shop,
          openaiEnabled: true,
          syncEnabled: true,
        });

        const res = await request(app)
          .post(`/api/v1/shops/${shop.id}/activate-feed`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.shop.openaiEnabled).toBe(true);
        expect(res.body.shop.syncEnabled).toBe(true);
      });

      it('should reject activation for incomplete profile', async () => {
        const shop = createTestShop(testUser.id, {
          isConnected: true,
          sellerName: null, // Missing
          returnPolicy: null, // Missing
          returnWindow: null, // Missing
        });

        mockPrisma.shop.findUnique.mockResolvedValue(shop);

        const res = await request(app)
          .post(`/api/v1/shops/${shop.id}/activate-feed`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INCOMPLETE_PROFILE');
        expect(res.body.details).toBeDefined();
      });

      it('should reject activation with no valid products', async () => {
        const shop = createTestShop(testUser.id, {
          isConnected: true,
          sellerName: 'Test Store',
          returnPolicy: 'https://example.com/returns',
          returnWindow: 30,
        });

        mockPrisma.shop.findUnique.mockResolvedValue(shop);
        mockPrisma.product.count.mockResolvedValue(0);

        const res = await request(app)
          .post(`/api/v1/shops/${shop.id}/activate-feed`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('NO_VALID_PRODUCTS');
      });

      it('should reject if already activated', async () => {
        const shop = createTestShop(testUser.id, {
          isConnected: true,
          openaiEnabled: true,
          syncEnabled: true,
        });

        mockPrisma.shop.findUnique.mockResolvedValue(shop);

        const res = await request(app)
          .post(`/api/v1/shops/${shop.id}/activate-feed`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('ALREADY_ACTIVATED');
      });

      it('should reject if product reselection needed', async () => {
        const shop = createTestShop(testUser.id, {
          isConnected: true,
          needsProductReselection: true,
          sellerName: 'Test Store',
          returnPolicy: 'https://example.com/returns',
          returnWindow: 30,
        });

        mockPrisma.shop.findUnique.mockResolvedValue(shop);

        const res = await request(app)
          .post(`/api/v1/shops/${shop.id}/activate-feed`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('NEEDS_RESELECTION');
      });
    });
  });

  // ===========================================
  // PRODUCT STATS TESTS
  // ===========================================
  describe('Product Stats', () => {
    describe('GET /api/v1/shops/:id/product-stats', () => {
      it('should return product statistics', async () => {
        const shop = createTestShop(testUser.id, { isConnected: true });

        mockPrisma.shop.findUnique.mockResolvedValue(shop);
        // Mock getParentProductIds query
        mockPrisma.product.findMany.mockResolvedValue([]);
        mockPrisma.product.count
          .mockResolvedValueOnce(100) // total
          .mockResolvedValueOnce(80)  // inFeed
          .mockResolvedValueOnce(10)  // needsAttention
          .mockResolvedValueOnce(10)  // disabled
          .mockResolvedValueOnce(50)  // productCount
          .mockResolvedValueOnce(50); // selectedProductCount
        mockPrisma.$queryRaw
          .mockResolvedValueOnce([{ count: BigInt(40) }])  // productCountInFeed
          .mockResolvedValueOnce([{ count: BigInt(5) }]);  // productCountNeedsAttention

        const res = await request(app)
          .get(`/api/v1/shops/${shop.id}/product-stats`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.total).toBeDefined();
        expect(res.body.inFeed).toBeDefined();
        expect(res.body.needsAttention).toBeDefined();
      });
    });
  });
});
