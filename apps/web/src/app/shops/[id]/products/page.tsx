'use client';

import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { listProducts, refreshFeed, RefreshFeedResponse, BulkUpdateOperation, getColumnValues } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useCatalogSelection } from '@/store/catalogSelection';
import { useCatalogFilters } from '@/hooks/useCatalogFilters';
import { useBulkUpdate } from '@/hooks/useBulkUpdate';
import { Product } from '@productsynch/shared';
import { SearchFilter } from '@/components/catalog/FilterDropdown';
import { BulkActionToolbar } from '@/components/catalog/BulkActionToolbar';
import { BulkEditModal } from '@/components/catalog/BulkEditModal';
import { EditColumnsModal, getStoredColumns, saveStoredColumns } from '@/components/catalog/EditColumnsModal';
import { Toast } from '@/components/catalog/Toast';
import { ColumnHeaderDropdown, type ColumnValue } from '@/components/catalog/ColumnHeaderDropdown';
import { ClearFiltersButton } from '@/components/catalog/ClearFiltersButton';
import {
  COLUMN_MAP,
  formatColumnValue,
  getColumnValue,
  type ColumnDefinition,
  type ProductData,
} from '@/lib/columnDefinitions';

// Page size options
const PAGE_SIZE_OPTIONS = [25, 50, 100];

// Helper to truncate text
function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return '—';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

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

  // Column values cache for filter dropdowns
  const [columnValuesCache, setColumnValuesCache] = useState<Record<string, ColumnValue[]>>({});
  const [loadingColumnValues, setLoadingColumnValues] = useState<Record<string, boolean>>({});

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
  const {
    filters,
    setFilters,
    setSort,
    hasActiveFilters,
    hasColumnFilters,
    getLegacyApiFilters,
    getColumnFilter,
    setColumnTextFilter,
    setColumnValueFilter,
    clearColumnFilter,
    clearAllColumnFilters,
  } = useCatalogFilters();
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
        // Use legacy filters for backward compatibility with current API
        const legacyFilters = getLegacyApiFilters();

        const productsRes = await listProducts(params.id, accessToken, {
          page: filters.page,
          limit: filters.limit,
          sortBy: filters.sortBy as any,
          sortOrder: filters.sortOrder,
          search: filters.search || undefined,
          syncStatus: legacyFilters.syncStatus as string[] | undefined,
          isValid: legacyFilters.isValid as boolean | undefined,
          feedEnableSearch: legacyFilters.feedEnableSearch as boolean | undefined,
          wooStockStatus: legacyFilters.wooStockStatus as string[] | undefined,
          hasOverrides: legacyFilters.hasOverrides as boolean | undefined,
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
  }, [accessToken, params?.id, filters, refreshKey, getLegacyApiFilters]);

  // Load column values for filter dropdown
  const loadColumnValues = useCallback(async (columnId: string) => {
    if (!accessToken || !params?.id) return;
    if (columnValuesCache[columnId]) return;
    if (loadingColumnValues[columnId]) return;

    setLoadingColumnValues((prev) => ({ ...prev, [columnId]: true }));

    try {
      const result = await getColumnValues(params.id, accessToken, columnId, 100);
      setColumnValuesCache((prev) => ({
        ...prev,
        [columnId]: result.values,
      }));
    } catch (err) {
      console.error(`Failed to load values for column ${columnId}:`, err);
    } finally {
      setLoadingColumnValues((prev) => ({ ...prev, [columnId]: false }));
    }
  }, [accessToken, params?.id, columnValuesCache, loadingColumnValues]);

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
    const pageIds = products.map((p) => p.id);
    const allSelected = pageIds.every((id) => selection.isSelected(id));
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
  const handleBulkUpdate = useCallback(
    async (update: BulkUpdateOperation) => {
      const apiFilters = getLegacyApiFilters();
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
        setRefreshKey((k) => k + 1);
      }
    },
    [selection, getLegacyApiFilters, executeBulkUpdate]
  );

  // Column visibility
  const handleSaveColumns = (columns: string[]) => {
    setVisibleColumns(columns);
    if (params?.id) {
      saveStoredColumns(params.id, columns);
    }
  };

  // Get visible column definitions
  const visibleColumnDefs = visibleColumns
    .map((id) => COLUMN_MAP.get(id))
    .filter((col): col is ColumnDefinition => col !== undefined);

  // Calculate selection state
  const pageIds = products.map((p) => p.id);
  const selectedOnPage = pageIds.filter((id) => selection.isSelected(id)).length;
  const allOnPageSelected = selection.selectAllMatching || (pageIds.length > 0 && selectedOnPage === pageIds.length);
  const someOnPageSelected = !selection.selectAllMatching && selectedOnPage > 0 && selectedOnPage < pageIds.length;
  const hasSelection = selection.getSelectedCount() > 0 || selection.selectAllMatching;
  const displayedSelectionCount = selection.selectAllMatching ? totalProducts : selection.getSelectedCount();

  // Pagination
  const totalPages = Math.ceil(totalProducts / filters.limit) || 1;

  // Render cell value based on column definition
  const renderCellValue = (column: ColumnDefinition, product: Product) => {
    const productData = product as unknown as ProductData;

    // Special rendering for certain columns
    switch (column.id) {
      case 'checkbox':
        return null; // Handled separately

      case 'actions':
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRowClick(product.id);
            }}
            className="text-[#5df0c0] hover:text-[#5df0c0]/80 text-sm font-medium"
          >
            Edit
          </button>
        );

      case 'image_link': {
        const imageUrl = getColumnValue(productData, 'image_link') as string | null;
        if (imageUrl) {
          return <img src={imageUrl} alt={product.wooTitle || 'Product'} className="w-10 h-10 object-cover rounded" />;
        }
        return <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center text-white/30 text-xs">—</div>;
      }

      case 'title':
        return <span className="text-sm text-white/80">{truncate(formatColumnValue(productData, 'title'), 60)}</span>;

      case 'link': {
        const url = getColumnValue(productData, 'link') as string | null;
        if (url) {
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[#5df0c0] hover:text-[#5df0c0]/80 truncate block text-sm"
              title={url}
            >
              {truncate(url, 30)}
            </a>
          );
        }
        return <span className="text-white/40">—</span>;
      }

      case 'syncStatus':
        return <span className="text-sm text-white/60">{product.syncStatus}</span>;

      case 'overrides': {
        const count = getColumnValue(productData, 'overrides') as number;
        return count > 0 ? (
          <span className="text-[#5df0c0]">{count}</span>
        ) : (
          <span className="text-white/40">—</span>
        );
      }

      case 'isValid': {
        const validationCount = product.validationErrors ? Object.keys(product.validationErrors as object).length : 0;
        if (product.isValid === false) {
          return (
            <div className="relative group">
              <span className="text-amber-400 cursor-help">⚠️ {validationCount}</span>
              <div className="absolute left-0 top-6 hidden group-hover:block z-20 w-80 p-3 bg-gray-900 border border-amber-500/30 rounded-lg shadow-xl text-xs">
                <div className="font-semibold text-amber-400 mb-2">
                  {validationCount} validation issue{validationCount !== 1 ? 's' : ''}
                </div>
                {product.validationErrors && (
                  <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                    {Object.entries(product.validationErrors as object).map(([field, errors]) => (
                      <li key={field} className="text-white/80">
                        <span className="text-white font-medium">{field}:</span>{' '}
                        {Array.isArray(errors) ? errors.join(', ') : String(errors)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        }
        return <span className="text-[#5df0c0]">✓</span>;
      }

      case 'updatedAt':
        return (
          <span className="text-sm text-white/60 whitespace-nowrap">
            {product.updatedAt
              ? new Date(product.updatedAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '—'}
          </span>
        );

      case 'enable_search':
        return product.feedEnableSearch ? (
          <span className="text-[#5df0c0]">Enabled</span>
        ) : (
          <span className="text-white/40">Disabled</span>
        );

      default: {
        // Default rendering for other columns
        const value = formatColumnValue(productData, column.id);
        return <span className="text-sm text-white/70">{truncate(value, 50)}</span>;
      }
    }
  };

  if (!hydrated) {
    return <main className="shell"><div className="subtle">Loading session...</div></main>;
  }
  if (!accessToken) return null;

  return (
    <main className="shell space-y-4">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

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
          <SearchFilter value={searchInput} onChange={setSearchInput} placeholder="Search products..." />
          <div className="flex-1" />
          <ClearFiltersButton hasActiveFilters={hasColumnFilters} onClear={clearAllColumnFilters} />
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
            hasActiveFilters={hasActiveFilters}
            onSelectAllMatching={handleSelectAllMatching}
            onClearSelection={selection.clearSelection}
            onBulkEdit={() => setShowBulkEditModal(true)}
            isProcessing={bulkProgress.isProcessing}
          />
        )}

        {/* Table with Horizontal Scroll */}
        {loading && <div className="subtle">Loading products...</div>}
        {!loading && !products.length && <div className="subtle">No products found.</div>}
        {!loading && products.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="table min-w-max">
              <thead>
                <tr>
                  {visibleColumnDefs.map((column) => {
                    // Checkbox column - sticky left
                    if (column.id === 'checkbox') {
                      return (
                        <th key={column.id} className="w-12 sticky left-0 z-10 bg-[#1a1d29]">
                          <input
                            type="checkbox"
                            checked={allOnPageSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = someOnPageSelected;
                            }}
                            onChange={handleToggleAll}
                            className="w-4 h-4 rounded border-white/20 bg-transparent text-[#5df0c0] focus:ring-[#5df0c0]/50"
                          />
                        </th>
                      );
                    }

                    // Actions column
                    if (column.id === 'actions') {
                      return (
                        <th key={column.id} className="w-20">
                          Actions
                        </th>
                      );
                    }

                    // Regular columns with filter dropdown
                    const columnFilter = getColumnFilter(column.id);
                    const currentSort =
                      filters.sortBy === column.id ? { column: column.id, order: filters.sortOrder } : null;

                    return (
                      <th key={column.id} className="min-w-[120px]">
                        <ColumnHeaderDropdown
                          columnId={column.id}
                          label={column.label}
                          sortable={column.sortable}
                          filterable={column.filterable}
                          currentSort={currentSort}
                          currentTextFilter={columnFilter.text}
                          currentValueFilter={columnFilter.values}
                          uniqueValues={columnValuesCache[column.id] || []}
                          loadingValues={loadingColumnValues[column.id] || false}
                          onLoadValues={() => loadColumnValues(column.id)}
                          onSort={(order) => setSort(column.id, order)}
                          onTextFilter={(text) => setColumnTextFilter(column.id, text)}
                          onValueFilter={(values) => setColumnValueFilter(column.id, values)}
                          onClearFilter={() => clearColumnFilter(column.id)}
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const isSelected = selection.selectAllMatching || selection.isSelected(p.id);

                  return (
                    <tr
                      key={p.id}
                      className={`cursor-pointer hover:bg-white/5 transition-colors ${isSelected ? 'bg-[#5df0c0]/5' : ''}`}
                    >
                      {visibleColumnDefs.map((column) => {
                        // Checkbox column - sticky left
                        if (column.id === 'checkbox') {
                          return (
                            <td key={column.id} className="sticky left-0 z-10 bg-[#1a1d29]" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => selection.toggleProduct(p.id)}
                                className="w-4 h-4 rounded border-white/20 bg-transparent text-[#5df0c0] focus:ring-[#5df0c0]/50"
                              />
                            </td>
                          );
                        }

                        // Actions column
                        if (column.id === 'actions') {
                          return (
                            <td key={column.id} onClick={(e) => e.stopPropagation()}>
                              {renderCellValue(column, p)}
                            </td>
                          );
                        }

                        // Regular columns - clickable to navigate
                        return (
                          <td key={column.id} onClick={() => handleRowClick(p.id)}>
                            {renderCellValue(column, p)}
                          </td>
                        );
                      })}
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
              Showing {(filters.page - 1) * filters.limit + 1}-{Math.min(filters.page * filters.limit, totalProducts)} of{' '}
              {totalProducts.toLocaleString()} products
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/60">Per page:</span>
                <select
                  value={filters.limit}
                  onChange={(e) => setFilters({ limit: Number(e.target.value), page: 1 })}
                  className="px-2 py-1 bg-[#1a1d29] text-white text-sm rounded border border-white/10 focus:outline-none focus:border-[#5df0c0]/50"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
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
        shopId={params?.id || ''}
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
