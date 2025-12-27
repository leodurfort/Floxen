import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import * as api from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import type { WooCommerceField } from '@/lib/wooCommerceFields';

// Re-export for convenience
export type { WooCommerceField };

/**
 * Query hook for WooCommerce fields available for mapping
 * Long stale time since these are very stable
 */
export function useWooFieldsQuery(shopId: string | undefined) {
  const { user, hydrated } = useAuth();

  return useQuery({
    queryKey: queryKeys.wooCommerce.fields(shopId ?? ''),
    queryFn: async () => {
      if (!shopId) throw new Error('No shop selected');
      const result = await api.getWooFields(shopId);
      return result.fields;
    },
    enabled: hydrated && !!user && !!shopId,
    staleTime: 5 * 60 * 1000, // WooCommerce fields are very stable (5 minutes)
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
}

/**
 * Query hook for WooCommerce product data (for preview)
 * Used to show raw WooCommerce data alongside transformed feed data
 */
export function useWooProductDataQuery(shopId: string | undefined, productId: string | null | undefined) {
  const { user, hydrated } = useAuth();

  return useQuery({
    queryKey: queryKeys.wooCommerce.productData(shopId ?? '', productId ?? ''),
    queryFn: async () => {
      if (!shopId || !productId) throw new Error('No shop or product selected');
      return api.getProductWooData(shopId, productId);
    },
    enabled: hydrated && !!user && !!shopId && !!productId,
    staleTime: 60 * 1000, // 1 minute
  });
}
