import { ApiResponse, Product, Shop, User } from '@productsynch/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

export async function triggerProductSync(shopId: string, token: string) {
  return request<{ shopId: string; status: string }>(`/api/v1/shops/${shopId}/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
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
