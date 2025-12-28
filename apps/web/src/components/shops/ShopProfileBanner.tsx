'use client';

import Link from 'next/link';

interface ShopProfileBannerProps {
  shop: {
    id?: string;
    sellerName?: string | null;
    returnPolicy?: string | null;
    returnWindow?: number | null;
  };
  currentPath?: 'shops' | 'setup' | 'products';
}

export function ShopProfileBanner({ shop, currentPath }: ShopProfileBannerProps) {
  // Check if profile is complete
  const isProfileComplete = Boolean(shop.sellerName && shop.returnPolicy && shop.returnWindow);

  // Don't render if profile is complete
  if (isProfileComplete) return null;

  // Don't show "Complete Setup" button if already on shops page
  const showButton = currentPath !== 'shops';

  return (
    <div className="mb-6 p-3 bg-amber-50 border border-amber-400 rounded-lg flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="text-amber-600 text-lg">&#9888;</span>
        <span className="text-amber-800 text-sm font-medium">
          Complete your shop profile to publish products to ChatGPT
        </span>
      </div>
      {showButton && shop.id && (
        <Link
          href={`/shops?openProfile=${shop.id}`}
          className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          Complete Setup
        </Link>
      )}
    </div>
  );
}
