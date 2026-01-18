import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import * as api from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import type { Shop } from '@productsynch/shared';

export function useShopsQuery() {
  const { user, hydrated } = useAuth();

  return useQuery({
    queryKey: queryKeys.shops.all,
    queryFn: async () => {
      const result = await api.listShops();
      return result.shops;
    },
    enabled: hydrated && !!user,
  });
}

/**
 * Polls for shop sync status updates. Only active when enabled (shops are syncing).
 */
export function useShopsSyncPolling(enabled: boolean) {
  const { user, hydrated } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...queryKeys.shops.all, 'polling'],
    queryFn: async () => {
      const result = await api.listShops();
      queryClient.setQueryData(queryKeys.shops.all, result.shops);
      return result.shops;
    },
    enabled: hydrated && !!user && enabled,
    refetchInterval: enabled ? 3000 : false,
  });
}

export function useCreateShopMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { storeUrl: string; shopName?: string; shopCurrency?: string }) =>
      api.createShop(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.all });
    },
  });
}

export function useDeleteShopMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shopId: string) => api.deleteShop(shopId),
    onMutate: async (shopId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.shops.all });
      const previousShops = queryClient.getQueryData<Shop[]>(queryKeys.shops.all);
      queryClient.setQueryData<Shop[]>(queryKeys.shops.all, (old) =>
        old?.filter((s) => s.id !== shopId) ?? []
      );
      return { previousShops };
    },
    onError: (_err, _shopId, context) => {
      if (context?.previousShops) {
        queryClient.setQueryData(queryKeys.shops.all, context.previousShops);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.all });
    },
  });
}

export function useToggleSyncMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shopId, syncEnabled }: { shopId: string; syncEnabled: boolean }) =>
      api.toggleShopSync(shopId, syncEnabled),
    onMutate: async ({ shopId, syncEnabled }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.shops.all });
      const previousShops = queryClient.getQueryData<Shop[]>(queryKeys.shops.all);
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

export function useTriggerSyncMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shopId: string) => api.triggerProductSync(shopId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.all });
    },
  });
}

export function useUpdateShopMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shopId,
      data,
    }: {
      shopId: string;
      data: {
        sellerName?: string | null;
        sellerPrivacyPolicy?: string | null;
        sellerTos?: string | null;
        returnPolicy?: string | null;
        returnWindow?: number | null;
      };
    }) => api.updateShop(shopId, data),
    onMutate: async ({ shopId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.shops.all });
      const previousShops = queryClient.getQueryData<Shop[]>(queryKeys.shops.all);
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

/**
 * Activates the feed for a shop. No optimistic update because activation
 * can fail for valid business reasons (e.g., no products ready for feed).
 */
export function useActivateFeedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shopId: string) => api.activateFeed(shopId),
    onSuccess: (_data, shopId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.all });
      // Invalidate productStats to refresh tab counts (All Items, Ready for Feed, etc.)
      queryClient.invalidateQueries({ queryKey: ['shops', shopId, 'product-stats'] });
    },
  });
}
