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

// Column filter URL format: cf_{columnId}_v = value filter (pipe-separated)
// Using pipe | as separator because URLSearchParams auto-encodes values,
// and comma is common in product data (dimensions, prices, etc.)
const CF_PREFIX = 'cf_';
const CF_VALUES_SUFFIX = '_v';
const CF_SEPARATOR = '|';

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
      // URLSearchParams auto-decodes values, just split by separator
      // Support both pipe (new) and comma (legacy) separators for backwards compatibility
      const separator = value.includes(CF_SEPARATOR) ? CF_SEPARATOR : ',';
      columnFilters[columnId].values = value
        .split(separator)
        .filter(Boolean);
    }
  });

  return columnFilters;
}

function encodeColumnFiltersToParams(
  columnFilters: Record<string, ColumnFilter>,
  params: URLSearchParams
): void {
  console.log('[useCatalogFilters] encodeColumnFiltersToParams input:', JSON.stringify(columnFilters, null, 2));
  for (const [columnId, filter] of Object.entries(columnFilters)) {
    if (filter.values.length > 0) {
      // URLSearchParams.set() auto-encodes values, just join with separator
      // Using pipe separator to avoid conflicts with commas in values
      const joinedValues = filter.values.join(CF_SEPARATOR);
      console.log(`[useCatalogFilters] Setting cf_${columnId}_v = "${joinedValues}"`);
      params.set(
        `${CF_PREFIX}${columnId}${CF_VALUES_SUFFIX}`,
        joinedValues
      );
    }
  }
}

// Helper to parse full filters from URL params
function parseFiltersFromParams(searchParams: URLSearchParams): CatalogFilters {
  return {
    search: searchParams.get('search') || '',
    sortBy: searchParams.get('sortBy') || 'id',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: parseInt(searchParams.get('limit') || '50', 10),
    columnFilters: parseColumnFiltersFromParams(searchParams),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useCatalogFilters(shopId?: string) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const hasRestoredFromStorage = useRef(false);

  // CRITICAL: Track pending filters between router.push() and URL update
  // router.push() is asynchronous - searchParams doesn't update immediately
  // Without this, rapid successive filter operations will read stale state
  const pendingFiltersRef = useRef<CatalogFilters | null>(null);

  // Clear pending state when URL actually updates (searchParams changes)
  const searchParamsString = searchParams.toString();
  useEffect(() => {
    pendingFiltersRef.current = null;
  }, [searchParamsString]);

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
      return parseFiltersFromParams(searchParams);
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

  // Get current filters - uses pending state if available (handles async router.push)
  // This is the key to making cascading filters work correctly
  const getCurrentFilters = useCallback((): CatalogFilters => {
    // If we have pending filters from a recent router.push(), use those
    // This handles the case where URL hasn't updated yet
    if (pendingFiltersRef.current) {
      return pendingFiltersRef.current;
    }
    // Otherwise parse from current URL
    return parseFiltersFromParams(searchParams);
  }, [searchParams]);

  // Update URL with new filters
  const setFilters = useCallback((updates: Partial<CatalogFilters>) => {
    // Get current state (from pending ref if available, otherwise from URL)
    const currentFilters = getCurrentFilters();
    const newFilters = { ...currentFilters, ...updates };
    console.log('[useCatalogFilters] setFilters called with updates:', JSON.stringify(updates, null, 2));
    console.log('[useCatalogFilters] newFilters.columnFilters:', JSON.stringify(newFilters.columnFilters, null, 2));

    // Reset to page 1 when filters change (except page and limit changes)
    if (!('page' in updates) && !('limit' in updates)) {
      newFilters.page = 1;
    }

    // Store as pending BEFORE router.push() - critical for cascading filters
    pendingFiltersRef.current = newFilters;

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
    console.log('[useCatalogFilters] Final URL query string:', queryString);
    router.push(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [getCurrentFilters, router, pathname]);

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
  const setColumnValueFilter = useCallback((columnId: string, values: string[]) => {
    const currentFilters = getCurrentFilters();
    const currentColumnFilters = { ...currentFilters.columnFilters };

    if (values.length === 0) {
      delete currentColumnFilters[columnId];
    } else {
      currentColumnFilters[columnId] = { values };
    }

    setFilters({ columnFilters: currentColumnFilters });
  }, [getCurrentFilters, setFilters]);

  // Clear filter for a specific column
  const clearColumnFilter = useCallback((columnId: string) => {
    const currentFilters = getCurrentFilters();
    const newColumnFilters = { ...currentFilters.columnFilters };
    delete newColumnFilters[columnId];
    setFilters({ columnFilters: newColumnFilters });
  }, [getCurrentFilters, setFilters]);

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
