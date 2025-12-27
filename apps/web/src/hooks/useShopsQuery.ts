import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import * as api from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import type { Shop } from '@productsynch/shared';

/**
 * Query hook for fetching all shops
 * Automatically handles auth state and hydration timing
 */
export function useShopsQuery() {
  const { user, hydrated } = useAuth();

  return useQuery({
    queryKey: queryKeys.shops.all,
    queryFn: async () => {
      const result = await api.listShops();
      return result.shops;
    },
    enabled: hydrated && !!user,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Conditional polling hook for sync status
 * Only polls when enabled (when shops are syncing)
 * Updates the main shops cache when new data arrives
 * @param enabled - Whether polling should be active
 */
export function useShopsSyncPolling(enabled: boolean) {
  const { user, hydrated } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...queryKeys.shops.all, 'polling'],
    queryFn: async () => {
      const result = await api.listShops();
      // Update the main shops cache with fresh data
      queryClient.setQueryData(queryKeys.shops.all, result.shops);
      return result.shops;
    },
    enabled: hydrated && !!user && enabled,
    refetchInterval: enabled ? 5000 : false, // 5s polling only when enabled
  });
}

/**
 * Mutation hook for creating a new shop
 * Invalidates shops query on success
 */
export function useCreateShopMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { storeUrl: string; shopName?: string; shopCurrency?: string }) => {
      return api.createShop(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.all });
    },
  });
}

/**
 * Mutation hook for deleting a shop
 * Handles optimistic update and query invalidation
 *
 * Note: With URL-first architecture, no Zustand store cleanup needed.
 * The sidebar's useCurrentShop will recompute based on the new shops list.
 */
export function useDeleteShopMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shopId: string) => {
      return api.deleteShop(shopId);
    },
    onMutate: async (shopId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.shops.all });

      // Get current shops for potential rollback
      const previousShops = queryClient.getQueryData<Shop[]>(queryKeys.shops.all);

      // Optimistic update - remove from cache
      queryClient.setQueryData<Shop[]>(queryKeys.shops.all, (old) =>
        old?.filter((s) => s.id !== shopId) ?? []
      );

      return { previousShops };
    },
    onError: (_err, _shopId, context) => {
      // Rollback on error
      if (context?.previousShops) {
        queryClient.setQueryData(queryKeys.shops.all, context.previousShops);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.all });
    },
  });
}

/**
 * Mutation hook for toggling shop sync
 */
export function useToggleSyncMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shopId, syncEnabled }: { shopId: string; syncEnabled: boolean }) => {
      return api.toggleShopSync(shopId, syncEnabled);
    },
    onMutate: async ({ shopId, syncEnabled }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.shops.all });

      const previousShops = queryClient.getQueryData<Shop[]>(queryKeys.shops.all);

      // Optimistic update
      queryClient.setQueryData<Shop[]>(queryKeys.shops.all, (old) =>
        old?.map((s) => (s.id === shopId ? { ...s, syncEnabled } : s)) ?? []
      );

      return { previousShops };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousShops) {
        queryClient.setQueryData(queryKeys.shops.all, context.previousShops);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.all });
    },
  });
}

/**
 * Mutation hook for triggering product sync
 */
export function useTriggerSyncMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shopId: string) => {
      return api.triggerProductSync(shopId);
    },
    onSuccess: () => {
      // Invalidate to show updated sync status
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.all });
    },
  });
}

/**
 * Mutation hook for updating shop metadata
 * Used for debounced auto-save of fields like privacy policy, TOS, etc.
 */
export function useUpdateShopMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shopId,
      data,
    }: {
      shopId: string;
      data: {
        sellerPrivacyPolicy?: string | null;
        sellerTos?: string | null;
        returnPolicy?: string | null;
        returnWindow?: number | null;
      };
    }) => {
      return api.updateShop(shopId, data);
    },
    onMutate: async ({ shopId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.shops.all });

      const previousShops = queryClient.getQueryData<Shop[]>(queryKeys.shops.all);

      // Optimistic update
      queryClient.setQueryData<Shop[]>(queryKeys.shops.all, (old) =>
        old?.map((s) => (s.id === shopId ? { ...s, ...data } : s)) ?? []
      );

      return { previousShops };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousShops) {
        queryClient.setQueryData(queryKeys.shops.all, context.previousShops);
      }
    },
  });
}
