import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import type { ProductStats } from '@floxen/shared';

export function useProductStats(shopId: string | undefined) {
  return useQuery<ProductStats>({
    queryKey: queryKeys.shops.productStats(shopId!),
    queryFn: () => api.getProductStats(shopId!),
    enabled: !!shopId,
  });
}
