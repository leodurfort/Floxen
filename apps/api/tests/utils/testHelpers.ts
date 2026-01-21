import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Test secrets - must match what's used in tests
export const TEST_JWT_SECRET = 'test-jwt-secret-for-testing-only-32-chars';
export const TEST_JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-testing-only';

// Test user data
export interface TestUser {
  id: string;
  email: string;
  passwordHash: string | null;
  firstName: string | null;
  surname: string | null;
  name: string | null;
  emailVerified: boolean;
  onboardingComplete: boolean;
  subscriptionTier: 'FREE' | 'STARTER' | 'PROFESSIONAL';
  authProvider: 'email' | 'google';
  googleId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestShop {
  id: string;
  userId: string;
  wooStoreUrl: string;
  wooConsumerKey: string | null;
  wooConsumerSecret: string | null;
  isConnected: boolean;
  syncEnabled: boolean;
  openaiEnabled: boolean;
  syncStatus: 'PENDING' | 'SYNCING' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  feedStatus: 'PENDING' | 'SYNCING' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  lastSyncAt: Date | null;
  needsProductReselection: boolean;
  sellerName: string | null;
  sellerUrl: string | null;
  sellerPrivacyPolicy: string | null;
  sellerTos: string | null;
  returnPolicy: string | null;
  returnWindow: number | null;
  shopCurrency: string | null;
  productLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  const id = overrides.id || crypto.randomUUID();
  const firstName = overrides.firstName ?? 'Test';
  const surname = overrides.surname ?? 'User';

  return {
    id,
    email: overrides.email || 'test@example.com',
    passwordHash: overrides.passwordHash ?? '$2a$10$hashedpassword',
    firstName,
    surname,
    name: `${firstName} ${surname}`,
    emailVerified: overrides.emailVerified ?? true,
    onboardingComplete: overrides.onboardingComplete ?? true,
    subscriptionTier: overrides.subscriptionTier ?? 'FREE',
    authProvider: overrides.authProvider ?? 'email',
    googleId: overrides.googleId ?? null,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  };
}

export function createTestShop(userId: string, overrides: Partial<TestShop> = {}): TestShop {
  const id = overrides.id || crypto.randomUUID();

  return {
    id,
    userId,
    wooStoreUrl: overrides.wooStoreUrl || 'https://test-store.example.com',
    wooConsumerKey: overrides.wooConsumerKey ?? null,
    wooConsumerSecret: overrides.wooConsumerSecret ?? null,
    isConnected: overrides.isConnected ?? false,
    syncEnabled: overrides.syncEnabled ?? false,
    openaiEnabled: overrides.openaiEnabled ?? false,
    syncStatus: overrides.syncStatus ?? 'PENDING',
    feedStatus: overrides.feedStatus ?? 'PENDING',
    lastSyncAt: overrides.lastSyncAt ?? null,
    needsProductReselection: overrides.needsProductReselection ?? false,
    sellerName: overrides.sellerName ?? null,
    sellerUrl: overrides.sellerUrl ?? null,
    sellerPrivacyPolicy: overrides.sellerPrivacyPolicy ?? null,
    sellerTos: overrides.sellerTos ?? null,
    returnPolicy: overrides.returnPolicy ?? null,
    returnWindow: overrides.returnWindow ?? null,
    shopCurrency: overrides.shopCurrency ?? 'USD',
    productLimit: overrides.productLimit ?? 5,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  };
}

export function generateAccessToken(user: TestUser, secret: string = TEST_JWT_SECRET): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      tier: user.subscriptionTier,
      type: 'access',
    },
    secret,
    { expiresIn: '15m' }
  );
}

export function generateRefreshToken(user: TestUser, secret: string = TEST_JWT_REFRESH_SECRET): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      tier: user.subscriptionTier,
      type: 'refresh',
      jti: crypto.randomUUID(),
    },
    secret,
    { expiresIn: '7d' }
  );
}

export function generateExpiredToken(user: TestUser, secret: string = TEST_JWT_SECRET): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      tier: user.subscriptionTier,
      type: 'access',
    },
    secret,
    { expiresIn: '-1s' } // Already expired
  );
}

export function generateInvalidToken(): string {
  return 'invalid.token.here';
}

// Create verification token mock data
export interface TestVerificationToken {
  id: string;
  email: string;
  token: string;
  type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'EMAIL_CHANGE';
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  userId: string | null;
}

export function createTestVerificationToken(
  email: string,
  type: TestVerificationToken['type'] = 'EMAIL_VERIFICATION',
  overrides: Partial<TestVerificationToken> = {}
): TestVerificationToken {
  return {
    id: overrides.id || crypto.randomUUID(),
    email: email.toLowerCase(),
    token: overrides.token || '123456',
    type,
    expiresAt: overrides.expiresAt || new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    usedAt: overrides.usedAt ?? null,
    createdAt: overrides.createdAt || new Date(),
    userId: overrides.userId ?? null,
  };
}

// Sync batch mock data
export interface TestSyncBatch {
  id: string;
  shopId: string;
  status: 'PENDING' | 'SYNCING' | 'COMPLETED' | 'FAILED';
  syncType: 'FULL' | 'MANUAL';
  totalProducts: number;
  syncedProducts: number;
  failedProducts: number;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export function createTestSyncBatch(shopId: string, overrides: Partial<TestSyncBatch> = {}): TestSyncBatch {
  return {
    id: overrides.id || crypto.randomUUID(),
    shopId,
    status: overrides.status ?? 'COMPLETED',
    syncType: overrides.syncType ?? 'MANUAL',
    totalProducts: overrides.totalProducts ?? 10,
    syncedProducts: overrides.syncedProducts ?? 10,
    failedProducts: overrides.failedProducts ?? 0,
    startedAt: overrides.startedAt ?? new Date(Date.now() - 60000),
    completedAt: overrides.completedAt ?? new Date(),
    createdAt: overrides.createdAt ?? new Date(Date.now() - 60000),
  };
}

// Feed snapshot mock data
export interface TestFeedSnapshot {
  id: string;
  shopId: string;
  feedFileUrl: string | null;
  productCount: number;
  generatedAt: Date;
  createdAt: Date;
}

export function createTestFeedSnapshot(shopId: string, overrides: Partial<TestFeedSnapshot> = {}): TestFeedSnapshot {
  return {
    id: overrides.id || crypto.randomUUID(),
    shopId,
    feedFileUrl: overrides.feedFileUrl ?? 'https://cdn.example.com/feeds/test-feed.json',
    productCount: overrides.productCount ?? 10,
    generatedAt: overrides.generatedAt ?? new Date(),
    createdAt: overrides.createdAt ?? new Date(),
  };
}
