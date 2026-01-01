import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import * as api from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { LOCKED_FIELD_MAPPINGS } from '@productsynch/shared';
import type { ProductOverridesResponse } from '@/lib/api';

/**
 * Query hook for shop-level field mappings
 * Applies locked field mappings automatically
 */
export function useFieldMappingsQuery(shopId: string | undefined) {
  const { user, hydrated } = useAuth();

  return useQuery({
    queryKey: queryKeys.fieldMappings.shop(shopId ?? ''),
    queryFn: async () => {
      if (!shopId) throw new Error('No shop selected');
      const result = await api.getFieldMappings(shopId);

      // Apply locked field mappings (these can't be changed by the user)
      const loadedMappings = { ...(result.mappings || {}) };
      Object.entries(LOCKED_FIELD_MAPPINGS).forEach(([attribute, lockedValue]) => {
        loadedMappings[attribute] = lockedValue;
      });
      if (!loadedMappings.enable_search) {
        loadedMappings.enable_search = 'ENABLED';
      }

      return {
        mappings: loadedMappings,
        userMappings: result.userMappings || {},
        overrideCounts: result.overrideCounts || {},
      };
    },
    enabled: hydrated && !!user && !!shopId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Mutation hook for updating field mappings
 * Supports optimistic updates with rollback on error
 */
export function useUpdateFieldMappingsMutation(shopId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mappings,
      propagationMode,
    }: {
      mappings: Record<string, string | null>;
      propagationMode: 'apply_all' | 'preserve_overrides';
    }) => {
      if (!shopId) throw new Error('No shop selected');
      return api.updateFieldMappings(shopId, mappings, propagationMode);
    },
    onMutate: async ({ mappings }) => {
      if (!shopId) return;

      await queryClient.cancelQueries({ queryKey: queryKeys.fieldMappings.shop(shopId) });

      const previousData = queryClient.getQueryData<{
        mappings: Record<string, string | null>;
        userMappings: Record<string, string | null>;
        overrideCounts: Record<string, number>;
      }>(queryKeys.fieldMappings.shop(shopId));

      // Optimistic update (preserve overrideCounts)
      queryClient.setQueryData(queryKeys.fieldMappings.shop(shopId), (old: typeof previousData) => ({
        ...old,
        mappings: { ...old?.mappings, ...mappings },
        userMappings: { ...old?.userMappings, ...mappings },
        overrideCounts: old?.overrideCounts || {},
      }));

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      // Rollback optimistic update
      if (context?.previousData && shopId) {
        queryClient.setQueryData(queryKeys.fieldMappings.shop(shopId), context.previousData);
      }
    },
    onSettled: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.fieldMappings.shop(shopId) });
      }
    },
  });
}

/**
 * Query hook for product-level field overrides
 * Now uses the centralized API function with proper auth handling
 */
export function useProductOverridesQuery(shopId: string | undefined, productId: string | undefined) {
  const { user, hydrated } = useAuth();

  return useQuery({
    queryKey: queryKeys.fieldMappings.productOverrides(shopId ?? '', productId ?? ''),
    queryFn: async () => {
      if (!shopId || !productId) throw new Error('No shop or product selected');
      return api.getProductOverrides(shopId, productId);
    },
    enabled: hydrated && !!user && !!shopId && !!productId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Mutation hook for updating product-level field overrides
 * Supports optimistic updates with rollback
 * Now uses the centralized API function with proper auth handling
 */
export function useUpdateProductOverridesMutation(shopId: string | undefined, productId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (overrides: Record<string, unknown>) => {
      if (!shopId || !productId) throw new Error('No shop or product selected');
      return api.updateProductOverrides(shopId, productId, overrides);
    },
    onMutate: async (overrides) => {
      if (!shopId || !productId) return;

      await queryClient.cancelQueries({
        queryKey: queryKeys.fieldMappings.productOverrides(shopId, productId),
      });

      const previousData = queryClient.getQueryData<ProductOverridesResponse>(
        queryKeys.fieldMappings.productOverrides(shopId, productId)
      );

      // Optimistic update - use correct field name 'overrides'
      queryClient.setQueryData(
        queryKeys.fieldMappings.productOverrides(shopId, productId),
        (old: ProductOverridesResponse | undefined) =>
          old ? { ...old, overrides } : old
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      // Rollback optimistic update
      if (context?.previousData && shopId && productId) {
        queryClient.setQueryData(
          queryKeys.fieldMappings.productOverrides(shopId, productId),
          context.previousData
        );
      }
    },
    onSuccess: (data, _vars, context) => {
      // Merge server response with existing cache to preserve fields not in response
      // (e.g., feedEnableSearch is not returned by PUT but must be preserved)
      if (shopId && productId) {
        const previousData = context?.previousData;
        queryClient.setQueryData(
          queryKeys.fieldMappings.productOverrides(shopId, productId),
          (old: ProductOverridesResponse | undefined) => ({
            ...old,
            ...previousData,
            ...data,
          })
        );
        // Invalidate products list so catalog shows updated override count
        queryClient.invalidateQueries({
          queryKey: ['products', shopId],
          exact: false,
        });
      }
    },
  });
}

/**
 * Mutation hook for updating product's feedEnableSearch
 * This is the proper way to update enable_search - via the column, not overrides
 * Invalidates both product overrides cache and products list cache
 */
export function useUpdateFeedEnableSearchMutation(shopId: string | undefined, productId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enableSearch: boolean) => {
      if (!shopId || !productId) throw new Error('No shop or product selected');
      return api.updateProduct(shopId, productId, { feedEnableSearch: enableSearch });
    },
    onSuccess: () => {
      if (shopId && productId) {
        // Invalidate product overrides to refresh the resolved values
        queryClient.invalidateQueries({
          queryKey: queryKeys.fieldMappings.productOverrides(shopId, productId),
        });
        // Invalidate products list so catalog shows updated value
        queryClient.invalidateQueries({
          queryKey: ['products', shopId],
          exact: false,
        });
        // Invalidate column values as filter counts may have changed
        queryClient.invalidateQueries({
          queryKey: ['columnValues', shopId],
          exact: false,
        });
      }
    },
  });
}
