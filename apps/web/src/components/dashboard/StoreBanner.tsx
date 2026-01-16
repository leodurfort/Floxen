import { getFeedStateConfig, type SyncStatus } from '@/lib/feedUtils';

interface StoreBannerProps {
  shop: {
    wooStoreUrl?: string;
    sellerName?: string | null;
    openaiEnabled: boolean;
    syncEnabled: boolean;
    feedStatus: SyncStatus;
  };
}

export function StoreBanner({ shop }: StoreBannerProps) {
  const config = getFeedStateConfig(shop);

  const displayName =
    shop.sellerName ||
    shop.wooStoreUrl?.replace(/^https?:\/\//, '') ||
    'Unnamed store';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
      <span className="text-lg font-semibold text-gray-900">{displayName}</span>
      <span
        className={`flex items-center gap-1.5 text-sm font-medium ${config.colorClass}`}
      >
        <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
        {config.label}
      </span>
    </div>
  );
}
