export type SubscriptionTier = 'FREE' | 'STARTER' | 'PROFESSIONAL';

export type SyncStatus = 'PENDING' | 'SYNCING' | 'COMPLETED' | 'FAILED' | 'PAUSED';

export interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  surname?: string;
  emailVerified: boolean;
  onboardingComplete: boolean;
  subscriptionTier: SubscriptionTier;
  createdAt: string;
  updatedAt: string;
  // Stripe billing fields
  stripeCustomerId?: string | null;
  subscriptionId?: string | null;
  subscriptionStatus?: string | null; // 'active' | 'past_due' | 'canceled'
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}

export interface Shop {
  id: string;
  userId: string;
  shopName: string;
  shopCurrency: string;
  dimensionUnit?: string | null;
  weightUnit?: string | null;
  isConnected: boolean;
  lastSyncAt?: string | null;
  fieldMappingsUpdatedAt?: string | null;
  shopSettingsUpdatedAt?: string | null;
  productsReprocessedAt?: string | null;
  syncStatus: SyncStatus;
  syncProgress?: number | null; // 0-100 during sync, null when not syncing
  syncEnabled: boolean;
  feedStatus: SyncStatus;
  lastFeedGeneratedAt?: string | null;
  openaiEnabled: boolean;
  wooStoreUrl?: string;
  sellerName?: string | null;
  sellerUrl?: string | null;
  sellerPrivacyPolicy?: string | null;
  sellerTos?: string | null;
  returnPolicy?: string | null;
  returnWindow?: number | null;
  validProductCount?: number;
  // Product selection/billing limits
  productLimit: number;
  needsProductReselection?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Feed activation state
export type FeedState = 'not_activated' | 'active' | 'paused' | 'error';

/**
 * Derive feed state from shop flags
 * Priority: error > active > paused > not_activated
 */
export function deriveFeedState(
  shop: Pick<Shop, 'openaiEnabled' | 'syncEnabled' | 'feedStatus'>
): FeedState {
  if (shop.feedStatus === 'FAILED') return 'error';
  if (!shop.openaiEnabled) return 'not_activated';
  if (shop.openaiEnabled && shop.syncEnabled) return 'active';
  if (shop.openaiEnabled && !shop.syncEnabled) return 'paused';
  return 'not_activated';
}

// Product stats for feed status display
export interface ProductStats {
  total: number;           // Total items (simple products + variations)
  inFeed: number;          // Items that are valid and enabled for feed
  needsAttention: number;  // Items that are invalid
  disabled: number;        // Items disabled from feed
  productCount: number;    // Number of top-level products (user's selection)
  // Contextual product counts (how many products have items in each category)
  productCountInFeed: number;          // Products with at least one item in feed
  productCountNeedsAttention: number;  // Products with at least one item needing attention
}

import type { ProductFieldOverrides } from './openai-feed-spec';

export type ProductSyncState = 'discovered' | 'synced';

export interface Product {
  id: string;
  shopId: string;
  wooProductId: number;
  wooTitle: string;
  wooDescription?: string | null;
  wooSku?: string | null;
  wooPrice?: string | null;
  wooStockStatus?: string | null;
  wooStockQuantity?: number | null;
  wooCategories?: any;
  wooDateModified?: string | null;
  wooRawJson?: any;  // Full WooCommerce product JSON for field mapping preview
  wooPermalink?: string | null;

  // Product-level field mapping overrides
  productFieldOverrides?: ProductFieldOverrides | null;

  // Sync fields
  lastSyncedAt?: string | null;
  feedEnableSearch?: boolean;
  feedEnableCheckout?: boolean;
  updatedAt: string;

  // Validation status
  isValid?: boolean;
  validationErrors?: Record<string, string[]> | null;

  // Product selection for billing
  isSelected?: boolean;
  syncState?: ProductSyncState;
}

// Minimal product type for catalog listing (matches what API returns)
export interface CatalogProduct {
  id: string;
  isValid: boolean;
  validationErrors: Record<string, string[]> | null;
  updatedAt: string;
  feedEnableSearch: boolean;
  openaiAutoFilled: Record<string, unknown> | null;
  productFieldOverrides: ProductFieldOverrides | null;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// Export OpenAI Feed Specification
export * from './openai-feed-spec';
export * from './locked-field-mappings';

// Export Transform Functions
export * from './transforms';

// Export Validation Utilities
export * from './validation/staticValueValidator';
