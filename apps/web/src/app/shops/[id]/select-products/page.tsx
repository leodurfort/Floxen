'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import * as api from '@/lib/api';

const PRODUCTS_PER_PAGE = 48;

export default function SelectProductsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, hydrated } = useAuth();

  const [products, setProducts] = useState<api.DiscoveredProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(15);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [displayCount, setDisplayCount] = useState(PRODUCTS_PER_PAGE);

  const shopId = params?.id;

  // Load discovered products
  const loadProducts = useCallback(async () => {
    if (!shopId) return;

    try {
      setIsLoading(true);
      const data = await api.getDiscoveredProducts(shopId);
      setProducts(data.products);
      setTotal(data.total);
      setLimit(data.limit);

      // Initialize selected IDs from existing selections
      const selected = new Set(
        data.products.filter((p) => p.isSelected).map((p) => p.id)
      );
      setSelectedIds(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    if (hydrated && !user) {
      router.push('/login');
      return;
    }
    loadProducts();
  }, [hydrated, user, router, loadProducts]);

  function toggleProduct(productId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else if (next.size < limit) {
        next.add(productId);
      }
      return next;
    });
  }

  function selectAll() {
    const newSelected = new Set<string>();
    // Select up to limit products
    for (const product of products) {
      if (newSelected.size >= limit) break;
      newSelected.add(product.id);
    }
    setSelectedIds(newSelected);
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  function loadMore() {
    setDisplayCount((prev) => Math.min(prev + PRODUCTS_PER_PAGE, products.length));
  }

  async function handleSave() {
    if (!shopId) return;

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await api.updateProductSelection(shopId, Array.from(selectedIds));
      setSuccessMessage(result.message);

      // Trigger a sync after selection
      try {
        await api.triggerProductSync(shopId);
      } catch {
        // Sync trigger is best-effort
      }

      // Redirect to catalog after short delay
      setTimeout(() => {
        router.push(`/shops/${shopId}/products`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save selection');
      setIsSaving(false);
    }
  }

  const remainingSlots = limit - selectedIds.size;
  const isOverLimit = selectedIds.size > limit;
  const displayedProducts = products.slice(0, displayCount);
  const hasMore = displayCount < products.length;

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Select Products</h1>
        <p className="text-gray-600">
          Choose which products to sync to your OpenAI feed.
          Your plan allows up to <span className="font-semibold">{limit}</span> products.
        </p>
      </div>

      {/* Selection Counter */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`text-3xl font-bold ${
                isOverLimit ? 'text-red-600' : 'text-gray-900'
              }`}
            >
              {selectedIds.size}
              <span className="text-gray-400 text-xl font-normal"> / {limit}</span>
            </div>
            <div className="text-sm text-gray-500">
              {remainingSlots > 0 ? (
                <span>{remainingSlots} slots remaining</span>
              ) : isOverLimit ? (
                <span className="text-red-600">Over limit by {Math.abs(remainingSlots)}</span>
              ) : (
                <span className="text-green-600">Limit reached</span>
              )}
            </div>
            <div className="text-sm text-gray-400 border-l border-gray-200 pl-4">
              {total} products in your WooCommerce store
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={deselectAll}
              disabled={selectedIds.size === 0}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Deselect All
            </button>
            <button
              onClick={selectAll}
              disabled={selectedIds.size === limit}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select All (up to limit)
            </button>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          {successMessage}
        </div>
      )}

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-500">No products found. Try running product discovery first.</p>
          <button
            onClick={async () => {
              if (!shopId) return;
              try {
                await api.discoverProducts(shopId);
                loadProducts();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to discover products');
              }
            }}
            className="mt-4 btn btn--primary"
          >
            Discover Products
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {displayedProducts.map((product) => {
              const isSelected = selectedIds.has(product.id);
              const imageUrl = product.wooImages?.[0]?.src;
              const canSelect = isSelected || selectedIds.size < limit;

              return (
                <div
                  key={product.id}
                  onClick={() => canSelect && toggleProduct(product.id)}
                  className={`relative bg-white border-2 rounded-xl overflow-hidden transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#FA7315] shadow-md'
                      : canSelect
                      ? 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      : 'border-gray-200 opacity-60 cursor-not-allowed'
                  }`}
                >
                  {/* Selection Indicator */}
                  <div
                    className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 ${
                      isSelected
                        ? 'bg-[#FA7315] border-[#FA7315]'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Product Image - using regular img tag for external URLs */}
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.wooTitle}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg
                          className="w-12 h-12"
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
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                      {product.wooTitle}
                    </h3>
                    {product.wooPrice && (
                      <p className="text-sm text-gray-500">${product.wooPrice}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMore}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                Load more ({products.length - displayCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* Fixed Bottom Bar - Save Button */}
      {products.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {selectedIds.size} of {limit} products selected
            </p>
            <button
              onClick={handleSave}
              disabled={isSaving || isOverLimit || selectedIds.size === 0}
              className="btn btn--primary px-6 py-2"
            >
              {isSaving ? 'Saving...' : 'Save Selection'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
