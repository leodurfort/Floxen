'use client';

import Link from 'next/link';
import { useCurrentShop } from '@/hooks/useCurrentShop';
import { useProductStats } from '@/hooks/useProductStats';
import { deriveFeedState, type FeedState } from '@productsynch/shared';

function formatRelativeTime(date: string | null | undefined): string {
  if (!date) return 'Never';
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

const FEED_STATE_CONFIG: Record<
  FeedState,
  { label: string; colorClass: string; dotClass: string }
> = {
  not_activated: {
    label: 'Not Activated',
    colorClass: 'text-gray-600',
    dotClass: 'bg-gray-400',
  },
  active: {
    label: 'Active',
    colorClass: 'text-green-600',
    dotClass: 'bg-green-500',
  },
  paused: {
    label: 'Paused',
    colorClass: 'text-amber-600',
    dotClass: 'bg-amber-500',
  },
  error: {
    label: 'Error',
    colorClass: 'text-red-600',
    dotClass: 'bg-red-500',
  },
};

export function FeedHealthCard() {
  const { currentShop } = useCurrentShop();
  const { data: stats } = useProductStats(currentShop?.id);

  if (!currentShop) return null;

  const feedState = deriveFeedState(currentShop);
  const config = FEED_STATE_CONFIG[feedState];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Feed Health</h3>
        <span className={`flex items-center gap-1.5 text-sm font-medium ${config.colorClass}`}>
          <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
          {config.label}
        </span>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Store</span>
          <span className="font-medium text-gray-900 truncate max-w-[200px]">
            {currentShop.sellerName || currentShop.wooStoreUrl || 'Unnamed store'}
          </span>
        </div>

        {stats && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Products in Feed</span>
              <span className="font-medium text-gray-900">
                {stats.inFeed} / {stats.total}
              </span>
            </div>
            {stats.needsAttention > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Needs Attention</span>
                <span className="font-medium text-amber-600">{stats.needsAttention}</span>
              </div>
            )}
          </>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Last Sync</span>
          <span className="text-gray-500">
            {formatRelativeTime(currentShop.lastFeedGeneratedAt)}
          </span>
        </div>
      </div>

      {/* Footer Link */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <Link
          href={`/shops/${currentShop.id}/products`}
          className="text-[#FA7315] hover:text-[#E5650F] text-sm font-medium"
        >
          View Products &rarr;
        </Link>
      </div>
    </div>
  );
}
