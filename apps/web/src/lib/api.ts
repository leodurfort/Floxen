import { Shop, User, ProductFieldOverrides, CatalogProduct, ProductStats } from '@floxen/shared';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.floxen.ai';

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

// Token Management - Single source of truth is localStorage

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('floxen.access');
}

function clearAuthAndRedirect(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('floxen.user');
    localStorage.removeItem('floxen.access');
    localStorage.removeItem('floxen.refresh');
    window.location.href = '/login';
  }
}

async function refreshAccessToken(): Promise<string> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = typeof window !== 'undefined'
        ? localStorage.getItem('floxen.refresh')
        : null;

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      const newAccessToken = data.tokens.accessToken;

      if (typeof window !== 'undefined') {
        localStorage.setItem('floxen.access', newAccessToken);
        if (data.tokens.refreshToken) {
          localStorage.setItem('floxen.refresh', data.tokens.refreshToken);
        }
      }

      return newAccessToken;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Request Helpers

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const err = new Error(errData.message || errData.error || res.statusText) as Error & { error?: string };
    err.error = errData.error;
    throw err;
  }

  return res.json();
}

async function requestWithAuth<T>(path: string, options: RequestInit = {}, retryCount = 0): Promise<T> {
  const token = getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle 401 Unauthorized - try to refresh token
  if (res.status === 401 && retryCount === 0) {
    try {
      const newAccessToken = await refreshAccessToken();
      headers.Authorization = `Bearer ${newAccessToken}`;
      return requestWithAuth<T>(path, { ...options, headers }, retryCount + 1);
    } catch {
      clearAuthAndRedirect();
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const err = new Error(errData.message || errData.error || res.statusText) as Error & { error?: string };
    err.error = errData.error;
    throw err;
  }

  return res.json();
}

// Auth Endpoints (unauthenticated)

export async function login(payload: { email: string; password: string }) {
  return request<{ user: User; tokens: { accessToken: string; refreshToken: string } }>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Google OAuth

export interface GoogleAuthResponse {
  user: User;
  tokens: { accessToken: string; refreshToken: string };
  isNewUser: boolean;
}

export interface GoogleAuthError extends Error {
  error?: 'email_exists' | 'google_account' | string;
  redirectTo?: string;
}

export async function googleAuth(payload: { credential: string }): Promise<GoogleAuthResponse> {
  const res = await fetch(`${API_URL}/api/v1/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: 'unknown', message: res.statusText }));
    const err = new Error(errData.message || errData.error || res.statusText) as GoogleAuthError;
    err.error = errData.error;
    err.redirectTo = errData.redirectTo;
    throw err;
  }

  return res.json();
}

// Multi-step Registration Flow

export async function registerStart(payload: { email: string }) {
  return request<{ success: boolean; message: string }>('/api/v1/auth/register/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function registerVerify(payload: { email: string; code: string }) {
  return request<{ success: boolean; message: string }>('/api/v1/auth/register/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function registerResend(payload: { email: string }) {
  return request<{ success: boolean; message: string }>('/api/v1/auth/register/resend', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function registerPassword(payload: { email: string; password: string }) {
  return request<{
    success: boolean;
    user: Partial<User>;
    tokens: { accessToken: string; refreshToken: string };
  }>('/api/v1/auth/register/password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function registerComplete(payload: { email: string; firstName: string; surname: string }) {
  return request<{
    success: boolean;
    user: User;
    tokens: { accessToken: string; refreshToken: string };
  }>('/api/v1/auth/register/complete', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Forgot Password Flow

export async function forgotPassword(payload: { email: string }) {
  return request<{ success: boolean; message: string }>('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function forgotPasswordVerify(payload: { email: string; code: string }) {
  return request<{ success: boolean; message: string }>('/api/v1/auth/forgot-password/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function forgotPasswordReset(payload: { email: string; code: string; password: string }) {
  return request<{
    success: boolean;
    message: string;
    user: Partial<User>;
    tokens: { accessToken: string; refreshToken: string };
  }>('/api/v1/auth/forgot-password/reset', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// User Profile

export async function getProfile() {
  console.debug('[API-CLIENT] getProfile() called');
  try {
    const result = await requestWithAuth<User>('/api/v1/users/me');
    console.debug('[API-CLIENT] getProfile() response', {
      userId: result.id,
      email: result.email,
      subscriptionTier: result.subscriptionTier,
    });
    return result;
  } catch (err) {
    console.error('[API-CLIENT] getProfile() FAILED:', err);
    throw err;
  }
}

export async function updateProfile(payload: { firstName?: string; surname?: string }) {
  return requestWithAuth<{ success: boolean; user: User }>('/api/v1/users/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function changeEmail(payload: { newEmail: string; password: string }) {
  return requestWithAuth<{ success: boolean; message: string }>('/api/v1/users/me/change-email', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function changeEmailVerify(payload: { code: string }) {
  return requestWithAuth<{ success: boolean; message: string; user: User }>('/api/v1/users/me/change-email/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function changePassword(payload: { currentPassword: string; newPassword: string }) {
  return requestWithAuth<{ success: boolean; message: string }>('/api/v1/users/me/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteAccount() {
  return requestWithAuth<{
    success: boolean;
    message: string;
  }>('/api/v1/users/me/delete', { method: 'DELETE' });
}

export async function completeOnboarding() {
  return requestWithAuth<{
    success: boolean;
    user: User;
  }>('/api/v1/users/me/complete-onboarding', { method: 'POST' });
}

// Shops

export async function listShops() {
  return requestWithAuth<{ shops: Shop[] }>('/api/v1/shops');
}

export async function getShop(shopId: string) {
  return requestWithAuth<{ shop: Shop }>(`/api/v1/shops/${shopId}`);
}

export async function createShop(payload: { storeUrl: string; shopName?: string; shopCurrency?: string }) {
  return requestWithAuth<{ shop: Shop; authUrl: string }>('/api/v1/shops', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteShop(shopId: string) {
  return requestWithAuth<{ shop: Shop; message: string }>(`/api/v1/shops/${shopId}`, {
    method: 'DELETE',
  });
}

export async function getShopOAuthUrl(shopId: string) {
  return requestWithAuth<{ authUrl: string }>(`/api/v1/shops/${shopId}/oauth-url`);
}

export async function toggleShopSync(shopId: string, syncEnabled: boolean) {
  return requestWithAuth<{ shop: Shop }>(`/api/v1/shops/${shopId}`, {
    method: 'PATCH',
    body: JSON.stringify({ syncEnabled }),
  });
}

export async function updateShop(
  shopId: string,
  data: {
    sellerName?: string | null;
    sellerPrivacyPolicy?: string | null;
    sellerTos?: string | null;
    returnPolicy?: string | null;
    returnWindow?: number | null;
  }
) {
  return requestWithAuth<{ shop: Shop }>(`/api/v1/shops/${shopId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function triggerProductSync(shopId: string) {
  return requestWithAuth<{ shopId: string; status: string }>(`/api/v1/shops/${shopId}/sync`, {
    method: 'POST',
  });
}

export async function latestFeed(shopId: string) {
  return requestWithAuth<{ feedUrl: string; generatedAt: string; productCount: number }>(
    `/api/v1/shops/${shopId}/sync/feed/latest`
  );
}

// Feed Activation and Stats

export interface ActivateFeedResponse {
  shop: Shop;
  message: string;
  validProductCount: number;
}

export async function activateFeed(shopId: string) {
  return requestWithAuth<ActivateFeedResponse>(`/api/v1/shops/${shopId}/activate-feed`, {
    method: 'POST',
  });
}

export async function getProductStats(shopId: string) {
  return requestWithAuth<ProductStats>(`/api/v1/shops/${shopId}/product-stats`);
}

export interface FeedPreviewResponse {
  items: Record<string, unknown>[];
  hasMore: boolean;
  offset: number;
  limit: number;
}

export async function getFeedPreview(
  shopId: string,
  params?: { limit?: number; offset?: number; download?: boolean }
) {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  if (params?.download) searchParams.set('download', 'true');

  const query = searchParams.toString();
  return requestWithAuth<FeedPreviewResponse>(
    `/api/v1/shops/${shopId}/sync/feed/preview${query ? `?${query}` : ''}`
  );
}

// Product Listing with Filters

export interface ColumnFilter {
  text?: string;
  values?: string[];
}

// Helper to encode column filters into URLSearchParams (pipe-separated values)
function encodeColumnFilters(params: URLSearchParams, columnFilters: Record<string, ColumnFilter>): void {
  for (const [columnId, filter] of Object.entries(columnFilters)) {
    if (filter.text) {
      params.set(`cf_${columnId}_t`, filter.text);
    }
    if (filter.values && filter.values.length > 0) {
      params.set(`cf_${columnId}_v`, filter.values.join('|'));
    }
  }
}

export interface ListProductsParams {
  page?: number;
  limit?: number;
  sortBy?: string; // Any column ID (database column or OpenAI attribute)
  sortOrder?: 'asc' | 'desc';
  search?: string;
  columnFilters?: Record<string, ColumnFilter>;
}

export interface ListProductsResult {
  products: CatalogProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listProducts(
  shopId: string,
  params?: ListProductsParams
): Promise<ListProductsResult> {
  const searchParams = new URLSearchParams();

  if (params) {
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params.search) searchParams.set('search', params.search);
    if (params.columnFilters) {
      encodeColumnFilters(searchParams, params.columnFilters);
    }
  }

  const queryString = searchParams.toString();
  const path = `/api/v1/shops/${shopId}/products${queryString ? `?${queryString}` : ''}`;

  return requestWithAuth<ListProductsResult>(path);
}

// Column Values for Filtering

export interface ColumnValueResult {
  value: string;
  label: string;
  count: number;
}

export interface GetColumnValuesResult {
  column: string;
  values: ColumnValueResult[];
  totalDistinct: number;
  truncated: boolean;
}

export interface CurrentFiltersForColumnValues {
  globalSearch?: string;
  columnFilters?: Record<string, ColumnFilter>;
}

export async function getColumnValues(
  shopId: string,
  column: string,
  limit?: number,
  search?: string,
  currentFilters?: CurrentFiltersForColumnValues
): Promise<GetColumnValuesResult> {
  const params = new URLSearchParams();
  params.set('column', column);
  if (limit !== undefined) params.set('limit', String(limit));
  if (search) params.set('search', search);
  if (currentFilters?.globalSearch) {
    params.set('globalSearch', currentFilters.globalSearch);
  }
  if (currentFilters?.columnFilters) {
    encodeColumnFilters(params, currentFilters.columnFilters);
  }

  return requestWithAuth<GetColumnValuesResult>(
    `/api/v1/shops/${shopId}/products/column-values?${params.toString()}`
  );
}

// Bulk Update

export interface BulkUpdateFilters {
  search?: string;
  columnFilters?: Record<string, ColumnFilter>;
}

export type BulkUpdateOperation =
  | { type: 'enable_search'; value: boolean }
  | { type: 'field_mapping'; attribute: string; wooField: string | null }
  | { type: 'static_override'; attribute: string; value: string }
  | { type: 'remove_override'; attribute: string };

export interface BulkUpdateRequest {
  selectionMode: 'selected' | 'filtered' | 'all' | 'itemGroup';
  productIds?: string[];
  filters?: BulkUpdateFilters;
  itemGroupId?: string;
  update: BulkUpdateOperation;
}

export interface BulkUpdateResponse {
  success: boolean;
  totalProducts: number;
  processedProducts: number;
  failedProducts: number;
  errors: Array<{ productId: string; error: string }>;
  completed: boolean;
}

export async function bulkUpdateProducts(
  shopId: string,
  payload: BulkUpdateRequest
): Promise<BulkUpdateResponse> {
  return requestWithAuth<BulkUpdateResponse>(
    `/api/v1/shops/${shopId}/products/bulk-update`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export async function getItemGroupCount(
  shopId: string,
  itemGroupId: string
): Promise<{ itemGroupId: string; count: number }> {
  return requestWithAuth<{ itemGroupId: string; count: number }>(
    `/api/v1/shops/${shopId}/products/item-group-count/${encodeURIComponent(itemGroupId)}`
  );
}

// Feed Refresh (special handling for 409 conflict)

export interface RefreshFeedResponse {
  shopId: string;
  pushed: boolean;
  syncStatus: string;
  lastSyncAt: string | null;
}

export interface RefreshFeedError {
  error: string;
  details: string;
  syncStatus: string;
  lastSyncAt: string | null;
}

export async function refreshFeed(shopId: string, retryCount = 0): Promise<RefreshFeedResponse> {
  const token = getAccessToken();

  const res = await fetch(`${API_URL}/api/v1/shops/${shopId}/sync/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });

  // Handle 401 Unauthorized - try to refresh token
  if (res.status === 401 && retryCount === 0) {
    try {
      await refreshAccessToken();
      return refreshFeed(shopId, retryCount + 1);
    } catch {
      clearAuthAndRedirect();
      throw new Error('Session expired. Please log in again.');
    }
  }

  // Handle 409 Conflict - sync in progress
  if (res.status === 409) {
    const errorData: RefreshFeedError = await res.json();
    const error = new Error(errorData.details || errorData.error) as Error & { syncInProgress: boolean; lastSyncAt: string | null };
    error.syncInProgress = true;
    error.lastSyncAt = errorData.lastSyncAt;
    throw error;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }

  return res.json();
}

// Field Mappings

export async function getFieldMappings(shopId: string) {
  return requestWithAuth<{
    mappings: Record<string, string | null>;
    userMappings: Record<string, string | null>;
    overrideCounts: Record<string, number>;
  }>(`/api/v1/shops/${shopId}/field-mappings`);
}

export async function updateFieldMappings(
  shopId: string,
  mappings: Record<string, string | null>,
  propagationMode: 'apply_all' | 'preserve_overrides'
) {
  return requestWithAuth<{ success: boolean }>(
    `/api/v1/shops/${shopId}/field-mappings`,
    {
      method: 'PUT',
      body: JSON.stringify({ mappings, propagationMode }),
    }
  );
}

// Product Field Overrides

export interface ProductOverridesResponse {
  productId: string;
  productTitle: string;
  overrides: ProductFieldOverrides;
  resolvedValues: Record<string, unknown>;
  feedEnableSearch: boolean;
  feedEnableCheckout: boolean;
  shopDefaultEnableSearch: boolean;
  isValid?: boolean;
  validationErrors?: Record<string, string[]> | null;
}

export async function getProductOverrides(shopId: string, productId: string) {
  return requestWithAuth<ProductOverridesResponse>(
    `/api/v1/shops/${shopId}/products/${productId}/field-overrides`
  );
}

export async function updateProductOverrides(
  shopId: string,
  productId: string,
  overrides: Record<string, unknown>
) {
  return requestWithAuth<ProductOverridesResponse>(
    `/api/v1/shops/${shopId}/products/${productId}/field-overrides`,
    {
      method: 'PUT',
      body: JSON.stringify({ overrides }),
    }
  );
}

export async function updateProduct(
  shopId: string,
  productId: string,
  data: { feedEnableSearch?: boolean }
) {
  return requestWithAuth<{ product: unknown }>(
    `/api/v1/shops/${shopId}/products/${productId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  );
}

// WooCommerce

export async function getWooFields(shopId: string) {
  return requestWithAuth<{ fields: Array<{ value: string; label: string; category: string; description?: string }> }>(
    `/api/v1/shops/${shopId}/woo-fields`
  );
}

export async function getProductWooData(shopId: string, productId: string) {
  return requestWithAuth<{ wooData: Record<string, unknown>; shopData: Record<string, unknown> }>(
    `/api/v1/shops/${shopId}/products/${productId}/woo-data`
  );
}

// Billing

export interface BillingInfo {
  tier: string;
  status: string | null;
  billingInterval: string | null; // 'month' or 'year'
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface BillingPrices {
  starter: { monthly: string; annual: string };
  professional: { monthly: string; annual: string };
}

export async function getBilling() {
  console.debug('[BILLING-CLIENT] getBilling() called');
  try {
    const result = await requestWithAuth<BillingInfo>('/api/v1/billing');
    console.debug('[BILLING-CLIENT] getBilling() response:', {
      tier: result.tier,
      status: result.status,
      currentPeriodEnd: result.currentPeriodEnd,
      cancelAtPeriodEnd: result.cancelAtPeriodEnd,
    });
    return result;
  } catch (err) {
    console.error('[BILLING-CLIENT] getBilling() FAILED:', err);
    throw err;
  }
}

export async function getBillingPrices() {
  console.debug('[BILLING-CLIENT] getBillingPrices() called');
  try {
    const result = await requestWithAuth<BillingPrices>('/api/v1/billing/prices');
    console.debug('[BILLING-CLIENT] getBillingPrices() response:', {
      hasStarterMonthly: !!result.starter?.monthly,
      hasStarterAnnual: !!result.starter?.annual,
      hasProMonthly: !!result.professional?.monthly,
      hasProAnnual: !!result.professional?.annual,
    });
    return result;
  } catch (err) {
    console.error('[BILLING-CLIENT] getBillingPrices() FAILED:', err);
    throw err;
  }
}

export async function createCheckoutSession(priceId: string) {
  console.debug('[BILLING-CLIENT] createCheckoutSession() called', { priceId });
  try {
    const result = await requestWithAuth<{ url: string }>('/api/v1/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ priceId }),
    });
    console.debug('[BILLING-CLIENT] createCheckoutSession() response:', {
      hasUrl: !!result.url,
      urlPreview: result.url?.substring(0, 50),
    });
    return result;
  } catch (err) {
    console.error('[BILLING-CLIENT] createCheckoutSession() FAILED:', err);
    throw err;
  }
}

export async function createPortalSession() {
  console.debug('[BILLING-CLIENT] createPortalSession() called');
  try {
    const result = await requestWithAuth<{ url: string }>('/api/v1/billing/portal', {
      method: 'POST',
    });
    console.debug('[BILLING-CLIENT] createPortalSession() response:', {
      hasUrl: !!result.url,
      urlPreview: result.url?.substring(0, 50),
    });
    return result;
  } catch (err) {
    console.error('[BILLING-CLIENT] createPortalSession() FAILED:', err);
    throw err;
  }
}

// Product Discovery & Selection

export interface DiscoveredProduct {
  id: string;
  wooProductId: number;
  wooTitle: string;
  wooPrice: string | null;
  wooImages: Array<{ src: string }> | null;
  isSelected: boolean;
  syncState: string;
}

export interface DiscoveredProductsResponse {
  products: DiscoveredProduct[];
  total: number;
  selected: number;
  selectedIds: string[]; // All selected product IDs for state initialization
  limit: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export async function discoverProducts(shopId: string) {
  return requestWithAuth<{ message: string; discovered: number }>(`/api/v1/shops/${shopId}/discover`, {
    method: 'POST',
  });
}

export async function getDiscoveredProducts(shopId: string, page = 1, pageSize = 48, search?: string) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) params.set('search', search);
  return requestWithAuth<DiscoveredProductsResponse>(
    `/api/v1/shops/${shopId}/products/discovered?${params}`
  );
}

export async function getFilteredProductIds(shopId: string, search?: string) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  const query = params.toString() ? `?${params}` : '';
  return requestWithAuth<{ ids: string[]; limit: number }>(`/api/v1/shops/${shopId}/products/discovered/ids${query}`);
}

export async function updateProductSelection(shopId: string, productIds: string[]) {
  return requestWithAuth<{
    success: boolean;
    selected: number;
    limit: number;
    message: string;
  }>(`/api/v1/shops/${shopId}/products/selection`, {
    method: 'PUT',
    body: JSON.stringify({ productIds }),
  });
}

// Analytics Waitlist

export interface WaitlistSignupResponse {
  success: boolean;
  message: string;
  alreadySignedUp: boolean;
}

export async function signupAnalyticsWaitlist(email: string): Promise<WaitlistSignupResponse> {
  return requestWithAuth<WaitlistSignupResponse>('/api/v1/analytics/waitlist', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export interface WaitlistStatusResponse {
  isSignedUp: boolean;
  signedUpAt: string | null;
}

export async function getAnalyticsWaitlistStatus(): Promise<WaitlistStatusResponse> {
  return requestWithAuth<WaitlistStatusResponse>('/api/v1/analytics/waitlist/status');
}
