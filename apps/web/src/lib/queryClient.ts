import { QueryClient } from '@tanstack/react-query';

/**
 * Custom retry logic that respects our 401 handling in api.ts
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  // Don't retry on auth errors (api.ts handles 401 -> refresh -> retry internally)
  if (error instanceof Error && error.message.includes('Session expired')) {
    return false;
  }
  // Don't retry on conflict errors (e.g., sync in progress)
  if (error instanceof Error && error.message.includes('409')) {
    return false;
  }
  return failureCount < 3;
}

/**
 * Create a new QueryClient with default options
 * Called once per app instance (not per render)
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
        retry: shouldRetry,
        refetchOnWindowFocus: false, // Disable by default, enable per-query where needed
      },
      mutations: {
        retry: false, // Mutations should not auto-retry
      },
    },
  });
}

/**
 * Query key factory for type-safe, consistent keys
 * All keys should be created through this factory to ensure consistency
 */
export const queryKeys = {
  // Shops
  shops: {
    all: ['shops'] as const,
    detail: (shopId: string) => ['shop', shopId] as const,
  },

  // Products
  products: {
    list: (shopId: string, filters: Record<string, unknown>) =>
      ['products', shopId, filters] as const,
    detail: (shopId: string, productId: string) =>
      ['product', shopId, productId] as const,
    columnValues: (shopId: string, columnId: string, filters: Record<string, unknown>) =>
      ['columnValues', shopId, columnId, filters] as const,
  },

  // Field mappings
  fieldMappings: {
    shop: (shopId: string) => ['fieldMappings', shopId] as const,
    productOverrides: (shopId: string, productId: string) =>
      ['productOverrides', shopId, productId] as const,
  },

  // WooCommerce
  wooCommerce: {
    fields: (shopId: string) => ['wooFields', shopId] as const,
    productData: (shopId: string, productId: string) =>
      ['wooProductData', shopId, productId] as const,
  },
} as const;
