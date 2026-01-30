'use client';

import { useState } from 'react';
import clsx from 'clsx';

interface ProductPreviewProps {
  product: {
    title: string | null;
    image: string | null;
    price: string | null;
    availability: string | null;
    brand: string | null;
    url: string;
  };
}

function ImagePlaceholder() {
  return (
    <div className="w-[120px] h-[120px] rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
      <svg
        className="w-10 h-10 text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  );
}

function AvailabilityBadge({ availability }: { availability: string }) {
  const lower = availability.toLowerCase();
  const isInStock =
    lower.includes('instock') ||
    lower.includes('in stock') ||
    lower.includes('in_stock');
  const isOutOfStock =
    lower.includes('outofstock') ||
    lower.includes('out of stock') ||
    lower.includes('out_of_stock');

  return (
    <span
      className={clsx(
        'badge',
        isInStock && 'badge--success',
        isOutOfStock && 'badge--error',
        !isInStock && !isOutOfStock && 'badge--neutral'
      )}
    >
      {availability}
    </span>
  );
}

export function ProductPreview({ product }: ProductPreviewProps) {
  const [imgError, setImgError] = useState(false);
  const hasData = product.title || product.image || product.price || product.brand;

  if (!hasData) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 text-gray-500">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="text-sm">No product data detected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col sm:flex-row gap-5">
        {/* Product Image */}
        {product.image && !imgError ? (
          <img
            src={product.image}
            alt={product.title || 'Product image'}
            className="w-[120px] h-[120px] rounded-lg object-cover flex-shrink-0"
            onError={() => setImgError(true)}
          />
        ) : (
          <ImagePlaceholder />
        )}

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          {product.title && (
            <h3 className="font-semibold text-gray-900 truncate text-lg">
              {product.title}
            </h3>
          )}

          {product.brand && (
            <p className="text-gray-500 text-sm mt-0.5">{product.brand}</p>
          )}

          <div className="flex items-center gap-3 mt-2">
            {product.price && (
              <span className="font-semibold text-lg text-gray-900">
                {product.price}
              </span>
            )}
            {product.availability && (
              <AvailabilityBadge availability={product.availability} />
            )}
          </div>

          <p className="text-xs text-gray-400 truncate mt-3">{product.url}</p>
        </div>
      </div>
    </div>
  );
}
