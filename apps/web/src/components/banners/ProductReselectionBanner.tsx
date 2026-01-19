'use client';

import Link from 'next/link';

interface ProductReselectionBannerProps {
  shopId?: string;
  needsProductReselection?: boolean;
}

export function ProductReselectionBanner({
  shopId,
  needsProductReselection,
}: ProductReselectionBannerProps) {
  // Don't render if reselection is not needed
  if (!needsProductReselection) return null;

  return (
    <div className="mb-4 p-3 bg-amber-50 border border-amber-400 rounded-lg flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="text-amber-600 text-lg">&#9888;</span>
        <span className="text-amber-800 text-sm font-medium">
          Your subscription plan has changed. Please review your product selection to continue syncing.
        </span>
      </div>
      {shopId && (
        <Link
          href={`/shops/${shopId}/select-products`}
          className="px-4 py-1.5 bg-[#FA7315] hover:bg-[#E5650F] text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          Review Products
        </Link>
      )}
    </div>
  );
}
