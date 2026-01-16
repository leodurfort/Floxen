import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import * as api from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import type { ListProductsParams, CurrentFiltersForColumnValues, BulkUpdateRequest } from '@/lib/api';

function serializeFilters(params: ListProductsParams): Record<string, unknown> {
  return {
    page: params.page ?? 1,
    limit: params.limit ?? 50,
    sortBy: params.sortBy ?? 'id',
    sortOrder: params.sortOrder ?? 'asc',
    search: params.search ?? '',
    columnFilters: params.columnFilters ?? {},
  };
}

export function useProductsQuery(shopId: string | undefined, params: ListProductsParams) {
  const { user, hydrated } = useAuth();
  const serializedFilters = serializeFilters(params);

  return useQuery({
    queryKey: queryKeys.products.list(shopId ?? '', serializedFilters),
    queryFn: async () => {
      if (!shopId) throw new Error('No store selected');
      return api.listProducts(shopId, params);
    },
    enabled: hydrated && !!user && !!shopId,
    placeholderData: (previousData) => previousData,
  });
}

function serializeColumnFilters(currentFilters?: CurrentFiltersForColumnValues): Record<string, unknown> {
  return {
    globalSearch: currentFilters?.globalSearch ?? '',
    columnFilters: currentFilters?.columnFilters ?? {},
  };
}

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
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useRefreshFeedMutation(shopId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!shopId) throw new Error('No store selected');
      return api.refreshFeed(shopId);
    },
    onSuccess: () => {
      if (!shopId) return;
      queryClient.invalidateQueries({ queryKey: ['products', shopId], exact: false });
      queryClient.invalidateQueries({ queryKey: ['shops', shopId, 'product-stats'] });
    },
  });
}

export function useBulkUpdateMutation(shopId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BulkUpdateRequest) => {
      if (!shopId) throw new Error('No store selected');
      return api.bulkUpdateProducts(shopId, payload);
    },
    onSuccess: () => {
      if (!shopId) return;
      queryClient.invalidateQueries({ queryKey: ['products', shopId], exact: false });
      queryClient.invalidateQueries({ queryKey: ['columnValues', shopId], exact: false });
      queryClient.invalidateQueries({ queryKey: ['shops', shopId, 'product-stats'] });
    },
  });
}
