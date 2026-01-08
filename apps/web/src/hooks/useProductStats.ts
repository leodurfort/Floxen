import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import type { ProductStats } from '@productsynch/shared';

/**
 * Query hook for fetching product stats for a shop
 * Returns counts: total, inFeed, needsAttention, disabled
 */
export function useProductStats(shopId: string | undefined) {
  return useQuery<ProductStats>({
    queryKey: queryKeys.shops.productStats(shopId!),
    queryFn: () => api.getProductStats(shopId!),
    enabled: !!shopId,
    staleTime: 30 * 1000, // 30 seconds
  });
}
