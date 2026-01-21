import * as testData from '../fixtures/test-data';

/**
 * API helper for direct backend calls during tests
 */

interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    accessToken?: string;
  } = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, accessToken } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(`${testData.API_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => null);

    return {
      ok: response.ok,
      status: response.status,
      data: response.ok ? data : null,
      error: response.ok ? null : data?.error || response.statusText,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a new user via API (for test setup)
 */
export async function createTestUser(
  email: string,
  password: string,
  firstName: string = 'Test',
  surname: string = 'User'
): Promise<ApiResponse<{ user: Record<string, unknown>; tokens: Record<string, string> }>> {
  // Start registration
  const startRes = await apiRequest('/api/v1/auth/register/start', {
    method: 'POST',
    body: { email },
  });

  if (!startRes.ok) {
    return startRes as ApiResponse<never>;
  }

  // In test environment, we'd need to bypass email verification
  // This would require a test-only API endpoint or mock

  return {
    ok: false,
    status: 501,
    data: null,
    error: 'Full user creation requires email verification bypass',
  };
}

/**
 * Get shop details via API
 */
export async function getShop(
  shopId: string,
  accessToken: string
): Promise<ApiResponse<{ shop: Record<string, unknown> }>> {
  return apiRequest(`/api/v1/shops/${shopId}`, { accessToken });
}

/**
 * Trigger sync via API
 */
export async function triggerSync(
  shopId: string,
  accessToken: string
): Promise<ApiResponse<{ shopId: string; status: string }>> {
  return apiRequest(`/api/v1/shops/${shopId}/sync`, {
    method: 'POST',
    accessToken,
  });
}

/**
 * Get sync status via API
 */
export async function getSyncStatus(
  shopId: string,
  accessToken: string
): Promise<ApiResponse<{ status: string; lastSyncAt: string | null }>> {
  return apiRequest(`/api/v1/shops/${shopId}/sync/status`, { accessToken });
}
