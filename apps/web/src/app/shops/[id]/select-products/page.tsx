'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSyncOperations } from '@/store/syncOperations';
import * as api from '@/lib/api';
import { SearchFilter } from '@/components/catalog/FilterDropdown';
import { queryKeys } from '@/lib/queryClient';

const PAGE_SIZE = 48;
const DISCOVERY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const POLL_INTERVAL = 2000; // 2 seconds
const STABLE_POLLS_NEEDED = 2; // Consider complete after 2 polls with same count

// SessionStorage helpers for tracking discovery state across navigation
function getDiscoveryKey(shopId: string) {
  return `discovery_${shopId}_started`;
}

function isDiscoveryPending(shopId: string): boolean {
  if (typeof window === 'undefined') return false;
  const started = sessionStorage.getItem(getDiscoveryKey(shopId));
  if (!started) return false;
  const startedAt = parseInt(started, 10);
  return Date.now() - startedAt < DISCOVERY_TIMEOUT;
}

function markDiscoveryStarted(shopId: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(getDiscoveryKey(shopId), String(Date.now()));
}

function clearDiscoveryFlag(shopId: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(getDiscoveryKey(shopId));
}

export default function SelectProductsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, hydrated } = useAuth();

  const [products, setProducts] = useState<api.DiscoveredProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const discoveryAttempted = useRef(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPollCountRef = useRef<number>(-1);
  const stablePollCountRef = useRef<number>(0);

  const shopId = params?.id;

  // Load first page of discovered products
  const loadProducts = useCallback(async (page = 1, append = false, search?: string, showLoading = true) => {
    if (!shopId) return;

    try {
      if (page === 1 && showLoading) {
        setIsLoading(true);
      } else if (page > 1) {
        setIsLoadingMore(true);
      }

      const data = await api.getDiscoveredProducts(shopId, page, PAGE_SIZE, search);

      if (append) {
        setProducts((prev) => [...prev, ...data.products]);
      } else {
        setProducts(data.products);
        // Initialize selected IDs from API response (contains ALL selected IDs, not just current page)
        if (showLoading) {
          setSelectedIds(new Set(data.selectedIds));
        }
      }

      setTotal(data.total);
      setLimit(data.limit);
      setCurrentPage(data.page);
      setHasMore(data.hasMore);

      // If no products found and we haven't tried discovery yet, trigger it (only when not searching)
      if (data.total === 0 && !discoveryAttempted.current && !search) {
        discoveryAttempted.current = true;
        setIsDiscovering(true);
        markDiscoveryStarted(shopId);
        try {
          await api.discoverProducts(shopId);
          clearDiscoveryFlag(shopId);
          // Reload products after discovery
          const freshData = await api.getDiscoveredProducts(shopId, 1, PAGE_SIZE);
          setProducts(freshData.products);
          setTotal(freshData.total);
          setLimit(freshData.limit);
          setCurrentPage(freshData.page);
          setHasMore(freshData.hasMore);
          setSelectedIds(new Set(freshData.selectedIds));
        } catch (discoverErr) {
          clearDiscoveryFlag(shopId);
          setError(discoverErr instanceof Error ? discoverErr.message : 'Failed to discover products');
        } finally {
          setIsDiscovering(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [shopId]);

  // Poll for discovery completion - used when returning to page during discovery
  const pollForDiscoveryComplete = useCallback(async () => {
    if (!shopId) return;

    try {
      const data = await api.getDiscoveredProducts(shopId, 1, PAGE_SIZE);

      // Check if count has stabilized (same count for STABLE_POLLS_NEEDED polls)
      if (data.total === lastPollCountRef.current && data.total > 0) {
        stablePollCountRef.current++;
      } else {
        stablePollCountRef.current = 0;
        lastPollCountRef.current = data.total;
      }

      // Discovery is complete when we have products and count is stable
      if (data.total > 0 && stablePollCountRef.current >= STABLE_POLLS_NEEDED) {
        // Stop polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        clearDiscoveryFlag(shopId);
        setIsDiscovering(false);
        setIsLoading(false);
        setProducts(data.products);
        setTotal(data.total);
        setLimit(data.limit);
        setCurrentPage(data.page);
        setHasMore(data.hasMore);
        setSelectedIds(new Set(data.selectedIds));
      }
    } catch {
      // Ignore polling errors, will retry on next interval
    }
  }, [shopId]);

  useEffect(() => {
    if (hydrated && !user) {
      router.push('/login');
      return;
    }

    // Check if discovery was in progress (user navigated away and came back)
    if (shopId && isDiscoveryPending(shopId)) {
      // Show loading state and poll for completion
      setIsLoading(true);
      setIsDiscovering(true);
      lastPollCountRef.current = -1;
      stablePollCountRef.current = 0;

      // Start polling
      pollForDiscoveryComplete();
      pollIntervalRef.current = setInterval(pollForDiscoveryComplete, POLL_INTERVAL);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }

    loadProducts();
  }, [hydrated, user, router, shopId, loadProducts, pollForDiscoveryComplete]);

  // Debounce search input
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (searchInput === searchQuery) return;

    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
      // Don't clear products or show loading - just replace when new data arrives
      loadProducts(1, false, searchInput, false);
    }, 300);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput, searchQuery, loadProducts]);

  // -1 means unlimited (from PROFESSIONAL tier)
  const isUnlimited = limit === -1;

  function toggleProduct(productId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else if (isUnlimited || next.size < limit) {
        next.add(productId);
      }
      return next;
    });
  }

  async function selectAll() {
    if (!shopId) return;
    try {
      const { ids } = await api.getFilteredProductIds(shopId, searchQuery || undefined);
      setSelectedIds(new Set(ids));
    } catch (err) {
      setError('Failed to select products');
    }
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  function loadMore() {
    if (!isLoadingMore && hasMore) {
      loadProducts(currentPage + 1, true, searchQuery);
    }
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
        // Mark as user-initiated before triggering sync
        useSyncOperations.getState().setUserInitiatedSync(shopId);
        await api.triggerProductSync(shopId);
        // Invalidate shops query so the redirect sees SYNCING status
        await queryClient.invalidateQueries({ queryKey: queryKeys.shops.all });
      } catch {
        // Sync trigger is best-effort, clear flag on failure
        useSyncOperations.getState().clearUserInitiatedSync(shopId);
      }

      // Redirect to Dashboard for guided setup flow
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save selection');
      setIsSaving(false);
    }
  }

  const isOverLimit = !isUnlimited && selectedIds.size > limit;

  // Show loading spinner during initial load or discovery
  if (isLoading || isDiscovering) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Select Products</h1>
          <p className="text-gray-600">
            {isDiscovering
              ? 'Connecting to your WooCommerce store...'
              : 'Loading products...'}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center py-20">
          {/* Spinner */}
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-[#FA7315] rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-500 text-sm">
            {isDiscovering
              ? 'Fetching your product catalog. This may take a moment for larger stores.'
              : 'Please wait...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Select Products</h1>
        <p className="text-gray-600">
          Choose which products to display in ChatGPT.{' '}
          {isUnlimited ? (
            <>Your plan allows <span className="font-semibold">unlimited</span> products.</>
          ) : (
            <>Your plan allows up to <span className="font-semibold">{limit}</span> products.</>
          )}
        </p>
      </div>

      {/* Product Counter - minimal inline */}
      <div className="flex items-center gap-4 mb-4">
        <p className={`text-sm ${isOverLimit ? 'text-red-600' : 'text-gray-500'}`}>
          <span className="font-semibold">{selectedIds.size}</span>
          {isUnlimited ? '' : ` / ${limit}`} selected · {total} products in store
        </p>
        {!isUnlimited && selectedIds.size >= limit && (
          <a
            href="/pricing"
            className="text-sm text-[#FA7315] hover:text-[#E5650F] font-medium"
          >
            Need more? Upgrade →
          </a>
        )}
      </div>

      {/* Search and Actions Row */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <SearchFilter
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search products..."
          />
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
              disabled={!isUnlimited && selectedIds.size === limit}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUnlimited ? 'Select All' : 'Select All (up to limit)'}
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
          <p className="text-gray-500">
            {searchQuery ? 'No products match your search.' : 'No products found in your WooCommerce store.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {products.map((product) => {
              const isSelected = selectedIds.has(product.id);
              const imageUrl = product.wooImages?.[0]?.src;
              const canSelect = isSelected || isUnlimited || selectedIds.size < limit;

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
                disabled={isLoadingMore}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading...
                  </span>
                ) : (
                  `Load more (${total - products.length} remaining)`
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Fixed Bottom Bar - Save Button (starts after sidebar w-52 = 208px) */}
      {products.length > 0 && (
        <div className="fixed bottom-0 left-52 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {selectedIds.size}{isUnlimited ? '' : ` of ${limit}`} products selected
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
