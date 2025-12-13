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
