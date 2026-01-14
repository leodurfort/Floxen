'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo, useEffect, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ColumnFilter {
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
  sortBy: 'id',
  sortOrder: 'asc',
  page: 1,
  limit: 50,
  columnFilters: {},
};

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL STORAGE PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY_PREFIX = 'productsynch:catalog:filters:';

// Fields to persist (excluding page which should reset on return)
interface PersistedFilters {
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  limit: number;
  columnFilters: Record<string, ColumnFilter>;
}

function getStoredFilters(shopId: string): Partial<PersistedFilters> | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${shopId}`);
    if (stored) {
      return JSON.parse(stored) as PersistedFilters;
    }
  } catch {
    // Invalid JSON, ignore
  }
  return null;
}

function saveFilters(shopId: string, filters: CatalogFilters): void {
  if (typeof window === 'undefined') return;
  const toStore: PersistedFilters = {
    search: filters.search,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    limit: filters.limit,
    columnFilters: filters.columnFilters,
  };
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${shopId}`, JSON.stringify(toStore));
}

// ═══════════════════════════════════════════════════════════════════════════
// URL ENCODING HELPERS
// ═══════════════════════════════════════════════════════════════════════════

// Column filter URL format: cf_{columnId}_v = value filter (comma-separated)
const CF_PREFIX = 'cf_';
const CF_VALUES_SUFFIX = '_v';

function parseColumnFiltersFromParams(searchParams: URLSearchParams): Record<string, ColumnFilter> {
  const columnFilters: Record<string, ColumnFilter> = {};

  searchParams.forEach((value, key) => {
    if (!key.startsWith(CF_PREFIX)) return;

    const withoutPrefix = key.slice(CF_PREFIX.length);

    if (withoutPrefix.endsWith(CF_VALUES_SUFFIX)) {
      const columnId = withoutPrefix.slice(0, -CF_VALUES_SUFFIX.length);
      if (!columnFilters[columnId]) {
        columnFilters[columnId] = { values: [] };
      }
      // Decode each URL-encoded value to handle commas and special characters
      columnFilters[columnId].values = value
        .split(',')
        .filter(Boolean)
        .map(v => decodeURIComponent(v));
    }
  });

  return columnFilters;
}

function encodeColumnFiltersToParams(
  columnFilters: Record<string, ColumnFilter>,
  params: URLSearchParams
): void {
  for (const [columnId, filter] of Object.entries(columnFilters)) {
    if (filter.values.length > 0) {
      // URL-encode each value before joining to handle commas and special characters
      params.set(
        `${CF_PREFIX}${columnId}${CF_VALUES_SUFFIX}`,
        filter.values.map(v => encodeURIComponent(v)).join(',')
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useCatalogFilters(shopId?: string) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const hasRestoredFromStorage = useRef(false);

  // Check if URL has any filter params (user explicitly navigated with filters)
  const hasUrlParams = useMemo(() => {
    return searchParams.has('search') ||
           searchParams.has('sortBy') ||
           searchParams.has('sortOrder') ||
           searchParams.has('page') ||
           searchParams.has('limit') ||
           Array.from(searchParams.keys()).some(k => k.startsWith(CF_PREFIX));
  }, [searchParams]);

  // Parse filters from URL, falling back to localStorage ONLY on initial load
  const filters = useMemo<CatalogFilters>(() => {
    // If URL has explicit params, use them (URL takes precedence)
    if (hasUrlParams) {
      // Mark that we've initialized from URL
      hasRestoredFromStorage.current = true;
      return {
        search: searchParams.get('search') || '',
        sortBy: searchParams.get('sortBy') || 'id',
        sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
        page: parseInt(searchParams.get('page') || '1', 10),
        limit: parseInt(searchParams.get('limit') || '50', 10),
        columnFilters: parseColumnFiltersFromParams(searchParams),
      };
    }

    // Only restore from localStorage ONCE on initial page load
    // This prevents cleared filters from being restored from stale localStorage
    if (!hasRestoredFromStorage.current) {
      const stored = shopId ? getStoredFilters(shopId) : null;
      if (stored) {
        hasRestoredFromStorage.current = true;
        return {
          search: stored.search ?? '',
          sortBy: stored.sortBy ?? 'id',
          sortOrder: stored.sortOrder ?? 'asc',
          page: 1, // Always reset page when restoring
          limit: stored.limit ?? 50,
          columnFilters: stored.columnFilters ?? {},
        };
      }
    }

    // Default filters (either no stored data or already restored once)
    return { ...DEFAULT_FILTERS };
  }, [searchParams, hasUrlParams, shopId]);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (shopId) {
      saveFilters(shopId, filters);
    }
  }, [shopId, filters]);

  // Update URL with new filters
  // Read current filters directly from searchParams to avoid stale closure issues
  const setFilters = useCallback((updates: Partial<CatalogFilters>) => {
    // Parse current state directly from URL (not from memoized filters)
    const currentFilters: CatalogFilters = {
      search: searchParams.get('search') || '',
      sortBy: searchParams.get('sortBy') || 'id',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '50', 10),
      columnFilters: parseColumnFiltersFromParams(searchParams),
    };

    const newFilters = { ...currentFilters, ...updates };

    // Reset to page 1 when filters change (except page and limit changes)
    if (!('page' in updates) && !('limit' in updates)) {
      newFilters.page = 1;
    }

    const params = new URLSearchParams();

    // Only add non-default values to URL
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.sortBy !== 'id') params.set('sortBy', newFilters.sortBy);
    if (newFilters.sortOrder !== 'asc') params.set('sortOrder', newFilters.sortOrder);
    if (newFilters.page > 1) params.set('page', String(newFilters.page));
    if (newFilters.limit !== 50) params.set('limit', String(newFilters.limit));

    // Encode column filters
    encodeColumnFiltersToParams(newFilters.columnFilters, params);

    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [searchParams, router, pathname]);

  // Set sort directly
  const setSort = useCallback((column: string, order: 'asc' | 'desc' | null) => {
    if (order === null) {
      setFilters({ sortBy: 'id', sortOrder: 'asc' });
    } else {
      setFilters({ sortBy: column, sortOrder: order });
    }
  }, [setFilters]);

  // ═══════════════════════════════════════════════════════════════════════════
  // COLUMN FILTER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  // Set value filter for a column
  // Read current columnFilters directly from URL to avoid stale closure issues
  const setColumnValueFilter = useCallback((columnId: string, values: string[]) => {
    const currentColumnFilters = parseColumnFiltersFromParams(searchParams);

    if (values.length === 0) {
      delete currentColumnFilters[columnId];
    } else {
      currentColumnFilters[columnId] = { values };
    }

    setFilters({ columnFilters: currentColumnFilters });
  }, [searchParams, setFilters]);

  // Clear filter for a specific column
  // Read current columnFilters directly from URL to avoid stale closure issues
  const clearColumnFilter = useCallback((columnId: string) => {
    const currentColumnFilters = parseColumnFiltersFromParams(searchParams);
    const newColumnFilters = { ...currentColumnFilters };
    delete newColumnFilters[columnId];
    setFilters({ columnFilters: newColumnFilters });
  }, [searchParams, setFilters]);

  // Clear all column filters (keeps search)
  const clearAllColumnFilters = useCallback(() => {
    setFilters({ columnFilters: {} });
  }, [setFilters]);

  // Clear ALL filters (search + column filters) - matches hasActiveFilters
  const clearAllFilters = useCallback(() => {
    setFilters({ search: '', columnFilters: {} });
  }, [setFilters]);

  // Get filter for a specific column
  const getColumnFilter = useCallback((columnId: string): ColumnFilter => {
    return filters.columnFilters[columnId] || { values: [] };
  }, [filters.columnFilters]);

  // Check if a column has active filters
  const hasColumnFilter = useCallback((columnId: string): boolean => {
    const filter = filters.columnFilters[columnId];
    return filter ? filter.values.length > 0 : false;
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

  return {
    filters,
    setFilters,
    setSort,

    // Column filter methods
    setColumnValueFilter,
    clearColumnFilter,
    clearAllColumnFilters,
    clearAllFilters,
    getColumnFilter,
    hasColumnFilter,

    // Computed
    hasActiveFilters,
    hasColumnFilters,
  };
}
