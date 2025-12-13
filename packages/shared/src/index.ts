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
  isConnected: boolean;
  lastSyncAt?: string | null;
  syncStatus: SyncStatus;
  syncEnabled: boolean;
  openaiEnabled: boolean;
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
  status: ProductStatus;
  syncStatus: SyncStatus;
  lastSyncedAt?: string | null;
  aiEnriched?: boolean;
  feedEnableSearch?: boolean;
  feedEnableCheckout?: boolean;
  updatedAt: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}
