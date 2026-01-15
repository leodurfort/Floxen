'use client';

import { useEffect, useState, useCallback, Suspense, useRef, useMemo } from 'react';
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
import { FeedActivationSuccessModal } from '@/components/catalog/FeedActivationSuccessModal';
import { Tooltip } from '@/components/ui/Tooltip';
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
  const { user, hydrated } = useAuth();
  const { currentShop } = useCurrentShop();

  // UI state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showEditColumnsModal, setShowEditColumnsModal] = useState(false);
  const [showFeedPreviewModal, setShowFeedPreviewModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [activatedProductCount, setActivatedProductCount] = useState(0);
  const [itemGroupCount, setItemGroupCount] = useState<number | null>(null);
  const [selectedProductItemGroupId, setSelectedProductItemGroupId] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
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

  // Helper function to derive active tab from column filters
  // Tabs are now computed state - they reflect what filters are actually active
  const deriveTabFromFilters = useCallback((columnFilters: typeof filters.columnFilters): ProductTabId => {
    const filterKeys = Object.keys(columnFilters);

    // No filters = "All Products" tab
    if (filterKeys.length === 0) {
      return 'all';
    }

    // Check for "Ready for Feed" pattern: isValid=true AND enable_search=true
    if (
      filterKeys.length === 2 &&
      columnFilters.isValid?.values?.[0] === 'true' &&
      columnFilters.enable_search?.values?.[0] === 'true'
    ) {
      return 'inFeed';
    }

    // Check for "Needs Attention" pattern: isValid=false (only)
    if (
      filterKeys.length === 1 &&
      columnFilters.isValid?.values?.[0] === 'false'
    ) {
      return 'needsAttention';
    }

    // Check for "Disabled" pattern: enable_search=false (only)
    if (
      filterKeys.length === 1 &&
      columnFilters.enable_search?.values?.[0] === 'false'
    ) {
      return 'disabled';
    }

    // Custom filters that don't match any tab preset - default to "All"
    return 'all';
  }, []);

  // Active tab for product filtering (computed from column filters)
  // This ensures the UI always reflects the actual filters being applied
  const activeTab = useMemo<ProductTabId>(
    () => deriveTabFromFilters(filters.columnFilters),
    [filters.columnFilters, deriveTabFromFilters]
  );

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

  const handleTabChange = (tab: ProductTabId) => {
    switch (tab) {
      case 'all':
        setSearchInput('');
        clearAllFilters();
        break;
      case 'inFeed':
        setFilters({
          page: 1,
          columnFilters: {
            isValid: { values: ['true'] },
            enable_search: { values: ['true'] },
          },
        });
        break;
      case 'needsAttention':
        setFilters({
          page: 1,
          columnFilters: {
            isValid: { values: ['false'] },
          },
        });
        break;
      case 'disabled':
        setFilters({
          page: 1,
          columnFilters: {
            enable_search: { values: ['false'] },
          },
        });
        break;
    }
  };

  const handleActivateFeed = () => {
    if (!params?.id) return;

    activateFeedMutation.mutate(params.id, {
      onSuccess: (result) => {
        // Show success modal instead of toast
        setActivatedProductCount(result.validProductCount);
        setShowSuccessModal(true);
      },
      onError: (err) => {
        const error = err as Error & { code?: string; details?: string | string[] };
        let message = error.message || 'Failed to activate feed';

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

  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    clearAllFilters();
  }, [clearAllFilters]);

  const handleOpenBulkEdit = useCallback(() => {
    setBulkEditFilters({
      search: filters.search,
      columnFilters: filters.columnFilters,
    });
    setShowBulkEditModal(true);
  }, [filters.search, filters.columnFilters]);

  const handleBulkUpdate = useCallback(
    async (update: BulkUpdateOperation): Promise<void> => {
      const filtersToUse = bulkEditFilters ?? { search: filters.search, columnFilters: filters.columnFilters };
      const apiFilters = {
        search: filtersToUse.search || undefined,
        columnFilters: Object.keys(filtersToUse.columnFilters).length > 0
          ? filtersToUse.columnFilters
          : undefined,
      };

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
              resolve();
            },
            onError: (err) => {
              setToast({
                message: err.message || 'Bulk update failed',
                type: 'error',
              });
              resolve();
            },
          }
        );
      });
    },
    [selection, filters.search, filters.columnFilters, bulkEditFilters, bulkUpdateMutation]
  );

  const handleSaveColumns = (columns: string[]) => {
    setVisibleColumns(columns);
    if (params?.id) {
      saveStoredColumns(params.id, columns);
    }
  };

  // Ensure checkbox column is first, actions column is last
  const visibleColumnDefs = useMemo(() => {
    const cols = visibleColumns
      .map((id) => COLUMN_MAP.get(id))
      .filter((col): col is ColumnDefinition => col !== undefined);

    const checkboxCol = cols.find(c => c.id === 'checkbox');
    const actionsCol = cols.find(c => c.id === 'actions');
    const otherCols = cols.filter(c => c.id !== 'checkbox' && c.id !== 'actions');

    const result: ColumnDefinition[] = [];
    if (checkboxCol) result.push(checkboxCol);
    result.push(...otherCols);
    if (actionsCol) result.push(actionsCol);
    return result;
  }, [visibleColumns]);

  // Selection state calculations
  const pageIds = products.map((p) => p.id);
  const selectedOnPage = pageIds.filter((id) => selection.isSelected(id)).length;
  const isGlobalMode = selection.selectAllMatching || selection.selectAllGlobal || selection.selectAllByItemGroupId !== null;
  const allOnPageSelected = isGlobalMode || (pageIds.length > 0 && selectedOnPage === pageIds.length);
  const someOnPageSelected = !isGlobalMode && selectedOnPage > 0 && selectedOnPage < pageIds.length;
  const hasSelection = selection.getSelectedCount() > 0 || isGlobalMode;
  const totalCatalogCount = stats?.total ?? 0;
  const totalPages = Math.ceil(totalProducts / filters.limit) || 1;

  const displayedSelectionCount = selection.selectAllGlobal
    ? totalCatalogCount
    : selection.selectAllMatching
    ? totalProducts
    : selection.selectAllByItemGroupId && selection.selectAllByItemGroupCount
    ? selection.selectAllByItemGroupCount
    : selection.getSelectedCount();

  const renderCellValue = (column: ColumnDefinition, product: CatalogProduct) => {
    const productData = product as unknown as ProductData;

    switch (column.id) {
      case 'checkbox':
        return null;

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

      case 'feedStatus': {
        // Disabled by user takes priority
        if (!product.feedEnableSearch) {
          return <span className="text-gray-400">⊘ Excluded</span>;
        }
        // Valid and enabled = In Feed
        if (product.isValid) {
          return <span className="text-green-600">✓ In Feed</span>;
        }
        // Invalid but enabled = show issues with tooltip
        const validationCount = product.validationErrors
          ? Object.keys(product.validationErrors as object).length
          : 0;
        return (
          <div className="relative group">
            <span className="text-amber-600 cursor-help">⚠️ {validationCount} issues</span>
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
        // Default rendering for other columns with truncation and tooltip
        const value = formatColumnValue(productData, column.id);
        const truncatedValue = truncate(value, 40);
        const isTruncated = value && value.length > 40;

        return (
          <Tooltip content={isTruncated ? value : null} side="top" delayDuration={300}>
            <span className="text-sm text-gray-600 block truncate max-w-full">{truncatedValue}</span>
          </Tooltip>
        );
      }
    }
  };

  const getColumnWidth = (columnId: string): string => {
    const widths: Record<string, string> = {
      checkbox: 'w-12',
      actions: 'w-16',
      id: 'w-20',
      image_link: 'w-20',
      title: 'min-w-[200px]',
      description: 'min-w-[280px]',
      link: 'min-w-[180px]',
      enable_search: 'w-28',
      overrides: 'w-24',
      feedStatus: 'w-24',
      updatedAt: 'w-32',
      gtin: 'w-28',
    };
    return widths[columnId] ?? 'min-w-[100px]';
  };

  if (!hydrated) {
    return <main className="p-4"><div className="text-gray-500">Loading session...</div></main>;
  }
  if (!user) return null;

  return (
    <main className="p-4 space-y-4 flex flex-col h-[calc(100vh-52px)]">
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

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Fixed Header Section (not scrollable) */}
        <div className="p-6 pb-4 space-y-4 flex-shrink-0 border-b border-gray-100">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="uppercase tracking-[0.18em] text-xs text-gray-500">Products</p>
              <h1 className="text-2xl font-bold text-gray-900">Catalog</h1>
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
                  View Feed
                </button>
              )}
            </div>
          </div>

          {/* Product Tabs */}
          <ProductTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            stats={stats}
            isFeedActivated={currentShop?.openaiEnabled}
          />

          {/* Filters Bar */}
          <div className="flex items-center gap-4 flex-wrap">
            <SearchFilter value={searchInput} onChange={setSearchInput} placeholder="Search products..." />
            <div className="flex-1" />
            <ClearFiltersButton hasActiveFilters={hasActiveFilters} onClear={handleClearFilters} />
            <button
              onClick={() => setShowEditColumnsModal(true)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit Columns
            </button>
            {/* Persistent Bulk Edit button - disabled state when no selection */}
            {!hasSelection && (
              <Tooltip content="Select products to bulk edit" side="bottom" delayDuration={200}>
                <button
                  disabled
                  className="px-3 py-1.5 text-sm text-gray-400 border border-gray-200 rounded-lg cursor-not-allowed flex items-center gap-2 bg-gray-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Bulk Edit
                </button>
              </Tooltip>
            )}
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
        <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-auto">
          {loading && <div className="text-gray-500 p-6">Loading products...</div>}
          {!loading && !products.length && <div className="text-gray-500 p-6">No products found.</div>}
          {!loading && products.length > 0 && (
              <table className="catalog-table w-full">
                <thead>
                <tr>
                  {visibleColumnDefs.map((column) => {
                    // Checkbox column - sticky both directions (top + left)
                    if (column.id === 'checkbox') {
                      return (
                        <th key={column.id} className={`sticky top-0 left-0 z-20 ${getColumnWidth('checkbox')} bg-gray-50 border-b border-gray-200 px-3 py-2`}>
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

                    // Actions column - sticky top only
                    if (column.id === 'actions') {
                      return (
                        <th key={column.id} className={`sticky top-0 z-10 ${getColumnWidth('actions')} bg-gray-50 border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider`}>
                          Actions
                        </th>
                      );
                    }

                    // Regular columns with filter dropdown - sticky top only
                    const columnFilter = getColumnFilter(column.id);
                    const currentSort =
                      filters.sortBy === column.id ? { column: column.id, order: filters.sortOrder } : null;

                    return (
                      <th key={column.id} className={`sticky top-0 z-10 ${getColumnWidth(column.id)} bg-gray-50 border-b border-gray-200 px-3 py-2`}>
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
                        // Checkbox column - sticky left only
                        if (column.id === 'checkbox') {
                          return (
                            <td key={column.id} className={`sticky left-0 z-[5] bg-white ${getColumnWidth('checkbox')} px-3 py-2 border-b border-gray-100 whitespace-nowrap`} onClick={(e) => e.stopPropagation()}>
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
                            <td key={column.id} className={`${getColumnWidth('actions')} px-3 py-2 border-b border-gray-100 whitespace-nowrap`} onClick={(e) => e.stopPropagation()}>
                              {renderCellValue(column, p)}
                            </td>
                          );
                        }

                        // Regular columns - clickable to navigate
                        return (
                          <td key={column.id} className={`${getColumnWidth(column.id)} px-3 py-2 border-b border-gray-100 whitespace-nowrap`} onClick={() => handleRowClick(p.id)}>
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
        </div>

        {/* Pagination - Fixed footer, always visible */}
        {totalProducts > 0 && (
          <div className="flex-shrink-0 border-t border-gray-100 px-6 py-3 bg-white flex items-center justify-between">
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

      <FeedActivationSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onGoToDashboard={() => router.push('/dashboard')}
        productCount={activatedProductCount}
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
