export type SubscriptionTier = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export type ProductStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'SYNCED' | 'EXCLUDED' | 'ERROR';
export type SyncStatus = 'PENDING' | 'SYNCING' | 'COMPLETED' | 'FAILED' | 'PAUSED';

export interface User {
  id: string;
  email: string;
  name?: string;
  subscriptionTier: SubscriptionTier;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
}

import type { ProductFieldOverrides } from './openai-feed-spec';

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

  // Status fields
  status: ProductStatus;
  lastSyncedAt?: string | null;
  feedEnableSearch?: boolean;
  feedEnableCheckout?: boolean;
  updatedAt: string;

  // Validation status
  isValid?: boolean;
  validationErrors?: Record<string, string[]> | null;
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
