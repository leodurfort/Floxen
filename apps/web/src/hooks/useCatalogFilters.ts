'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ColumnFilter {
  text: string;      // Text search within column
  values: string[];  // Selected checkbox values
}

export interface CatalogFilters {
  // Global search (searches title + SKU)
  search: string;

  // Sorting
  sortBy: string;
  sortOrder: 'asc' | 'desc';

  // Pagination
  page: number;
  limit: number;

  // Per-column filters
  columnFilters: Record<string, ColumnFilter>;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_FILTERS: CatalogFilters = {
  search: '',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  page: 1,
  limit: 50,
  columnFilters: {},
};

// ═══════════════════════════════════════════════════════════════════════════
// URL ENCODING HELPERS
// ═══════════════════════════════════════════════════════════════════════════

// Column filter URL format:
// cf_{columnId}_t = text filter
// cf_{columnId}_v = value filter (comma-separated)

const CF_PREFIX = 'cf_';
const CF_TEXT_SUFFIX = '_t';
const CF_VALUES_SUFFIX = '_v';

function parseColumnFiltersFromParams(searchParams: URLSearchParams): Record<string, ColumnFilter> {
  const columnFilters: Record<string, ColumnFilter> = {};

  searchParams.forEach((value, key) => {
    if (!key.startsWith(CF_PREFIX)) return;

    const withoutPrefix = key.slice(CF_PREFIX.length);

    if (withoutPrefix.endsWith(CF_TEXT_SUFFIX)) {
      const columnId = withoutPrefix.slice(0, -CF_TEXT_SUFFIX.length);
      if (!columnFilters[columnId]) {
        columnFilters[columnId] = { text: '', values: [] };
      }
      columnFilters[columnId].text = value;
    } else if (withoutPrefix.endsWith(CF_VALUES_SUFFIX)) {
      const columnId = withoutPrefix.slice(0, -CF_VALUES_SUFFIX.length);
      if (!columnFilters[columnId]) {
        columnFilters[columnId] = { text: '', values: [] };
      }
      columnFilters[columnId].values = value.split(',').filter(Boolean);
    }
  });

  return columnFilters;
}

function encodeColumnFiltersToParams(
  columnFilters: Record<string, ColumnFilter>,
  params: URLSearchParams
): void {
  for (const [columnId, filter] of Object.entries(columnFilters)) {
    if (filter.text) {
      params.set(`${CF_PREFIX}${columnId}${CF_TEXT_SUFFIX}`, filter.text);
    }
    if (filter.values.length > 0) {
      params.set(`${CF_PREFIX}${columnId}${CF_VALUES_SUFFIX}`, filter.values.join(','));
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useCatalogFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse filters from URL
  const filters = useMemo<CatalogFilters>(() => {
    return {
      search: searchParams.get('search') || '',
      sortBy: searchParams.get('sortBy') || 'updatedAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '50', 10),
      columnFilters: parseColumnFiltersFromParams(searchParams),
    };
  }, [searchParams]);

  // Update URL with new filters
  const setFilters = useCallback((updates: Partial<CatalogFilters>) => {
    const newFilters = { ...filters, ...updates };

    // Reset to page 1 when filters change (except page and limit changes)
    if (!('page' in updates) && !('limit' in updates)) {
      newFilters.page = 1;
    }

    const params = new URLSearchParams();

    // Only add non-default values to URL
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.sortBy !== 'updatedAt') params.set('sortBy', newFilters.sortBy);
    if (newFilters.sortOrder !== 'desc') params.set('sortOrder', newFilters.sortOrder);
    if (newFilters.page > 1) params.set('page', String(newFilters.page));
    if (newFilters.limit !== 50) params.set('limit', String(newFilters.limit));

    // Encode column filters
    encodeColumnFiltersToParams(newFilters.columnFilters, params);

    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [filters, router, pathname]);

  // Reset all filters to defaults
  const resetFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  // Toggle sort direction or change sort column
  const toggleSort = useCallback((column: string) => {
    if (filters.sortBy === column) {
      // Toggle direction: asc -> desc -> unsorted (reset to default)
      if (filters.sortOrder === 'asc') {
        setFilters({ sortOrder: 'desc' });
      } else {
        setFilters({ sortBy: 'updatedAt', sortOrder: 'desc' });
      }
    } else {
      // New column: start with ascending
      setFilters({ sortBy: column, sortOrder: 'asc' });
    }
  }, [filters.sortBy, filters.sortOrder, setFilters]);

  // Set sort directly
  const setSort = useCallback((column: string, order: 'asc' | 'desc' | null) => {
    if (order === null) {
      setFilters({ sortBy: 'updatedAt', sortOrder: 'desc' });
    } else {
      setFilters({ sortBy: column, sortOrder: order });
    }
  }, [setFilters]);

  // ═══════════════════════════════════════════════════════════════════════════
  // COLUMN FILTER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  // Set text filter for a column
  const setColumnTextFilter = useCallback((columnId: string, text: string) => {
    const newColumnFilters = { ...filters.columnFilters };

    if (!text) {
      // Remove text filter
      if (newColumnFilters[columnId]) {
        newColumnFilters[columnId] = { ...newColumnFilters[columnId], text: '' };
        // Clean up empty filters
        if (!newColumnFilters[columnId].text && newColumnFilters[columnId].values.length === 0) {
          delete newColumnFilters[columnId];
        }
      }
    } else {
      // Set text filter
      if (!newColumnFilters[columnId]) {
        newColumnFilters[columnId] = { text: '', values: [] };
      }
      newColumnFilters[columnId] = { ...newColumnFilters[columnId], text };
    }

    setFilters({ columnFilters: newColumnFilters });
  }, [filters.columnFilters, setFilters]);

  // Set value filter for a column
  const setColumnValueFilter = useCallback((columnId: string, values: string[]) => {
    const newColumnFilters = { ...filters.columnFilters };

    if (values.length === 0) {
      // Remove value filter
      if (newColumnFilters[columnId]) {
        newColumnFilters[columnId] = { ...newColumnFilters[columnId], values: [] };
        // Clean up empty filters
        if (!newColumnFilters[columnId].text && newColumnFilters[columnId].values.length === 0) {
          delete newColumnFilters[columnId];
        }
      }
    } else {
      // Set value filter
      if (!newColumnFilters[columnId]) {
        newColumnFilters[columnId] = { text: '', values: [] };
      }
      newColumnFilters[columnId] = { ...newColumnFilters[columnId], values };
    }

    setFilters({ columnFilters: newColumnFilters });
  }, [filters.columnFilters, setFilters]);

  // Clear filter for a specific column
  const clearColumnFilter = useCallback((columnId: string) => {
    const newColumnFilters = { ...filters.columnFilters };
    delete newColumnFilters[columnId];
    setFilters({ columnFilters: newColumnFilters });
  }, [filters.columnFilters, setFilters]);

  // Clear all column filters
  const clearAllColumnFilters = useCallback(() => {
    setFilters({ columnFilters: {} });
  }, [setFilters]);

  // Get filter for a specific column
  const getColumnFilter = useCallback((columnId: string): ColumnFilter => {
    return filters.columnFilters[columnId] || { text: '', values: [] };
  }, [filters.columnFilters]);

  // Check if a column has active filters
  const hasColumnFilter = useCallback((columnId: string): boolean => {
    const filter = filters.columnFilters[columnId];
    if (!filter) return false;
    return Boolean(filter.text) || filter.values.length > 0;
  }, [filters.columnFilters]);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════

  // Check if any filters are active (non-default)
  const hasActiveFilters = useMemo(() => {
    return filters.search !== '' ||
           Object.keys(filters.columnFilters).length > 0;
  }, [filters]);

  // Check if any column filters are active
  const hasColumnFilters = useMemo(() => {
    return Object.keys(filters.columnFilters).length > 0;
  }, [filters.columnFilters]);

  // Get column filters in API format for backend
  const getApiFilters = useCallback(() => {
    // Convert column filters to API format
    // The backend will need to handle these new filters
    return {
      search: filters.search || undefined,
      columnFilters: Object.keys(filters.columnFilters).length > 0
        ? filters.columnFilters
        : undefined,
    };
  }, [filters]);

  // Get legacy filters for backward compatibility
  // Maps column filters back to old format for existing API
  const getLegacyApiFilters = useCallback(() => {
    const legacy: Record<string, unknown> = {
      search: filters.search || undefined,
    };

    // Map specific columns to legacy filters
    const cf = filters.columnFilters;

    // syncStatus column -> syncStatus array
    if (cf.syncStatus?.values.length) {
      legacy.syncStatus = cf.syncStatus.values;
    }

    // isValid column -> isValid boolean
    if (cf.isValid?.values.length) {
      legacy.isValid = cf.isValid.values.includes('true');
    }

    // enable_search column -> feedEnableSearch boolean
    if (cf.enable_search?.values.length) {
      legacy.feedEnableSearch = cf.enable_search.values.includes('true');
    }

    // availability column -> wooStockStatus array (needs mapping)
    if (cf.availability?.values.length) {
      // Map OpenAI availability values to WooCommerce stock status
      const stockMap: Record<string, string> = {
        'in_stock': 'instock',
        'out_of_stock': 'outofstock',
        'preorder': 'onbackorder',
      };
      legacy.wooStockStatus = cf.availability.values
        .map(v => stockMap[v] || v)
        .filter(Boolean);
    }

    // overrides column -> hasOverrides boolean
    if (cf.overrides?.values.length) {
      legacy.hasOverrides = cf.overrides.values.includes('true') ||
                           !cf.overrides.values.includes('0');
    }

    return legacy;
  }, [filters]);

  return {
    filters,
    setFilters,
    resetFilters,
    toggleSort,
    setSort,

    // Column filter methods
    setColumnTextFilter,
    setColumnValueFilter,
    clearColumnFilter,
    clearAllColumnFilters,
    getColumnFilter,
    hasColumnFilter,

    // Computed
    hasActiveFilters,
    hasColumnFilters,
    getApiFilters,
    getLegacyApiFilters,
  };
}
