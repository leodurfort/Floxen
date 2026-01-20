'use client';

import { useUserInitiatedSync } from '@/hooks/useUserInitiatedSync';

interface SyncStatusBannerProps {
  shop: {
    id: string;
    syncStatus: string;
    syncProgress?: number | null;
    lastSyncAt?: string | null;
  };
}

export function SyncStatusBanner({ shop }: SyncStatusBannerProps) {
  const { shouldShowBanner } = useUserInitiatedSync(shop);

  // Don't show banner if not a user-initiated sync
  if (!shouldShowBanner) return null;

  // Hide on failure (errors shown elsewhere)
  if (shop.syncStatus === 'FAILED') return null;

  // Ensure minimum 5% display for progress bar and text
  const displayProgress = Math.max(shop.syncProgress ?? 0, 5);

  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-300 rounded-lg">
      <div className="flex items-start gap-3">
        {/* Spinning sync icon */}
        <svg
          className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>

        <div className="flex-1 min-w-0">
          <div className="text-blue-800 text-sm font-medium">
            Syncing all product details...
          </div>
          <div className="text-blue-600 text-xs mt-1">
            This may take a few minutes depending on your catalog size.
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center gap-2 max-w-sm">
              <div className="flex-1 h-2 bg-blue-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${displayProgress}%` }}
                />
              </div>
              <span className="text-xs text-blue-600 min-w-[3rem] text-right">
                {shop.syncProgress !== null && shop.syncProgress !== undefined
                  ? `${Math.max(shop.syncProgress, 5)}%`
                  : 'Starting...'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
