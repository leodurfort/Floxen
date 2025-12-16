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

export async function listProducts(shopId: string, token: string) {
  return request<{ products: Product[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
    `/api/v1/shops/${shopId}/products`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
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

export async function triggerProductEnrich(shopId: string, productId: string, token: string) {
  return request<{ product: Product; message: string }>(`/api/v1/shops/${shopId}/products/${productId}/enrich`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function triggerProductSync(shopId: string, token: string, forceFull: boolean = false) {
  return request<{ shopId: string; status: string }>(`/api/v1/shops/${shopId}/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ type: forceFull ? 'FULL' : undefined }),
  });
}

export async function latestFeed(shopId: string, token: string) {
  return request<{ feedUrl: string; completedAt: string; totalProducts: number }>(`/api/v1/shops/${shopId}/sync/feed/latest`, {
    headers: { Authorization: `Bearer ${token}` },
  });
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

// New API functions for 3-column enrichment flow

export async function updateProductManualField(
  shopId: string,
  productId: string,
  field: string,
  value: string | string[] | Array<{ q: string; a: string }>,
  token: string
) {
  return request<{ product: Product }>(`/api/v1/shops/${shopId}/products/${productId}/manual-field`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ field, value }),
  });
}

export async function updateProductSelectedSource(
  shopId: string,
  productId: string,
  field: string,
  source: 'manual' | 'ai',
  token: string
) {
  return request<{ product: Product }>(`/api/v1/shops/${shopId}/products/${productId}/selected-source`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ field, source }),
  });
}

export async function getResolvedValues(shopId: string, productId: string, token: string) {
  return request<{ resolved: any }>(`/api/v1/shops/${shopId}/products/${productId}/resolved-values`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getProductEnrichmentData(shopId: string, productId: string, token: string) {
  return request<{
    product: {
      id: string;
      wooProductId: number;
      status: string;
      isValid: boolean;
      feedEnableSearch: boolean;
      feedEnableCheckout: boolean;
    };
    autoFilled: Record<string, any>;
    edited: Record<string, any>;
    aiData: {
      title?: string;
      description?: string;
      category?: string;
      keywords?: string[];
      q_and_a?: Array<{ q: string; a: string }>;
    };
    selectedSources: Record<string, 'manual' | 'ai'>;
    resolved: any;
    validationErrors: Record<string, string[]>;
  }>(`/api/v1/shops/${shopId}/products/${productId}/enrichment-data`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateOpenAIField(
  shopId: string,
  productId: string,
  field: string,
  value: any,
  token: string
) {
  return request<{ product: Product }>(`/api/v1/shops/${shopId}/products/${productId}/openai-field`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ field, value }),
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
