import { QueryClient } from '@tanstack/react-query';

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof Error) {
    if (error.message.includes('Session expired') || error.message.includes('409')) {
      return false;
    }
  }
  return failureCount < 3;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export const queryKeys = {
  shops: {
    all: ['shops'] as const,
    detail: (shopId: string) => ['shop', shopId] as const,
    productStats: (shopId: string) => ['shops', shopId, 'product-stats'] as const,
  },
  products: {
    list: (shopId: string, filters: Record<string, unknown>) =>
      ['products', shopId, filters] as const,
    detail: (shopId: string, productId: string) =>
      ['product', shopId, productId] as const,
    columnValues: (shopId: string, columnId: string, filters: Record<string, unknown>) =>
      ['columnValues', shopId, columnId, filters] as const,
  },
  fieldMappings: {
    shop: (shopId: string) => ['fieldMappings', shopId] as const,
    productOverrides: (shopId: string, productId: string) =>
      ['productOverrides', shopId, productId] as const,
  },
  wooCommerce: {
    fields: (shopId: string) => ['wooFields', shopId] as const,
    productData: (shopId: string, productId: string) =>
      ['wooProductData', shopId, productId] as const,
  },
} as const;
