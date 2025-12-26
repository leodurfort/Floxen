import { ApiResponse, Product, Shop, User } from '@productsynch/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api-production-6a74.up.railway.app';

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

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

async function request<T>(path: string, options: RequestInit = {}, retryCount = 0): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    credentials: 'include',
  });

  // Handle 401 Unauthorized - try to refresh token
  if (res.status === 401 && retryCount === 0 && path !== '/api/v1/auth/refresh') {
    try {
      const newAccessToken = await refreshAccessToken();

      // Retry the original request with new token
      const newHeaders = { ...options.headers } as Record<string, string>;
      if (newHeaders.Authorization) {
        newHeaders.Authorization = `Bearer ${newAccessToken}`;
      }

      return request<T>(path, { ...options, headers: newHeaders }, retryCount + 1);
    } catch (refreshError) {
      // Refresh failed - clear auth and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('productsynch.user');
        localStorage.removeItem('productsynch.access');
        localStorage.removeItem('productsynch.refresh');
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }

  return res.json();
}

export async function login(payload: { email: string; password: string }) {
  return request<{ user: User; tokens: { accessToken: string; refreshToken: string } }>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function register(payload: { email: string; password: string; name?: string }) {
  return request<{ user: User; tokens: { accessToken: string; refreshToken: string } }>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listShops(token: string) {
  return request<{ shops: Shop[] }>('/api/v1/shops', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getShop(shopId: string, token: string) {
  return request<{ shop: Shop }>(`/api/v1/shops/${shopId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
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
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listProducts(
  shopId: string,
  token: string,
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
          searchParams.set(`cf_${columnId}_v`, filter.values.join(','));
        }
      }
    }
  }

  const queryString = searchParams.toString();
  const path = `/api/v1/shops/${shopId}/products${queryString ? `?${queryString}` : ''}`;

  return request<ListProductsResult>(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
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

export async function getColumnValues(
  shopId: string,
  token: string,
  column: string,
  limit: number = 100,
  search?: string
): Promise<GetColumnValuesResult> {
  const params = new URLSearchParams();
  params.set('column', column);
  params.set('limit', String(limit));
  if (search) params.set('search', search);

  return request<GetColumnValuesResult>(
    `/api/v1/shops/${shopId}/products/column-values?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
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
  token: string,
  payload: BulkUpdateRequest
): Promise<BulkUpdateResponse> {
  return request<BulkUpdateResponse>(
    `/api/v1/shops/${shopId}/products/bulk-update`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }
  );
}

export async function createShop(payload: { storeUrl: string; shopName?: string; shopCurrency?: string }, token: string) {
  return request<{ shop: Shop; authUrl: string }>('/api/v1/shops', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function requestProduct(shopId: string, productId: string, token: string) {
  return request<{ product: Product }>(`/api/v1/shops/${shopId}/products/${productId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function triggerProductSync(shopId: string, token: string) {
  return request<{ shopId: string; status: string }>(`/api/v1/shops/${shopId}/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function latestFeed(shopId: string, token: string) {
  return request<{ feedUrl: string; generatedAt: string; productCount: number }>(`/api/v1/shops/${shopId}/sync/feed/latest`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

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
export async function refreshFeed(shopId: string, token: string, retryCount = 0): Promise<RefreshFeedResponse> {
  const res = await fetch(`${API_URL}/api/v1/shops/${shopId}/sync/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
  });

  // Handle 401 Unauthorized - try to refresh token
  if (res.status === 401 && retryCount === 0) {
    try {
      const newAccessToken = await refreshAccessToken();
      return refreshFeed(shopId, newAccessToken, retryCount + 1);
    } catch {
      // Refresh failed - clear auth and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('productsynch.user');
        localStorage.removeItem('productsynch.access');
        localStorage.removeItem('productsynch.refresh');
        window.location.href = '/login';
      }
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

export async function deleteShop(shopId: string, token: string) {
  return request<{ shop: Shop; message: string }>(`/api/v1/shops/${shopId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function toggleShopSync(shopId: string, syncEnabled: boolean, token: string) {
  return request<{ shop: Shop }>(`/api/v1/shops/${shopId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ syncEnabled }),
  });
}

export async function updateShop(
  shopId: string,
  data: {
    sellerPrivacyPolicy?: string | null;
    sellerTos?: string | null;
    returnPolicy?: string | null;
    returnWindow?: number | null;
  },
  token: string
) {
  return request<{ shop: Shop }>(`/api/v1/shops/${shopId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

/**
 * Get field mappings for a shop
 */
export async function getFieldMappings(shopId: string, token: string) {
  return request<{ mappings: Record<string, string> }>(
    `/api/v1/shops/${shopId}/field-mappings`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

/**
 * Update field mappings for a shop
 */
export async function updateFieldMappings(
  shopId: string,
  mappings: Record<string, string>,
  token: string
) {
  return request<{ shop: Shop }>(
    `/api/v1/shops/${shopId}/field-mappings`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mappings }),
    }
  );
}
