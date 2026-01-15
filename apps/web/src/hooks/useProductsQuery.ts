import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import * as api from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import type { ListProductsParams, CurrentFiltersForColumnValues, BulkUpdateRequest } from '@/lib/api';

/**
 * Serialize filters for stable query key
 * Ensures consistent cache keys regardless of object property order
 */
function serializeFilters(params: ListProductsParams): Record<string, unknown> {
  return {
    page: params.page ?? 1,
    limit: params.limit ?? 50,
    sortBy: params.sortBy ?? 'updatedAt',
    sortOrder: params.sortOrder ?? 'desc',
    search: params.search ?? '',
    columnFilters: params.columnFilters ?? {},
  };
}

/**
 * Query hook for products list with filtering, sorting, and pagination
 * Cache is automatically keyed by shopId + filters
 */
export function useProductsQuery(shopId: string | undefined, params: ListProductsParams) {
  const { user, hydrated } = useAuth();
  const serializedFilters = serializeFilters(params);

  console.log('[DEBUG] useProductsQuery hook called:', {
    shopId,
    params: JSON.stringify(params, null, 2),
    serializedFilters: JSON.stringify(serializedFilters, null, 2),
  });

  return useQuery({
    queryKey: queryKeys.products.list(shopId ?? '', serializedFilters),
    queryFn: async () => {
      console.log('[DEBUG] queryFn executing - calling API with:', {
        shopId,
        params: JSON.stringify(params, null, 2),
      });
      if (!shopId) throw new Error('No store selected');
      const result = await api.listProducts(shopId, params);
      console.log('[DEBUG] API returned:', {
        productsCount: result.products.length,
        total: result.pagination.total,
        firstProductId: result.products[0]?.id,
        firstProductIsValid: result.products[0]?.isValid,
        firstProductFeedEnabled: result.products[0]?.feedEnableSearch,
      });
      return result;
    },
    enabled: hydrated && !!user && !!shopId,
    staleTime: 30 * 1000, // 30 seconds
    // Keep previous data while fetching new page (smooth pagination)
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Serialize current filters for column values query key
 * This is what fixes the original cache bug - the key includes shopId + columnId + current filters
 */
function serializeColumnFilters(currentFilters?: CurrentFiltersForColumnValues): Record<string, unknown> {
  return {
    globalSearch: currentFilters?.globalSearch ?? '',
    columnFilters: currentFilters?.columnFilters ?? {},
  };
}

/**
 * Query hook for column values (for filter dropdowns)
 *
 * IMPORTANT: This fixes the original cache bug!
 * Cache is keyed by [shopId, columnId, currentFilters], so:
 * - Changing shops automatically uses a different cache entry
 * - Changing filters (cascading) also uses different cache entries
 */
export function useColumnValuesQuery(
  shopId: string | undefined,
  columnId: string,
  currentFilters?: CurrentFiltersForColumnValues,
  options?: { enabled?: boolean }
) {
  const { user, hydrated } = useAuth();
  const filterKey = serializeColumnFilters(currentFilters);

  return useQuery({
    queryKey: queryKeys.products.columnValues(shopId ?? '', columnId, filterKey),
    queryFn: async () => {
      if (!shopId) throw new Error('No store selected');
      const result = await api.getColumnValues(shopId, columnId, undefined, undefined, currentFilters);
      return result.values;
    },
    enabled: (options?.enabled ?? true) && hydrated && !!user && !!shopId && !!columnId,
    staleTime: 60 * 1000, // Column values are relatively stable (1 minute)
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

/**
 * Mutation hook for refreshing the OpenAI feed
 * Handles 409 conflict (sync in progress) specially
 */
export function useRefreshFeedMutation(shopId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('No store selected');
      return api.refreshFeed(shopId);
    },
    onSuccess: () => {
      if (shopId) {
        // Invalidate products to refresh any stale data
        queryClient.invalidateQueries({
          queryKey: ['products', shopId],
          exact: false,
        });
        // Invalidate product stats as validation may have changed counts
        queryClient.invalidateQueries({
          queryKey: ['shops', shopId, 'product-stats'],
        });
      }
    },
  });
}

/**
 * Mutation hook for bulk updating products
 * Invalidates both products and column values caches
 */
export function useBulkUpdateMutation(shopId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BulkUpdateRequest) => {
      if (!shopId) throw new Error('No store selected');
      return api.bulkUpdateProducts(shopId, payload);
    },
    onSuccess: () => {
      if (shopId) {
        // Invalidate all product-related queries for this shop
        queryClient.invalidateQueries({
          queryKey: ['products', shopId],
          exact: false,
        });
        // Also invalidate column values as counts may have changed
        queryClient.invalidateQueries({
          queryKey: ['columnValues', shopId],
          exact: false,
        });
        // Invalidate product stats as counts may have changed
        queryClient.invalidateQueries({
          queryKey: ['shops', shopId, 'product-stats'],
        });
      }
    },
  });
}
