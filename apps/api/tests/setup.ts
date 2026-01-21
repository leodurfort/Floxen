import path from 'path';
import dotenv from 'dotenv';
import { vi } from 'vitest';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

process.env.NODE_ENV = 'test';

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-testing-only';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.WOO_REDIRECT_URI = 'http://localhost:3001/api/v1/shops/:id/oauth/callback';
process.env.WEB_BASE_URL = 'http://localhost:3000';

// Ensure DB URL exists to satisfy Prisma config during imports (even if tests do not hit DB).
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/test';
}

// Mock Prisma
vi.mock('../src/lib/prisma', () => {
  const mockPrismaClient = {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    shop: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    productVariant: {
      deleteMany: vi.fn(),
    },
    productAnalytics: {
      deleteMany: vi.fn(),
    },
    syncBatch: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    shopAnalytics: {
      deleteMany: vi.fn(),
    },
    feedSnapshot: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    verificationToken: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    fieldMapping: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    openAIField: {
      findMany: vi.fn(),
    },
    wooCommerceField: {
      findMany: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn((callback: (tx: unknown) => Promise<unknown>) => callback(mockPrismaClient)),
    $queryRaw: vi.fn(),
  };

  return {
    prisma: mockPrismaClient,
  };
});

// Mock Redis/BullMQ
vi.mock('../src/lib/redis', () => ({
  redisConnection: null,
  syncQueue: {
    add: vi.fn().mockResolvedValue({ id: 'test-job-id' }),
  },
  syncFlowProducer: {
    add: vi.fn().mockResolvedValue({ id: 'test-flow-id' }),
  },
  isQueueAvailable: vi.fn().mockReturnValue(true),
  DEFAULT_JOB_OPTIONS: {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3,
  },
  JOB_PRIORITIES: {
    WEBHOOK: 1,
    MANUAL: 2,
    CRON: 3,
    REPROCESS: 4,
  },
}));

// Mock email service (Resend)
vi.mock('../src/services/verificationService', () => ({
  createVerificationToken: vi.fn().mockResolvedValue({ success: true }),
  verifyToken: vi.fn().mockResolvedValue({ valid: true }),
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

// Mock encryption
vi.mock('../src/lib/encryption', () => ({
  encrypt: vi.fn((value: string) => `encrypted:${value}`),
  decrypt: vi.fn((value: string) => value.replace('encrypted:', '')),
}));

// Mock logger
vi.mock('../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock rate limiters to disable them in tests
vi.mock('../src/middleware/rateLimit', () => ({
  authLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  feedLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  syncLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Mock Sentry
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  setupExpressErrorHandler: vi.fn((app) => app),
  captureException: vi.fn(),
  withScope: vi.fn(),
}));

// Mock storage
vi.mock('../src/services/storage', () => ({
  deleteShopFiles: vi.fn().mockResolvedValue({ deleted: 0, errors: [] }),
}));

// Mock WooCommerce client
vi.mock('../src/services/wooClient', () => ({
  createWooClient: vi.fn().mockReturnValue({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }),
  fetchStoreSettings: vi.fn().mockResolvedValue({
    shopCurrency: 'USD',
    dimensionUnit: 'cm',
    weightUnit: 'kg',
  }),
}));
