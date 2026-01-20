'use client';

import { useEffect, useMemo } from 'react';
import { useSyncOperations } from '@/store/syncOperations';

interface ShopSyncData {
  id: string;
  syncStatus: string;
  syncProgress?: number | null;
  lastSyncAt?: string | null;
}

/**
 * Hook to determine if the sync status banner should be shown.
 * Shows banner for user-initiated syncs only (not cron syncs).
 *
 * Returns shouldShowBanner = true when:
 * - First sync (syncStatus === 'SYNCING' && lastSyncAt === null)
 * - User-initiated sync (localStorage flag set && syncStatus === 'SYNCING')
 * - Field mapping reprocessing (fieldMappingsUpdatedAt recent && syncing)
 *
 * Auto-clears the user-initiated flag when sync completes or fails.
 */
export function useUserInitiatedSync(shop: ShopSyncData | null) {
  const fieldMappingsUpdatedAt = useSyncOperations((s) => s.fieldMappingsUpdatedAt);
  const isUserInitiatedSync = useSyncOperations((s) => s.isUserInitiatedSync);
  const clearUserInitiatedSync = useSyncOperations((s) => s.clearUserInitiatedSync);

  const shouldShowBanner = useMemo(() => {
    if (!shop) return false;

    const isSyncing = shop.syncStatus === 'SYNCING';

    // Case 1: First sync (always show - this is implicitly user-initiated via OAuth)
    const isFirstSync = isSyncing && shop.lastSyncAt === null;
    if (isFirstSync) return true;

    // Case 2: User-initiated sync in progress (manual sync button or product selection)
    const isUserSync = isUserInitiatedSync(shop.id);
    if (isUserSync && isSyncing) return true;

    // Case 3: Field mapping reprocessing in progress
    // Detected by fieldMappingsUpdatedAt being within last 60 seconds while syncing
    const isReprocessing =
      fieldMappingsUpdatedAt !== null &&
      Date.now() - fieldMappingsUpdatedAt < 60000 &&
      isSyncing;
    if (isReprocessing) return true;

    return false;
  }, [shop, fieldMappingsUpdatedAt, isUserInitiatedSync]);

  // Auto-clear flag when sync completes or fails
  useEffect(() => {
    if (!shop) return;
    if (shop.syncStatus === 'COMPLETED' || shop.syncStatus === 'FAILED') {
      clearUserInitiatedSync(shop.id);
    }
  }, [shop, clearUserInitiatedSync]);

  return { shouldShowBanner };
}
