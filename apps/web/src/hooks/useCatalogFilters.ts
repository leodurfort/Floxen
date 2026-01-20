'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo, useEffect, useRef, useState } from 'react';

// Types

export interface ColumnFilter {
  values: string[];
}

export interface CatalogFilters {
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
  columnFilters: Record<string, ColumnFilter>;
}

// Defaults

const DEFAULT_FILTERS: CatalogFilters = {
  search: '',
  sortBy: 'id',
  sortOrder: 'asc',
  page: 1,
  limit: 50,
  columnFilters: {},
};

// Local Storage Persistence

const STORAGE_KEY_PREFIX = 'floxen:catalog:filters:';

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

// URL Encoding Helpers

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
      const separator = value.includes(CF_SEPARATOR) ? CF_SEPARATOR : ',';
      columnFilters[columnId].values = value.split(separator).filter(Boolean);
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
      params.set(`${CF_PREFIX}${columnId}${CF_VALUES_SUFFIX}`, filter.values.join(CF_SEPARATOR));
    }
  }
}

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

// Hook

export function useCatalogFilters(shopId?: string) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const hasRestoredFromStorage = useRef(false);

  // Track pending filters between router.push() and URL update (async operation)
  // Using state instead of ref so UI updates immediately on filter changes
  const [pendingFilters, setPendingFilters] = useState<CatalogFilters | null>(null);

  const searchParamsString = searchParams.toString();
  useEffect(() => {
    // Clear pending filters when URL catches up
    setPendingFilters(null);
  }, [searchParamsString]);

  const hasUrlParams = useMemo(() => {
    return searchParams.has('search') ||
           searchParams.has('sortBy') ||
           searchParams.has('sortOrder') ||
           searchParams.has('page') ||
           searchParams.has('limit') ||
           Array.from(searchParams.keys()).some(k => k.startsWith(CF_PREFIX));
  }, [searchParams]);

  const filters = useMemo<CatalogFilters>(() => {
    // Pending filters take priority - ensures UI updates immediately
    // even when URL hasn't changed yet (or won't change for same-URL navigation)
    if (pendingFilters) {
      return pendingFilters;
    }

    if (hasUrlParams) {
      hasRestoredFromStorage.current = true;
      return parseFiltersFromParams(searchParams);
    }

    if (!hasRestoredFromStorage.current) {
      const stored = shopId ? getStoredFilters(shopId) : null;
      if (stored) {
        hasRestoredFromStorage.current = true;
        return {
          search: stored.search ?? '',
          sortBy: stored.sortBy ?? 'id',
          sortOrder: stored.sortOrder ?? 'asc',
          page: 1,
          limit: stored.limit ?? 50,
          columnFilters: stored.columnFilters ?? {},
        };
      }
    }

    return { ...DEFAULT_FILTERS };
  }, [searchParams, hasUrlParams, shopId, pendingFilters]);

  useEffect(() => {
    if (shopId) {
      saveFilters(shopId, filters);
    }
  }, [shopId, filters]);

  // Get current filters - uses pending state if set, otherwise the computed filters
  const getCurrentFilters = useCallback((): CatalogFilters => {
    return pendingFilters ?? filters;
  }, [pendingFilters, filters]);

  const setFilters = useCallback((updates: Partial<CatalogFilters>) => {
    const currentFilters = getCurrentFilters();
    const newFilters = { ...currentFilters, ...updates };

    if (!('page' in updates) && !('limit' in updates)) {
      newFilters.page = 1;
    }

    // Set pending state immediately - this triggers UI update
    setPendingFilters(newFilters);

    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.sortBy !== 'id') params.set('sortBy', newFilters.sortBy);
    if (newFilters.sortOrder !== 'asc') params.set('sortOrder', newFilters.sortOrder);
    if (newFilters.page > 1) params.set('page', String(newFilters.page));
    if (newFilters.limit !== 50) params.set('limit', String(newFilters.limit));
    encodeColumnFiltersToParams(newFilters.columnFilters, params);

    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [getCurrentFilters, router, pathname]);

  const setSort = useCallback((column: string, order: 'asc' | 'desc' | null) => {
    setFilters(order === null ? { sortBy: 'id', sortOrder: 'asc' } : { sortBy: column, sortOrder: order });
  }, [setFilters]);

  // Column Filter Methods

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

  const clearColumnFilter = useCallback((columnId: string) => {
    const currentFilters = getCurrentFilters();
    const newColumnFilters = { ...currentFilters.columnFilters };
    delete newColumnFilters[columnId];
    setFilters({ columnFilters: newColumnFilters });
  }, [getCurrentFilters, setFilters]);

  const clearAllColumnFilters = useCallback(() => {
    setFilters({ columnFilters: {} });
  }, [setFilters]);

  const clearAllFilters = useCallback(() => {
    setFilters({ search: '', columnFilters: {} });
  }, [setFilters]);

  const getColumnFilter = useCallback((columnId: string): ColumnFilter => {
    return filters.columnFilters[columnId] || { values: [] };
  }, [filters.columnFilters]);

  const hasColumnFilter = useCallback((columnId: string): boolean => {
    const filter = filters.columnFilters[columnId];
    return filter ? filter.values.length > 0 : false;
  }, [filters.columnFilters]);

  // Computed Values

  const hasActiveFilters = useMemo(() => {
    return filters.search !== '' || Object.keys(filters.columnFilters).length > 0;
  }, [filters]);

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
