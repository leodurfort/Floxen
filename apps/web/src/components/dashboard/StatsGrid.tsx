'use client';

import { useRouter } from 'next/navigation';
import { formatRelativeTime } from '@/lib/dateUtils';

interface StatsGridProps {
  shopId: string;
  stats: {
    total: number;
    inFeed: number;
    needsAttention: number;
    productCount?: number;
    productCountInFeed?: number;
    productCountNeedsAttention?: number;
  };
  lastFeedGeneratedAt: string | null;
  syncEnabled: boolean;
  feedStatus: string;
  openaiEnabled: boolean;
}

interface SyncStatusDisplay {
  label: string;
  dotClass: string;
  textClass: string;
}

function getSyncStatusDisplay(
  syncEnabled: boolean,
  feedStatus: string,
  openaiEnabled: boolean
): SyncStatusDisplay {
  if (feedStatus === 'SYNCING') {
    return {
      label: 'Syncing...',
      dotClass: 'bg-blue-500 animate-pulse',
      textClass: 'text-blue-600',
    };
  }
  if (feedStatus === 'FAILED') {
    return {
      label: 'Sync error',
      dotClass: 'bg-red-500',
      textClass: 'text-red-600',
    };
  }
  if (!openaiEnabled) {
    return {
      label: 'Not activated',
      dotClass: 'bg-gray-400',
      textClass: 'text-gray-500',
    };
  }
  if (syncEnabled) {
    return {
      label: 'Auto-sync on',
      dotClass: 'bg-green-500',
      textClass: 'text-green-600',
    };
  }
  return {
    label: 'Auto-sync paused',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600',
  };
}

export function StatsGrid({
  shopId,
  stats,
  lastFeedGeneratedAt,
  syncEnabled,
  feedStatus,
  openaiEnabled,
}: StatsGridProps) {
  const router = useRouter();
  const syncStatus = getSyncStatusDisplay(syncEnabled, feedStatus, openaiEnabled);

  // Format product count as subtext (e.g., "15 products")
  const formatProductSubtext = (count: number | undefined) => {
    if (count === undefined) return undefined;
    return `${count} ${count === 1 ? 'product' : 'products'}`;
  };

  const clickableCards = [
    {
      label: 'Total Items',
      value: stats.total.toLocaleString(),
      subtext: formatProductSubtext(stats.productCount),
      // Use page=1 to ensure URL params are present, which prevents localStorage filter restoration
      onClick: () => router.push(`/shops/${shopId}/products?page=1`),
    },
    {
      label: 'In Feed',
      value: stats.inFeed.toLocaleString(),
      subtext: formatProductSubtext(stats.productCountInFeed),
      onClick: () =>
        router.push(`/shops/${shopId}/products?cf_isValid_v=true&cf_enable_search_v=true`),
    },
    {
      label: 'Needs Attention',
      value: stats.needsAttention.toLocaleString(),
      subtext: formatProductSubtext(stats.productCountNeedsAttention),
      valueClass: stats.needsAttention > 0 ? 'text-amber-600' : undefined,
      onClick: () => router.push(`/shops/${shopId}/products?cf_isValid_v=false`),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {clickableCards.map((card) => (
        <button
          key={card.label}
          onClick={card.onClick}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-left hover:border-[#FA7315] hover:shadow-md transition-all group relative"
        >
          <span className="absolute top-4 right-4 text-gray-300 group-hover:text-[#FA7315] transition-colors">
            →
          </span>
          <div className="text-sm text-gray-500 mb-1">{card.label}</div>
          <div className={`text-3xl font-bold ${card.valueClass || 'text-gray-900'}`}>
            {card.value}
          </div>
          {card.subtext && (
            <div className="text-sm text-gray-500 mt-1">{card.subtext}</div>
          )}
        </button>
      ))}

      {/* Last Sync - not clickable */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="text-sm text-gray-500 mb-1">Last Sync</div>
        <div className="text-3xl font-bold text-gray-900">
          {formatRelativeTime(lastFeedGeneratedAt)}
        </div>
        <div className={`flex items-center gap-1.5 mt-2 text-xs ${syncStatus.textClass}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${syncStatus.dotClass}`} />
          {syncStatus.label}
        </div>
      </div>
    </div>
  );
}
