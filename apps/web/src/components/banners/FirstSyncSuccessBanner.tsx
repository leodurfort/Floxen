'use client';

import { useState, useEffect, useRef } from 'react';

interface FirstSyncSuccessBannerProps {
  shopId: string;
  totalItems: number;
  lastSyncAt: string | null;
  syncStatus: string;
}

const STORAGE_KEY_PREFIX = 'productsynch:firstSyncBanner:shown:';

export function FirstSyncSuccessBanner({
  shopId,
  totalItems,
  lastSyncAt,
  syncStatus,
}: FirstSyncSuccessBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const prevSyncStatusRef = useRef<string | null>(null);
  const prevLastSyncAtRef = useRef<string | null>(null);
  const prevShopIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Check if we've already shown this banner for this shop
    const hasShownBefore = localStorage.getItem(`${STORAGE_KEY_PREFIX}${shopId}`) === 'true';
    if (hasShownBefore) {
      return; // Never show again
    }

    // Reset refs when shopId changes to establish new baseline
    if (prevShopIdRef.current !== shopId) {
      prevShopIdRef.current = shopId;
      prevSyncStatusRef.current = syncStatus;
      prevLastSyncAtRef.current = lastSyncAt;
      setIsVisible(false);
      return;
    }

    // Detect first sync completion:
    // - Previous status was SYNCING or PENDING
    // - Current status is COMPLETED
    // - lastSyncAt just changed from null to a value (or changed to a new value)
    const wasSyncing =
      prevSyncStatusRef.current === 'SYNCING' || prevSyncStatusRef.current === 'PENDING';
    const justCompleted = syncStatus === 'COMPLETED' && wasSyncing;
    const syncAtChanged = lastSyncAt !== prevLastSyncAtRef.current && lastSyncAt !== null;

    if (justCompleted && syncAtChanged) {
      setIsVisible(true);
      // Mark as shown so it never appears again
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${shopId}`, 'true');
    }

    // Update refs for next comparison
    prevSyncStatusRef.current = syncStatus;
    prevLastSyncAtRef.current = lastSyncAt;
  }, [shopId, lastSyncAt, syncStatus]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="mb-4 p-4 bg-green-50 border border-green-300 rounded-lg flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="text-green-600 text-lg flex-shrink-0">&#10003;</span>
        <div>
          <div className="text-green-800 font-medium">First sync complete!</div>
          <div className="text-green-700 text-sm mt-0.5">
            {totalItems.toLocaleString()} items imported. Each product variation counts as a
            separate item for ChatGPT.
          </div>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="text-green-600 hover:text-green-800 text-lg font-light flex-shrink-0"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}
