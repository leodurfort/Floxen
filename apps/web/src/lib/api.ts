import { Shop, User, ProductFieldOverrides, CatalogProduct } from '@productsynch/shared';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api-production-6a74.up.railway.app';

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

// ═══════════════════════════════════════════════════════════════════════════
// TOKEN MANAGEMENT - Single source of truth is localStorage
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the current access token from localStorage
 * Returns null on server-side or if not authenticated
 */
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('productsynch.access');
}

/**
 * Clear all auth data and redirect to login
 */
function clearAuthAndRedirect(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('productsynch.user');
    localStorage.removeItem('productsynch.access');
    localStorage.removeItem('productsynch.refresh');
    window.location.href = '/login';
  }
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<string> {
  // Prevent multiple simultaneous refresh attempts
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = typeof window !== 'undefined'
        ? localStorage.getItem('productsynch.refresh')
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

      // Update localStorage with new tokens
      if (typeof window !== 'undefined') {
        localStorage.setItem('productsynch.access', newAccessToken);
        if (data.tokens.refreshToken) {
          localStorage.setItem('productsynch.refresh', data.tokens.refreshToken);
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

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Make an unauthenticated request (for login/register)
 */
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
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }

  return res.json();
}

/**
 * Make an authenticated request
 * Automatically includes auth header and handles token refresh on 401
 */
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

      // Retry the original request with new token
      headers.Authorization = `Bearer ${newAccessToken}`;

      return requestWithAuth<T>(path, { ...options, headers }, retryCount + 1);
    } catch {
      // Refresh failed - clear auth and redirect to login
      clearAuthAndRedirect();
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }

  return res.json();
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH ENDPOINTS (unauthenticated)
// ═══════════════════════════════════════════════════════════════════════════

export async function login(payload: { email: string; password: string }) {
  return request<{ user: User; tokens: { accessToken: string; refreshToken: string } }>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MULTI-STEP REGISTRATION FLOW
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD FLOW
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// USER PROFILE
// ═══════════════════════════════════════════════════════════════════════════

export async function getProfile() {
  return requestWithAuth<User>('/api/v1/users/me');
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

// ═══════════════════════════════════════════════════════════════════════════
// SHOPS
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT LISTING WITH FILTERS
// ═══════════════════════════════════════════════════════════════════════════

export interface ColumnFilter {
  text?: string;      // Text search within column
  values?: string[];  // Selected checkbox values
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

    // Encode column filters: cf_{columnId}_t for text, cf_{columnId}_v for values
    if (params.columnFilters) {
      for (const [columnId, filter] of Object.entries(params.columnFilters)) {
        if (filter.text) {
          searchParams.set(`cf_${columnId}_t`, filter.text);
        }
        if (filter.values && filter.values.length > 0) {
          // URL-encode each value before joining to handle commas and special characters
          searchParams.set(`cf_${columnId}_v`, filter.values.map(v => encodeURIComponent(v)).join(','));
        }
      }
    }
  }

  const queryString = searchParams.toString();
  const path = `/api/v1/shops/${shopId}/products${queryString ? `?${queryString}` : ''}`;

  return requestWithAuth<ListProductsResult>(path);
}

// ═══════════════════════════════════════════════════════════════════════════
// COLUMN VALUES FOR FILTERING
// ═══════════════════════════════════════════════════════════════════════════

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
  limit: number = 100,
  search?: string,
  currentFilters?: CurrentFiltersForColumnValues
): Promise<GetColumnValuesResult> {
  const params = new URLSearchParams();
  params.set('column', column);
  params.set('limit', String(limit));
  if (search) params.set('search', search);

  // Pass current filters for cascading filter support
  if (currentFilters?.globalSearch) {
    params.set('globalSearch', currentFilters.globalSearch);
  }
  if (currentFilters?.columnFilters) {
    for (const [columnId, filter] of Object.entries(currentFilters.columnFilters)) {
      if (filter.values && filter.values.length > 0) {
        // URL-encode each value before joining to handle commas and special characters
        params.set(`cf_${columnId}_v`, filter.values.map(v => encodeURIComponent(v)).join(','));
      }
      if (filter.text) {
        params.set(`cf_${columnId}_t`, filter.text);
      }
    }
  }

  return requestWithAuth<GetColumnValuesResult>(
    `/api/v1/shops/${shopId}/products/column-values?${params.toString()}`
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BULK UPDATE
// ═══════════════════════════════════════════════════════════════════════════

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
  selectionMode: 'selected' | 'filtered';
  productIds?: string[];
  filters?: BulkUpdateFilters;
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

// ═══════════════════════════════════════════════════════════════════════════
// FEED REFRESH (special handling for 409)
// ═══════════════════════════════════════════════════════════════════════════

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

/**
 * Refresh the OpenAI feed for a shop
 * Regenerates the FeedSnapshot with current product data
 * Returns 409 if sync is in progress
 */
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

// ═══════════════════════════════════════════════════════════════════════════
// FIELD MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get field mappings for a shop
 */
export async function getFieldMappings(shopId: string) {
  return requestWithAuth<{ mappings: Record<string, string | null>; userMappings: Record<string, string | null> }>(
    `/api/v1/shops/${shopId}/field-mappings`
  );
}

/**
 * Update field mappings for a shop
 */
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

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT FIELD OVERRIDES
// ═══════════════════════════════════════════════════════════════════════════

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

/**
 * Get product-level field overrides
 */
export async function getProductOverrides(shopId: string, productId: string) {
  return requestWithAuth<ProductOverridesResponse>(
    `/api/v1/shops/${shopId}/products/${productId}/field-overrides`
  );
}

/**
 * Update product-level field overrides
 */
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

/**
 * Update product properties (feedEnableSearch, etc.)
 */
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

// ═══════════════════════════════════════════════════════════════════════════
// WOOCOMMERCE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get WooCommerce fields available for mapping
 */
export async function getWooFields(shopId: string) {
  return requestWithAuth<{ fields: Array<{ value: string; label: string; category: string; description?: string }> }>(
    `/api/v1/shops/${shopId}/woo-fields`
  );
}

/**
 * Get WooCommerce data for a specific product (for preview)
 */
export async function getProductWooData(shopId: string, productId: string) {
  return requestWithAuth<{ wooData: Record<string, unknown>; shopData: Record<string, unknown> }>(
    `/api/v1/shops/${shopId}/products/${productId}/woo-data`
  );
}
