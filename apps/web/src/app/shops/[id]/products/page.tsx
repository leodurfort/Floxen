'use client';

import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { listProducts, refreshFeed, RefreshFeedResponse, BulkUpdateOperation } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useCatalogSelection } from '@/store/catalogSelection';
import { useCatalogFilters } from '@/hooks/useCatalogFilters';
import { useBulkUpdate } from '@/hooks/useBulkUpdate';
import { Product } from '@productsynch/shared';
import { SearchFilter, FilterDropdown, BooleanFilter } from '@/components/catalog/FilterDropdown';
import { BulkActionToolbar } from '@/components/catalog/BulkActionToolbar';
import { BulkEditModal } from '@/components/catalog/BulkEditModal';
import { EditColumnsModal, getStoredColumns, saveStoredColumns } from '@/components/catalog/EditColumnsModal';
import { Toast } from '@/components/catalog/Toast';

// Helper to truncate text
function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return '—';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Helper to get image from WooCommerce raw JSON
function getProductImage(wooRawJson: unknown): string | null {
  if (!wooRawJson || typeof wooRawJson !== 'object') return null;
  const json = wooRawJson as Record<string, unknown>;
  const images = json.images;
  if (Array.isArray(images) && images.length > 0 && images[0].src) {
    return images[0].src;
  }
  return null;
}

// Helper to get permalink from WooCommerce raw JSON
function getProductUrl(wooRawJson: unknown): string | null {
  if (!wooRawJson || typeof wooRawJson !== 'object') return null;
  const json = wooRawJson as Record<string, unknown>;
  return (json.permalink as string) || null;
}

// Sync status options
const SYNC_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'SYNCING', label: 'Syncing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'PAUSED', label: 'Paused' },
];

// Stock status options
const STOCK_STATUS_OPTIONS = [
  { value: 'instock', label: 'In Stock' },
  { value: 'outofstock', label: 'Out of Stock' },
  { value: 'onbackorder', label: 'On Backorder' },
];

// Page size options
const PAGE_SIZE_OPTIONS = [25, 50, 100];

function CatalogPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, hydrate, hydrated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [feedRefreshing, setFeedRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modal states
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showEditColumnsModal, setShowEditColumnsModal] = useState(false);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  // Local search input state for debouncing
  const [searchInput, setSearchInput] = useState('');
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Use hooks
  const { filters, setFilters, resetFilters, toggleSort, hasActiveFilters, getApiFilters } = useCatalogFilters();
  const selection = useCatalogSelection();
  const { progress: bulkProgress, executeBulkUpdate } = useBulkUpdate(params?.id || '');

  // Initialize
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.push('/login');
    }
  }, [hydrated, accessToken, router]);

  // Initialize shop selection and column visibility
  useEffect(() => {
    if (params?.id) {
      selection.setShopId(params.id);
      setVisibleColumns(getStoredColumns(params.id));
    }
  }, [params?.id]);

  // Sync searchInput with URL filter on mount/URL change
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  // Debounce search input - update URL filter after 300ms of no typing
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    // Don't debounce on initial sync (when searchInput matches filters.search)
    if (searchInput === filters.search) return;

    searchDebounceRef.current = setTimeout(() => {
      setFilters({ search: searchInput });
    }, 300);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchInput, filters.search, setFilters]);

  // Fetch products when filters change or refreshKey changes
  useEffect(() => {
    if (!accessToken || !params?.id) return;

    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const productsRes = await listProducts(params.id, accessToken, {
          page: filters.page,
          limit: filters.limit,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
          search: filters.search || undefined,
          syncStatus: filters.syncStatus.length > 0 ? filters.syncStatus : undefined,
          isValid: filters.isValid,
          feedEnableSearch: filters.feedEnableSearch,
          wooStockStatus: filters.wooStockStatus.length > 0 ? filters.wooStockStatus : undefined,
          hasOverrides: filters.hasOverrides,
        });
        setProducts(productsRes.products);
        setTotalProducts(productsRes.pagination.total);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load products';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [accessToken, params?.id, filters, refreshKey]);

  // Navigate to product mapping page
  const handleRowClick = (productId: string) => {
    router.push(`/shops/${params.id}/products/${productId}/mapping`);
  };

  // Helper to format relative time
  const formatLastSync = (date: string | null): string => {
    if (!date) return 'never';
    const now = new Date();
    const syncDate = new Date(date);
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Refresh OpenAI feed
  const handleRefreshFeed = async () => {
    if (!accessToken || !params?.id) return;
    setFeedRefreshing(true);
    setError(null);
    try {
      const result: RefreshFeedResponse = await refreshFeed(params.id, accessToken);
      const lastSyncText = formatLastSync(result.lastSyncAt);
      setToast({ message: `Feed refreshed! (last sync: ${lastSyncText})`, type: 'success' });
    } catch (err: unknown) {
      const error = err as Error & { syncInProgress?: boolean; lastSyncAt?: string | null };
      if (error.syncInProgress) {
        const lastSyncText = formatLastSync(error.lastSyncAt || null);
        setError(`Sync in progress. Please wait. (last sync: ${lastSyncText})`);
      } else {
        setError(error.message || 'Failed to refresh feed');
      }
    } finally {
      setFeedRefreshing(false);
    }
  };

  // Selection handlers
  const handleToggleAll = () => {
    const pageIds = products.map(p => p.id);
    const allSelected = pageIds.every(id => selection.isSelected(id));
    if (allSelected) {
      selection.deselectAllOnPage(pageIds);
    } else {
      selection.selectAllOnPage(pageIds);
    }
  };

  const handleSelectAllMatching = () => {
    selection.setSelectAllMatching(true);
  };

  // Bulk action handlers
  const handleBulkUpdate = useCallback(async (update: BulkUpdateOperation) => {
    const apiFilters = getApiFilters();
    const result = await executeBulkUpdate(
      selection.selectAllMatching ? 'filtered' : 'selected',
      selection.selectAllMatching ? undefined : selection.getSelectedIds(),
      selection.selectAllMatching ? apiFilters : undefined,
      update
    );

    if (result) {
      selection.clearSelection();
      setShowBulkEditModal(false);
      setToast({
        message: `Updated ${result.processedProducts} products${result.failedProducts > 0 ? ` (${result.failedProducts} failed)` : ''}`,
        type: result.failedProducts > 0 ? 'error' : 'success',
      });
      // Refresh the product list by incrementing refreshKey
      setRefreshKey(k => k + 1);
    }
  }, [selection, getApiFilters, executeBulkUpdate]);

  // Column visibility
  const handleSaveColumns = (columns: string[]) => {
    setVisibleColumns(columns);
    if (params?.id) {
      saveStoredColumns(params.id, columns);
    }
  };

  const isColumnVisible = (columnId: string) => visibleColumns.includes(columnId);

  // Calculate selection state
  const pageIds = products.map(p => p.id);
  const selectedOnPage = pageIds.filter(id => selection.isSelected(id)).length;
  const allOnPageSelected = pageIds.length > 0 && selectedOnPage === pageIds.length;
  const someOnPageSelected = selectedOnPage > 0 && selectedOnPage < pageIds.length;
  const hasSelection = selection.getSelectedCount() > 0 || selection.selectAllMatching;
  const displayedSelectionCount = selection.selectAllMatching ? totalProducts : selection.getSelectedCount();

  // Pagination
  const totalPages = Math.ceil(totalProducts / filters.limit) || 1;

  if (!hydrated) {
    return <main className="shell"><div className="subtle">Loading session...</div></main>;
  }
  if (!accessToken) return null;

  return (
    <main className="shell space-y-4">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="panel space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="uppercase tracking-[0.18em] text-xs text-white/60">Products</p>
            <h1 className="section-title">Catalog</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefreshFeed}
              disabled={feedRefreshing}
              className="px-4 py-2 bg-[#5df0c0] text-black font-medium rounded-lg hover:bg-[#5df0c0]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
            >
              {feedRefreshing ? 'Refreshing...' : 'Refresh Feed'}
            </button>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'https://api-production-6a74.up.railway.app'}/api/v1/feed/${params.id}/view`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-white/20 text-white/80 font-medium rounded-lg hover:bg-white/5 transition-all text-sm"
            >
              View Feed
            </a>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex items-center gap-4 flex-wrap">
          <SearchFilter
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search products..."
          />
          <FilterDropdown
            label="Status"
            options={SYNC_STATUS_OPTIONS}
            selected={filters.syncStatus}
            onChange={(values) => setFilters({ syncStatus: values })}
          />
          <BooleanFilter
            label="Valid"
            value={filters.isValid}
            onChange={(value) => setFilters({ isValid: value })}
          />
          <BooleanFilter
            label="Search Enabled"
            value={filters.feedEnableSearch}
            onChange={(value) => setFilters({ feedEnableSearch: value })}
          />
          <FilterDropdown
            label="Stock"
            options={STOCK_STATUS_OPTIONS}
            selected={filters.wooStockStatus}
            onChange={(values) => setFilters({ wooStockStatus: values })}
          />
          <BooleanFilter
            label="Has Overrides"
            value={filters.hasOverrides}
            onChange={(value) => setFilters({ hasOverrides: value })}
          />
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-sm text-white/60 hover:text-white underline"
            >
              Clear Filters
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={() => setShowEditColumnsModal(true)}
            className="px-3 py-1.5 text-sm text-white/60 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
          >
            Edit Columns
          </button>
        </div>

        {error && <div className="text-sm text-red-300 px-4 py-2 bg-red-500/10 rounded-lg">{error}</div>}

        {/* Bulk Action Toolbar */}
        {hasSelection && (
          <BulkActionToolbar
            selectedCount={displayedSelectionCount}
            totalMatchingCount={totalProducts}
            selectAllMatching={selection.selectAllMatching}
            onSelectAllMatching={handleSelectAllMatching}
            onClearSelection={selection.clearSelection}
            onBulkEdit={() => setShowBulkEditModal(true)}
            isProcessing={bulkProgress.isProcessing}
          />
        )}

        {/* Table */}
        {loading && <div className="subtle">Loading products...</div>}
        {!loading && !products.length && <div className="subtle">No products found.</div>}
        {!loading && products.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="table">
              <thead>
                <tr>
                  {isColumnVisible('checkbox') && (
                    <th className="w-12">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        ref={(el) => { if (el) el.indeterminate = someOnPageSelected; }}
                        onChange={handleToggleAll}
                        className="w-4 h-4 rounded border-white/20 bg-transparent text-[#5df0c0] focus:ring-[#5df0c0]/50"
                      />
                    </th>
                  )}
                  {isColumnVisible('wooProductId') && (
                    <th className="w-16 cursor-pointer" onClick={() => toggleSort('wooProductId')}>
                      <div className="flex items-center gap-1">
                        ID
                        {filters.sortBy === 'wooProductId' && (
                          <span className="text-[#5df0c0]">{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  )}
                  {isColumnVisible('image') && <th className="w-16">Image</th>}
                  {isColumnVisible('wooTitle') && (
                    <th className="cursor-pointer" onClick={() => toggleSort('wooTitle')}>
                      <div className="flex items-center gap-1">
                        Name
                        {filters.sortBy === 'wooTitle' && (
                          <span className="text-[#5df0c0]">{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  )}
                  {isColumnVisible('wooPermalink') && <th>URL</th>}
                  {isColumnVisible('wooPrice') && (
                    <th className="w-24 cursor-pointer" onClick={() => toggleSort('wooPrice')}>
                      <div className="flex items-center gap-1">
                        Price
                        {filters.sortBy === 'wooPrice' && (
                          <span className="text-[#5df0c0]">{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  )}
                  {isColumnVisible('syncStatus') && (
                    <th className="w-24 cursor-pointer" onClick={() => toggleSort('syncStatus')}>
                      <div className="flex items-center gap-1">
                        Status
                        {filters.sortBy === 'syncStatus' && (
                          <span className="text-[#5df0c0]">{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  )}
                  {isColumnVisible('overrides') && <th className="w-24">Overrides</th>}
                  {isColumnVisible('isValid') && (
                    <th className="w-20 cursor-pointer" onClick={() => toggleSort('isValid')}>
                      <div className="flex items-center gap-1">
                        Valid
                        {filters.sortBy === 'isValid' && (
                          <span className="text-[#5df0c0]">{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  )}
                  {isColumnVisible('updatedAt') && (
                    <th className="cursor-pointer" onClick={() => toggleSort('updatedAt')}>
                      <div className="flex items-center gap-1">
                        Last Modified
                        {filters.sortBy === 'updatedAt' && (
                          <span className="text-[#5df0c0]">{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  )}
                  {isColumnVisible('feedEnableSearch') && (
                    <th className="w-28 cursor-pointer" onClick={() => toggleSort('feedEnableSearch')}>
                      <div className="flex items-center gap-1">
                        Search
                        {filters.sortBy === 'feedEnableSearch' && (
                          <span className="text-[#5df0c0]">{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  )}
                  {isColumnVisible('wooStockStatus') && <th className="w-28">Stock</th>}
                  {isColumnVisible('wooStockQuantity') && (
                    <th className="w-20 cursor-pointer" onClick={() => toggleSort('wooStockQuantity')}>
                      <div className="flex items-center gap-1">
                        Qty
                        {filters.sortBy === 'wooStockQuantity' && (
                          <span className="text-[#5df0c0]">{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  )}
                  <th className="w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const imageUrl = getProductImage(p.wooRawJson);
                  const productUrl = getProductUrl(p.wooRawJson);
                  const validationCount = p.validationErrors ? Object.keys(p.validationErrors as object).length : 0;
                  const overrideCount = p.productFieldOverrides ? Object.keys(p.productFieldOverrides as object).length : 0;
                  const isSelected = selection.isSelected(p.id);

                  return (
                    <tr
                      key={p.id}
                      className={`cursor-pointer hover:bg-white/5 transition-colors ${isSelected ? 'bg-[#5df0c0]/5' : ''}`}
                    >
                      {/* Checkbox */}
                      {isColumnVisible('checkbox') && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => selection.toggleProduct(p.id)}
                            className="w-4 h-4 rounded border-white/20 bg-transparent text-[#5df0c0] focus:ring-[#5df0c0]/50"
                          />
                        </td>
                      )}

                      {/* ID */}
                      {isColumnVisible('wooProductId') && (
                        <td onClick={() => handleRowClick(p.id)} className="font-mono text-sm">{p.wooProductId}</td>
                      )}

                      {/* Image */}
                      {isColumnVisible('image') && (
                        <td onClick={() => handleRowClick(p.id)}>
                          {imageUrl ? (
                            <img src={imageUrl} alt={p.wooTitle || 'Product'} className="w-10 h-10 object-cover rounded" />
                          ) : (
                            <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center text-white/30 text-xs">—</div>
                          )}
                        </td>
                      )}

                      {/* Name */}
                      {isColumnVisible('wooTitle') && (
                        <td onClick={() => handleRowClick(p.id)} className="text-sm text-white/80 max-w-[200px]">
                          {truncate(p.wooTitle, 60)}
                        </td>
                      )}

                      {/* URL */}
                      {isColumnVisible('wooPermalink') && (
                        <td className="text-sm max-w-[180px]">
                          {productUrl ? (
                            <a
                              href={productUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[#5df0c0] hover:text-[#5df0c0]/80 truncate block"
                              title={productUrl}
                            >
                              {truncate(productUrl, 30)}
                            </a>
                          ) : (
                            <span className="text-white/40">—</span>
                          )}
                        </td>
                      )}

                      {/* Price */}
                      {isColumnVisible('wooPrice') && (
                        <td onClick={() => handleRowClick(p.id)}>{p.wooPrice ? `$${p.wooPrice}` : '—'}</td>
                      )}

                      {/* Status */}
                      {isColumnVisible('syncStatus') && (
                        <td onClick={() => handleRowClick(p.id)} className="subtle text-sm">{p.syncStatus}</td>
                      )}

                      {/* Overrides */}
                      {isColumnVisible('overrides') && (
                        <td onClick={() => handleRowClick(p.id)} className="text-sm text-center">
                          {overrideCount > 0 ? (
                            <span className="text-[#5df0c0]">{overrideCount}</span>
                          ) : (
                            <span className="text-white/40">—</span>
                          )}
                        </td>
                      )}

                      {/* Validation */}
                      {isColumnVisible('isValid') && (
                        <td onClick={() => handleRowClick(p.id)}>
                          {p.isValid === false ? (
                            <div className="relative group">
                              <span className="text-amber-400 cursor-help">⚠️ {validationCount}</span>
                              <div className="absolute left-0 top-6 hidden group-hover:block z-20 w-80 p-3 bg-gray-900 border border-amber-500/30 rounded-lg shadow-xl text-xs">
                                <div className="font-semibold text-amber-400 mb-2">
                                  {validationCount} validation issue{validationCount !== 1 ? 's' : ''}
                                </div>
                                {p.validationErrors && (
                                  <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                                    {Object.entries(p.validationErrors as object).map(([field, errors]) => (
                                      <li key={field} className="text-white/80">
                                        <span className="text-white font-medium">{field}:</span>{' '}
                                        {Array.isArray(errors) ? errors.join(', ') : String(errors)}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[#5df0c0]">✓</span>
                          )}
                        </td>
                      )}

                      {/* Last Modified */}
                      {isColumnVisible('updatedAt') && (
                        <td onClick={() => handleRowClick(p.id)} className="subtle text-sm whitespace-nowrap">
                          {p.updatedAt ? new Date(p.updatedAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }) : '—'}
                        </td>
                      )}

                      {/* Enable Search */}
                      {isColumnVisible('feedEnableSearch') && (
                        <td onClick={() => handleRowClick(p.id)} className="text-sm">
                          {p.feedEnableSearch ? (
                            <span className="text-[#5df0c0]">Enabled</span>
                          ) : (
                            <span className="text-white/40">Disabled</span>
                          )}
                        </td>
                      )}

                      {/* Stock Status */}
                      {isColumnVisible('wooStockStatus') && (
                        <td onClick={() => handleRowClick(p.id)} className="text-sm text-white/60">
                          {p.wooStockStatus || '—'}
                        </td>
                      )}

                      {/* Stock Quantity */}
                      {isColumnVisible('wooStockQuantity') && (
                        <td onClick={() => handleRowClick(p.id)} className="text-sm text-white/60">
                          {p.wooStockQuantity ?? '—'}
                        </td>
                      )}

                      {/* Actions */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleRowClick(p.id)}
                          className="text-[#5df0c0] hover:text-[#5df0c0]/80 text-sm font-medium"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalProducts > 0 && (
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-white/60">
              Showing {((filters.page - 1) * filters.limit) + 1}-{Math.min(filters.page * filters.limit, totalProducts)} of {totalProducts.toLocaleString()} products
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/60">Per page:</span>
                <select
                  value={filters.limit}
                  onChange={(e) => setFilters({ limit: Number(e.target.value), page: 1 })}
                  className="px-2 py-1 bg-[#1a1d29] text-white text-sm rounded border border-white/10 focus:outline-none focus:border-[#5df0c0]/50"
                >
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFilters({ page: filters.page - 1 })}
                  disabled={filters.page <= 1}
                  className="px-3 py-1 text-sm text-white/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <span className="px-3 py-1 text-sm text-white/80">
                  {filters.page} / {totalPages}
                </span>
                <button
                  onClick={() => setFilters({ page: filters.page + 1 })}
                  disabled={filters.page >= totalPages}
                  className="px-3 py-1 text-sm text-white/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <BulkEditModal
        isOpen={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
        onSubmit={handleBulkUpdate}
        selectedCount={displayedSelectionCount}
        isProcessing={bulkProgress.isProcessing}
        shopId={params?.id || ''}
        accessToken={accessToken}
      />

      <EditColumnsModal
        isOpen={showEditColumnsModal}
        onClose={() => setShowEditColumnsModal(false)}
        visibleColumns={visibleColumns}
        onSave={handleSaveColumns}
      />
    </main>
  );
}

export default function ShopProductsPage() {
  return (
    <Suspense fallback={<main className="shell"><div className="subtle">Loading...</div></main>}>
      <CatalogPageContent />
    </Suspense>
  );
}
