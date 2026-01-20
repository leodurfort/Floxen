import { useMemo, useRef, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useShopsQuery, useShopsSyncPolling } from './useShopsQuery';
import { useSyncOperations } from '@/store/syncOperations';
import type { Shop } from '@floxen/shared';

/**
 * Derives the current shop from the URL (single source of truth).
 * Priority: pathname > query param > first connected shop > first shop.
 */
export function useCurrentShop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: shops = [], isLoading } = useShopsQuery();

  const shopIdFromPathname = useMemo(() => {
    const match = pathname.match(/^\/shops\/([^/]+)/);
    return match && match[1] !== 'new' ? match[1] : null;
  }, [pathname]);

  const shopIdFromQuery = searchParams.get('shop');
  const shopIdFromUrl = shopIdFromPathname || shopIdFromQuery;

  const currentShop = useMemo((): Shop | null => {
    if (shops.length === 0) return null;
    if (shopIdFromUrl) {
      const shop = shops.find((s) => s.id === shopIdFromUrl);
      if (shop) return shop;
    }
    return shops.find((s) => s.isConnected) ?? shops[0];
  }, [shops, shopIdFromUrl]);

  const isFirstSync = (currentShop?.syncStatus === 'SYNCING' || currentShop?.syncStatus === 'PENDING')
    && currentShop?.lastSyncAt === null;

  // Enable polling for 60 seconds after field mappings update to detect reprocessing completion
  const fieldMappingsUpdatedAt = useSyncOperations((s) => s.fieldMappingsUpdatedAt);
  const isReprocessingRecent = fieldMappingsUpdatedAt !== null &&
    Date.now() - fieldMappingsUpdatedAt < 60000;

  useShopsSyncPolling(isFirstSync || isReprocessingRecent);

  // Invalidate products cache when sync completes
  const queryClient = useQueryClient();
  const prevSyncStatusRef = useRef<string | null>(null);

  useEffect(() => {
    const prevStatus = prevSyncStatusRef.current;
    const currentStatus = currentShop?.syncStatus;

    if (
      (prevStatus === 'SYNCING' || prevStatus === 'PENDING') &&
      currentStatus === 'COMPLETED' &&
      currentShop?.id
    ) {
      queryClient.invalidateQueries({ queryKey: ['products', currentShop.id] });
      // Also invalidate productStats so banner shows correct count
      queryClient.invalidateQueries({ queryKey: ['shops', currentShop.id, 'product-stats'] });
    }

    prevSyncStatusRef.current = currentStatus ?? null;
  }, [currentShop?.syncStatus, currentShop?.id, queryClient]);

  // Invalidate products cache when background reprocessing completes
  const prevReprocessedAtRef = useRef<string | null>(null);

  useEffect(() => {
    const prevReprocessedAt = prevReprocessedAtRef.current;
    const currentReprocessedAt = currentShop?.productsReprocessedAt ?? null;

    // If productsReprocessedAt changed (not just initial load), invalidate products and columnValues
    if (
      prevReprocessedAt !== null &&
      currentReprocessedAt !== null &&
      currentReprocessedAt !== prevReprocessedAt &&
      currentShop?.id
    ) {
      queryClient.invalidateQueries({ queryKey: ['products', currentShop.id] });
      queryClient.invalidateQueries({ queryKey: ['columnValues', currentShop.id], exact: false });
      queryClient.invalidateQueries({ queryKey: ['shops', currentShop.id, 'product-stats'] });
    }

    prevReprocessedAtRef.current = currentReprocessedAt;
  }, [currentShop?.productsReprocessedAt, currentShop?.id, queryClient]);

  return {
    currentShop,
    shopIdFromUrl,
    isLoading,
    shops,
  };
}
