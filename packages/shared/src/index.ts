export type SubscriptionTier = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export type ProductStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'SYNCED' | 'EXCLUDED' | 'ERROR';
export type SyncStatus = 'PENDING' | 'SYNCING' | 'COMPLETED' | 'FAILED' | 'PAUSED';

// Source selection for enrichable fields
export type FieldSource = 'manual' | 'ai';

export interface SelectedSources {
  title?: FieldSource;
  description?: FieldSource;
  category?: FieldSource;
  keywords?: FieldSource;
  q_and_a?: FieldSource;
}

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
  isConnected: boolean;
  lastSyncAt?: string | null;
  syncStatus: SyncStatus;
  syncEnabled: boolean;
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

export interface Product {
  id: string;
  shopId: string;
  wooProductId: number;
  wooTitle: string;
  wooDescription?: string | null;
  wooSku?: string | null;
  wooPrice?: string | null;
  wooCategories?: any;
  wooDateModified?: string | null;
  wooRawJson?: any;  // Full WooCommerce product JSON for field mapping preview

  // AI enrichment fields
  aiEnriched?: boolean;
  aiTitle?: string | null;
  aiDescription?: string | null;
  aiKeywords?: string[];
  aiQAndA?: Array<{ q: string; a: string }> | null;
  aiSuggestedCategory?: string | null;
  aiEnrichedAt?: string | null;

  // Manual edit fields
  manualTitle?: string | null;
  manualDescription?: string | null;
  manualCategory?: string | null;
  manualKeywords?: string[];
  manualQAndA?: Array<{ q: string; a: string }> | null;
  manualEditedAt?: string | null;

  // Source selection
  selectedSources?: SelectedSources | null;

  // Status fields
  status: ProductStatus;
  syncStatus: SyncStatus;
  lastSyncedAt?: string | null;
  feedEnableSearch?: boolean;
  feedEnableCheckout?: boolean;
  updatedAt: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// Export OpenAI Feed Specification
export * from './openai-feed-spec';
export * from './locked-field-mappings';
