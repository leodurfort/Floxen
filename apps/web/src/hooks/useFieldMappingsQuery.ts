import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import * as api from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { LOCKED_FIELD_MAPPINGS } from '@productsynch/shared';
import type { ProductOverridesResponse } from '@/lib/api';

export function useFieldMappingsQuery(shopId: string | undefined) {
  const { user, hydrated } = useAuth();

  return useQuery({
    queryKey: queryKeys.fieldMappings.shop(shopId ?? ''),
    queryFn: async () => {
      if (!shopId) throw new Error('No store selected');
      const result = await api.getFieldMappings(shopId);

      // Apply locked field mappings (cannot be changed by user)
      const loadedMappings = { ...(result.mappings || {}) };
      for (const [attribute, lockedValue] of Object.entries(LOCKED_FIELD_MAPPINGS)) {
        loadedMappings[attribute] = lockedValue;
      }
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
    staleTime: 60 * 1000,
  });
}

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
      if (!shopId) throw new Error('No store selected');
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
      queryClient.setQueryData(queryKeys.fieldMappings.shop(shopId), (old: typeof previousData) => ({
        ...old,
        mappings: { ...old?.mappings, ...mappings },
        userMappings: { ...old?.userMappings, ...mappings },
        overrideCounts: old?.overrideCounts || {},
      }));
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData && shopId) {
        queryClient.setQueryData(queryKeys.fieldMappings.shop(shopId), context.previousData);
      }
    },
    onSettled: () => {
      if (shopId) {
        // Invalidate field mappings cache
        queryClient.invalidateQueries({ queryKey: queryKeys.fieldMappings.shop(shopId) });

        // Invalidate products cache (immediate refresh for user navigating to catalog)
        queryClient.invalidateQueries({ queryKey: ['products', shopId], exact: false });

        // Invalidate shops cache to get fresh productsReprocessedAt for completion detection
        queryClient.invalidateQueries({ queryKey: queryKeys.shops.all });
      }
    },
  });
}

export function useProductOverridesQuery(shopId: string | undefined, productId: string | undefined) {
  const { user, hydrated } = useAuth();

  return useQuery({
    queryKey: queryKeys.fieldMappings.productOverrides(shopId ?? '', productId ?? ''),
    queryFn: async () => {
      if (!shopId || !productId) throw new Error('No store or product selected');
      return api.getProductOverrides(shopId, productId);
    },
    enabled: hydrated && !!user && !!shopId && !!productId,
    staleTime: 60 * 1000,
  });
}

export function useUpdateProductOverridesMutation(shopId: string | undefined, productId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (overrides: Record<string, unknown>) => {
      if (!shopId || !productId) throw new Error('No store or product selected');
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
      queryClient.setQueryData(
        queryKeys.fieldMappings.productOverrides(shopId, productId),
        (old: ProductOverridesResponse | undefined) =>
          old ? { ...old, overrides } : old
      );
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData && shopId && productId) {
        queryClient.setQueryData(
          queryKeys.fieldMappings.productOverrides(shopId, productId),
          context.previousData
        );
      }
    },
    onSuccess: (data, _vars, context) => {
      if (!shopId || !productId) return;
      // Merge server response to preserve fields not in response (e.g., feedEnableSearch)
      const previousData = context?.previousData;
      queryClient.setQueryData(
        queryKeys.fieldMappings.productOverrides(shopId, productId),
        (old: ProductOverridesResponse | undefined) => ({
          ...old,
          ...previousData,
          ...data,
        })
      );
      queryClient.invalidateQueries({ queryKey: ['products', shopId], exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.fieldMappings.shop(shopId) });
    },
  });
}

export function useUpdateFeedEnableSearchMutation(shopId: string | undefined, productId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enableSearch: boolean) => {
      if (!shopId || !productId) throw new Error('No store or product selected');
      return api.updateProduct(shopId, productId, { feedEnableSearch: enableSearch });
    },
    onSuccess: () => {
      if (!shopId || !productId) return;
      queryClient.invalidateQueries({
        queryKey: queryKeys.fieldMappings.productOverrides(shopId, productId),
      });
      queryClient.invalidateQueries({ queryKey: ['products', shopId], exact: false });
      queryClient.invalidateQueries({ queryKey: ['columnValues', shopId], exact: false });
    },
  });
}
