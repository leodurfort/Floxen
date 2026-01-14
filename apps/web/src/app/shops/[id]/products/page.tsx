'use client';

import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BulkUpdateOperation, CurrentFiltersForColumnValues, getItemGroupCount } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useCatalogSelection } from '@/store/catalogSelection';
import { useCatalogFilters } from '@/hooks/useCatalogFilters';
import { useProductsQuery, useBulkUpdateMutation, useRefreshFeedMutation } from '@/hooks/useProductsQuery';
import { useCurrentShop } from '@/hooks/useCurrentShop';
import { useProductStats } from '@/hooks/useProductStats';
import { useActivateFeedMutation } from '@/hooks/useShopsQuery';
import { CatalogProduct, deriveFeedState, type FeedState } from '@productsynch/shared';
import { SearchFilter } from '@/components/catalog/FilterDropdown';
import { BulkActionToolbar } from '@/components/catalog/BulkActionToolbar';
import { BulkEditModal } from '@/components/catalog/BulkEditModal';
import { EditColumnsModal, getStoredColumns, saveStoredColumns } from '@/components/catalog/EditColumnsModal';
import { Toast } from '@/components/catalog/Toast';
import { ColumnHeaderDropdown } from '@/components/catalog/ColumnHeaderDropdown';
import { ClearFiltersButton } from '@/components/catalog/ClearFiltersButton';
import { ShopProfileBanner } from '@/components/shops/ShopProfileBanner';
import { SyncStatusBanner } from '@/components/shops/SyncStatusBanner';
import { ProductTabs, type ProductTabId } from '@/components/catalog/ProductTabs';
import { FeedPreviewModal } from '@/components/catalog/FeedPreviewModal';
import {
  COLUMN_MAP,
  formatColumnValue,
  getColumnValue,
  type ColumnDefinition,
  type ProductData,
} from '@/lib/columnDefinitions';

// Feed state display configuration
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
  // Note: hydrate() is called by AppLayout, no need to call it here
  const { user, hydrated } = useAuth();

  // Get current shop for banner
  const { currentShop } = useCurrentShop();

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modal states
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showEditColumnsModal, setShowEditColumnsModal] = useState(false);
  const [showFeedPreviewModal, setShowFeedPreviewModal] = useState(false);

  // Item group count state for "Select similar products" feature
  const [itemGroupCount, setItemGroupCount] = useState<number | null>(null);
  const [selectedProductItemGroupId, setSelectedProductItemGroupId] = useState<string | null>(null);

  // Active tab for product filtering
  const [activeTab, setActiveTab] = useState<ProductTabId>('all');

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  // Local search input state for debouncing
  const [searchInput, setSearchInput] = useState('');
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll tracking for sticky header shadow
  const [isScrolled, setIsScrolled] = useState(false);
  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Use hooks
  const {
    filters,
    setFilters,
    setSort,
    hasActiveFilters,
    getColumnFilter,
    setColumnValueFilter,
    clearColumnFilter,
    clearAllFilters,
  } = useCatalogFilters(params?.id);
  const selection = useCatalogSelection();

  // Capture filters at modal open time to prevent stale filter issues
  const [bulkEditFilters, setBulkEditFilters] = useState<{ search: string; columnFilters: typeof filters.columnFilters } | null>(null);

  // React Query hooks - these fix the original cache bug!
  // Products query with proper cache keying by shopId + filters
  const {
    data: productsData,
    isLoading: loading,
    error: productsError,
  } = useProductsQuery(params?.id, {
    page: filters.page,
    limit: filters.limit,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    search: filters.search || undefined,
    columnFilters: Object.keys(filters.columnFilters).length > 0
      ? filters.columnFilters
      : undefined,
  });

  const products = productsData?.products ?? [];
  const totalProducts = productsData?.pagination.total ?? 0;
  const error = productsError?.message ?? null;

  // Feed refresh mutation
  const refreshFeedMutation = useRefreshFeedMutation(params?.id);

  // Bulk update mutation
  const bulkUpdateMutation = useBulkUpdateMutation(params?.id);

  // Product stats and activation hooks
  const { data: stats } = useProductStats(params?.id);
  const activateFeedMutation = useActivateFeedMutation();

  // Derive feed state from current shop
  const feedState = currentShop ? deriveFeedState(currentShop) : 'not_activated';
  const feedStateConfig = FEED_STATE_CONFIG[feedState];

  useEffect(() => {
    if (hydrated && !user) {
      router.push('/login');
    }
  }, [hydrated, user, router]);

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

  // Clear selection when filters change (prevents invisible selections from previous filter state)
  const prevFiltersRef = useRef({ search: filters.search, columnFilters: filters.columnFilters });
  useEffect(() => {
    const prevFilters = prevFiltersRef.current;
    const filtersChanged =
      prevFilters.search !== filters.search ||
      JSON.stringify(prevFilters.columnFilters) !== JSON.stringify(filters.columnFilters);

    if (filtersChanged) {
      selection.clearSelection();
      prevFiltersRef.current = { search: filters.search, columnFilters: filters.columnFilters };
    }
  }, [filters.search, filters.columnFilters, selection]);

  // Scroll detection for sticky header shadow
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsScrolled(container.scrollTop > 0);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch item group count when exactly 1 product is selected
  useEffect(() => {
    const selectedIds = selection.getSelectedIds();

    // Only fetch when exactly 1 product is selected and not in any "select all" mode
    if (selectedIds.length !== 1 || selection.selectAllMatching || selection.selectAllGlobal || selection.selectAllByItemGroupId) {
      setItemGroupCount(null);
      setSelectedProductItemGroupId(null);
      return;
    }

    // Find the selected product in the current page
    const selectedProduct = products.find(p => p.id === selectedIds[0]);
    if (!selectedProduct) {
      setItemGroupCount(null);
      setSelectedProductItemGroupId(null);
      return;
    }

    // Get item_group_id from the product
    const productData = selectedProduct as unknown as ProductData;
    const itemGroupId = getColumnValue(productData, 'item_group_id') as string | null;

    if (!itemGroupId || !params?.id) {
      setItemGroupCount(null);
      setSelectedProductItemGroupId(null);
      return;
    }

    // Fetch the count of products with the same item_group_id
    setSelectedProductItemGroupId(itemGroupId);
    getItemGroupCount(params.id, itemGroupId)
      .then(result => {
        setItemGroupCount(result.count);
      })
      .catch(() => {
        setItemGroupCount(null);
      });
  }, [selection.getSelectedIds().join(','), selection.selectAllMatching, selection.selectAllGlobal, selection.selectAllByItemGroupId, products, params?.id]);

  // Build current filters for cascading filter support (passed to ColumnHeaderDropdown)
  const currentFiltersForColumnValues: CurrentFiltersForColumnValues | undefined =
    filters.search || Object.keys(filters.columnFilters).length > 0
      ? {
          globalSearch: filters.search || undefined,
          columnFilters: Object.keys(filters.columnFilters).length > 0 ? filters.columnFilters : undefined,
        }
      : undefined;

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

  // Handle tab change - applies predefined column filters
  const handleTabChange = (tab: ProductTabId) => {
    setActiveTab(tab);

    // Apply filters based on tab
    switch (tab) {
      case 'all':
        // Clear filters for "All" tab
        clearAllFilters();
        break;
      case 'inFeed':
        // Valid AND enabled products
        setFilters({
          page: 1,
          columnFilters: {
            isValid: { values: ['valid'] },
            enable_search: { values: ['Enabled'] },
          },
        });
        break;
      case 'needsAttention':
        // Invalid products
        setFilters({
          page: 1,
          columnFilters: {
            isValid: { values: ['invalid'] },
          },
        });
        break;
      case 'disabled':
        // Disabled products
        setFilters({
          page: 1,
          columnFilters: {
            enable_search: { values: ['Disabled'] },
          },
        });
        break;
    }
  };

  // Handle activate feed
  const handleActivateFeed = () => {
    if (!params?.id) return;

    activateFeedMutation.mutate(params.id, {
      onSuccess: (result) => {
        setToast({
          message: `Feed activated! ${result.validProductCount} products will be synced.`,
          type: 'success',
        });
      },
      onError: (err) => {
        const error = err as Error & { code?: string; details?: string | string[] };
        let message = error.message || 'Failed to activate feed';

        // Add details if available
        if (error.details) {
          if (Array.isArray(error.details)) {
            message = error.details.join('\n');
          } else {
            message = error.details;
          }
        }

        setToast({ message, type: 'error' });
      },
    });
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

  const handleSelectAllGlobal = () => {
    selection.setSelectAllGlobal(true);
  };

  const handleSelectAllByItemGroup = () => {
    if (selectedProductItemGroupId && itemGroupCount) {
      selection.setSelectAllByItemGroupId(selectedProductItemGroupId, itemGroupCount);
    }
  };

  // Open bulk edit modal and capture current filters
  const handleOpenBulkEdit = useCallback(() => {
    setBulkEditFilters({
      search: filters.search,
      columnFilters: filters.columnFilters,
    });
    setShowBulkEditModal(true);
  }, [filters.search, filters.columnFilters]);

  // Bulk action handlers using mutation
  // Uses captured bulkEditFilters to prevent stale filter issues
  const handleBulkUpdate = useCallback(
    async (update: BulkUpdateOperation): Promise<void> => {
      // Use captured filters from when modal was opened
      const filtersToUse = bulkEditFilters ?? { search: filters.search, columnFilters: filters.columnFilters };
      const apiFilters = {
        search: filtersToUse.search || undefined,
        columnFilters: Object.keys(filtersToUse.columnFilters).length > 0
          ? filtersToUse.columnFilters
          : undefined,
      };

      // Determine selection mode:
      // - 'all' for global select (no filters, all products)
      // - 'filtered' for select all matching (with filters)
      // - 'itemGroup' for select all by item group
      // - 'selected' for individual product selection
      const selectionMode = selection.selectAllGlobal
        ? 'all'
        : selection.selectAllMatching
        ? 'filtered'
        : selection.selectAllByItemGroupId
        ? 'itemGroup'
        : 'selected';

      return new Promise((resolve) => {
        bulkUpdateMutation.mutate(
          {
            selectionMode,
            productIds: selectionMode === 'selected' ? selection.getSelectedIds() : undefined,
            filters: selectionMode === 'filtered' ? apiFilters : undefined,
            itemGroupId: selectionMode === 'itemGroup' ? selection.selectAllByItemGroupId! : undefined,
            update,
          },
          {
            onSuccess: (result) => {
              selection.clearSelection();
              setShowBulkEditModal(false);
              setBulkEditFilters(null);
              setToast({
                message: `Updated ${result.processedProducts} products${result.failedProducts > 0 ? ` (${result.failedProducts} failed)` : ''}`,
                type: result.failedProducts > 0 ? 'error' : 'success',
              });
              // React Query automatically invalidates the products cache
              resolve();
            },
            onError: (err) => {
              setToast({
                message: err.message || 'Bulk update failed',
                type: 'error',
              });
              resolve(); // Resolve even on error to close the modal
            },
          }
        );
      });
    },
    [selection, filters.search, filters.columnFilters, bulkEditFilters, bulkUpdateMutation]
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
  const isGlobalMode = selection.selectAllMatching || selection.selectAllGlobal || selection.selectAllByItemGroupId !== null;
  const allOnPageSelected = isGlobalMode || (pageIds.length > 0 && selectedOnPage === pageIds.length);
  const someOnPageSelected = !isGlobalMode && selectedOnPage > 0 && selectedOnPage < pageIds.length;
  const hasSelection = selection.getSelectedCount() > 0 || isGlobalMode;

  // Total catalog count from stats (for global select all)
  const totalCatalogCount = stats?.total ?? 0;

  // Display count depends on selection mode
  const displayedSelectionCount = selection.selectAllGlobal
    ? totalCatalogCount
    : selection.selectAllMatching
    ? totalProducts
    : selection.selectAllByItemGroupId && selection.selectAllByItemGroupCount
    ? selection.selectAllByItemGroupCount
    : selection.getSelectedCount();

  // Pagination
  const totalPages = Math.ceil(totalProducts / filters.limit) || 1;

  // Render cell value based on column definition
  const renderCellValue = (column: ColumnDefinition, product: CatalogProduct) => {
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
            className="text-[#FA7315] hover:text-[#E5650F] text-sm font-medium"
          >
            Edit
          </button>
        );

      case 'image_link': {
        const imageUrl = getColumnValue(productData, 'image_link') as string | null;
        const title = getColumnValue(productData, 'title') as string | null;
        if (imageUrl) {
          return <img src={imageUrl} alt={title || 'Product'} className="w-10 h-10 object-cover rounded" />;
        }
        return <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">—</div>;
      }

      case 'title':
        return <span className="text-sm text-gray-700">{truncate(formatColumnValue(productData, 'title'), 60)}</span>;

      case 'link': {
        const url = getColumnValue(productData, 'link') as string | null;
        if (url) {
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[#FA7315] hover:text-[#E5650F] truncate block text-sm"
              title={url}
            >
              {truncate(url, 30)}
            </a>
          );
        }
        return <span className="text-gray-400">—</span>;
      }

      case 'overrides': {
        const count = getColumnValue(productData, 'overrides') as number;
        return count > 0 ? (
          <span className="text-[#FA7315]">{count}</span>
        ) : (
          <span className="text-gray-400">—</span>
        );
      }

      case 'isValid': {
        const validationCount = product.validationErrors ? Object.keys(product.validationErrors as object).length : 0;
        if (product.isValid === false) {
          return (
            <div className="relative group">
              <span className="text-amber-600 cursor-help">⚠️ {validationCount}</span>
              <div className="absolute left-0 top-6 hidden group-hover:block z-20 w-80 p-3 bg-white border border-amber-200 rounded-lg shadow-xl text-xs">
                <div className="font-semibold text-amber-700 mb-2">
                  {validationCount} validation issue{validationCount !== 1 ? 's' : ''}
                </div>
                {product.validationErrors && (
                  <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                    {Object.entries(product.validationErrors as object).map(([field, errors]) => (
                      <li key={field} className="text-gray-700">
                        <span className="text-gray-900 font-medium">{field}:</span>{' '}
                        {Array.isArray(errors) ? errors.join(', ') : String(errors)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        }
        return <span className="text-green-600">✓</span>;
      }

      case 'updatedAt':
        return (
          <span className="text-sm text-gray-500 whitespace-nowrap">
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
          <span className="text-green-600">Enabled</span>
        ) : (
          <span className="text-gray-400">Disabled</span>
        );

      default: {
        // Default rendering for other columns
        const value = formatColumnValue(productData, column.id);
        return <span className="text-sm text-gray-600">{truncate(value, 50)}</span>;
      }
    }
  };

  if (!hydrated) {
    return <main className="p-4"><div className="text-gray-500">Loading session...</div></main>;
  }
  if (!user) return null;

  return (
    <main className="p-4 space-y-4">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Shop Profile Banner */}
      {currentShop && (
        <ShopProfileBanner shop={currentShop} currentPath="products" />
      )}

      {/* Sync Status Banner - during first sync */}
      {currentShop && (
        <SyncStatusBanner shop={currentShop} />
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
        {/* Sticky Header Section */}
        <div ref={stickyHeaderRef} className={`catalog-sticky-header p-6 pb-4 space-y-4 flex-shrink-0 ${isScrolled ? 'scrolled' : ''}`}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="uppercase tracking-[0.18em] text-xs text-gray-500">Products</p>
              <h1 className="text-2xl font-bold text-gray-900">Catalog</h1>
              {/* Stats line */}
              {stats && (
                <div className="flex items-center gap-4 mt-1 text-sm">
                  <span className="text-gray-600">
                    <span className="font-medium text-gray-900">{stats.inFeed}</span>
                    <span className="text-gray-400">/</span>
                    <span>{stats.total}</span>
                    {' '}products in ChatGPT feed
                  </span>
                  {stats.needsAttention > 0 && (
                    <span className="text-amber-600">
                      {stats.needsAttention} need{stats.needsAttention === 1 ? 's' : ''} attention
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Feed status badge */}
              <span className={`flex items-center gap-1.5 text-sm font-medium ${feedStateConfig.colorClass}`}>
                <span className={`w-2 h-2 rounded-full ${feedStateConfig.dotClass}`} />
                {feedStateConfig.label}
              </span>

              {/* Conditional buttons based on feed state */}
              {feedState === 'not_activated' ? (
                <button
                  onClick={handleActivateFeed}
                  disabled={activateFeedMutation.isPending}
                  className="px-4 py-2 bg-[#FA7315] text-white font-medium rounded-lg hover:bg-[#E5650F] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  {activateFeedMutation.isPending ? 'Activating...' : 'Activate Feed'}
                </button>
              ) : (
                <button
                  onClick={() => setShowFeedPreviewModal(true)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all text-sm"
                >
                  Preview Feed
                </button>
              )}
            </div>
          </div>

          {/* Product Tabs */}
          <ProductTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            stats={stats}
          />

          {/* Filters Bar */}
          <div className="flex items-center gap-4 flex-wrap">
            <SearchFilter value={searchInput} onChange={setSearchInput} placeholder="Search products..." />
            <div className="flex-1" />
            <ClearFiltersButton hasActiveFilters={hasActiveFilters} onClear={clearAllFilters} />
            <button
              onClick={() => setShowEditColumnsModal(true)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit Columns
            </button>
          </div>

          {error && <div className="text-sm text-red-700 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">{error}</div>}

          {/* Bulk Action Toolbar */}
          {hasSelection && (
            <BulkActionToolbar
              selectedCount={selection.getSelectedCount()}
              totalMatchingCount={totalProducts}
              totalCatalogCount={totalCatalogCount}
              selectAllMatching={selection.selectAllMatching}
              selectAllGlobal={selection.selectAllGlobal}
              selectAllByItemGroupId={selection.selectAllByItemGroupId}
              selectAllByItemGroupCount={selection.selectAllByItemGroupCount}
              hasActiveFilters={hasActiveFilters}
              onSelectAllMatching={handleSelectAllMatching}
              onSelectAllGlobal={handleSelectAllGlobal}
              onSelectAllByItemGroup={handleSelectAllByItemGroup}
              onClearSelection={selection.clearSelection}
              onBulkEdit={handleOpenBulkEdit}
              isProcessing={bulkUpdateMutation.isPending}
              selectedProductItemGroupId={selectedProductItemGroupId}
              itemGroupCount={itemGroupCount}
            />
          )}
        </div>

        {/* Scrollable Table Section */}
        <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-auto px-6 pb-6">
          {loading && <div className="text-gray-500">Loading products...</div>}
          {!loading && !products.length && <div className="text-gray-500">No products found.</div>}
          {!loading && products.length > 0 && (
              <table className={`table catalog-table min-w-max border border-gray-200 ${isScrolled ? 'scrolled' : ''}`}>
                <thead>
                <tr>
                  {visibleColumnDefs.map((column) => {
                    // Checkbox column - sticky left
                    if (column.id === 'checkbox') {
                      return (
                        <th key={column.id} className="w-12 bg-gray-50">
                          <input
                            type="checkbox"
                            checked={allOnPageSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = someOnPageSelected;
                            }}
                            onChange={handleToggleAll}
                            className="w-4 h-4 rounded border-gray-300 bg-white text-[#FA7315] focus:ring-[#FA7315]/50"
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
                          currentValueFilter={columnFilter.values}
                          shopId={params?.id}
                          currentFilters={currentFiltersForColumnValues}
                          onSort={(order) => setSort(column.id, order)}
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
                  // Check if product is selected (including item group selection mode)
                  const productItemGroupId = getColumnValue(p as unknown as ProductData, 'item_group_id') as string | null;
                  const isSelectedByItemGroup = selection.selectAllByItemGroupId !== null && productItemGroupId === selection.selectAllByItemGroupId;
                  const isSelected = selection.selectAllMatching || selection.selectAllGlobal || isSelectedByItemGroup || selection.isSelected(p.id);

                  return (
                    <tr
                      key={p.id}
                      className={`cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? 'bg-[#FA7315]/5' : ''}`}
                    >
                      {visibleColumnDefs.map((column) => {
                        // Checkbox column - sticky left
                        if (column.id === 'checkbox') {
                          return (
                            <td key={column.id} className="bg-white" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => selection.toggleProduct(p.id)}
                                className="w-4 h-4 rounded border-gray-300 bg-white text-[#FA7315] focus:ring-[#FA7315]/50"
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
          )}

          {/* Pagination */}
          {totalProducts > 0 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-gray-600">
                Showing {(filters.page - 1) * filters.limit + 1}-{Math.min(filters.page * filters.limit, totalProducts)} of{' '}
                {totalProducts.toLocaleString()} products
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Per page:</span>
                  <select
                    value={filters.limit}
                    onChange={(e) => setFilters({ limit: Number(e.target.value), page: 1 })}
                    className="px-2 py-1 bg-white text-gray-900 text-sm rounded border border-gray-300 focus:outline-none focus:border-[#FA7315]"
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
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Prev
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    {filters.page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setFilters({ page: filters.page + 1 })}
                    disabled={filters.page >= totalPages}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <BulkEditModal
        isOpen={showBulkEditModal}
        onClose={() => {
          setShowBulkEditModal(false);
          setBulkEditFilters(null);
        }}
        onSubmit={handleBulkUpdate}
        selectedCount={displayedSelectionCount}
        isProcessing={bulkUpdateMutation.isPending}
        shopId={params?.id || ''}
      />

      <EditColumnsModal
        isOpen={showEditColumnsModal}
        onClose={() => setShowEditColumnsModal(false)}
        shopId={params?.id || ''}
        visibleColumns={visibleColumns}
        onSave={handleSaveColumns}
      />

      <FeedPreviewModal
        isOpen={showFeedPreviewModal}
        onClose={() => setShowFeedPreviewModal(false)}
        shopId={params?.id || ''}
      />
    </main>
  );
}

export default function ShopProductsPage() {
  return (
    <Suspense fallback={<main className="p-4"><div className="text-gray-500">Loading...</div></main>}>
      <CatalogPageContent />
    </Suspense>
  );
}
