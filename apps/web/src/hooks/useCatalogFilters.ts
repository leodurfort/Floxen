'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export interface CatalogFilters {
  search: string;
  sortBy: 'wooProductId' | 'wooTitle' | 'wooPrice' | 'wooStockQuantity' | 'syncStatus' | 'isValid' | 'feedEnableSearch' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
  syncStatus: string[];
  isValid: boolean | undefined;
  feedEnableSearch: boolean | undefined;
  wooStockStatus: string[];
  hasOverrides: boolean | undefined;
  page: number;
  limit: number;
}

const DEFAULT_FILTERS: CatalogFilters = {
  search: '',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  syncStatus: [],
  isValid: undefined,
  feedEnableSearch: undefined,
  wooStockStatus: [],
  hasOverrides: undefined,
  page: 1,
  limit: 50,
};

export function useCatalogFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse filters from URL
  const filters = useMemo<CatalogFilters>(() => {
    const syncStatusParam = searchParams.getAll('syncStatus');
    const wooStockStatusParam = searchParams.getAll('wooStockStatus');

    return {
      search: searchParams.get('search') || '',
      sortBy: (searchParams.get('sortBy') as CatalogFilters['sortBy']) || 'updatedAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      syncStatus: syncStatusParam,
      isValid: searchParams.get('isValid') === 'true' ? true :
               searchParams.get('isValid') === 'false' ? false : undefined,
      feedEnableSearch: searchParams.get('feedEnableSearch') === 'true' ? true :
                        searchParams.get('feedEnableSearch') === 'false' ? false : undefined,
      wooStockStatus: wooStockStatusParam,
      hasOverrides: searchParams.get('hasOverrides') === 'true' ? true :
                    searchParams.get('hasOverrides') === 'false' ? false : undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '50', 10),
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
    newFilters.syncStatus.forEach(s => params.append('syncStatus', s));
    if (newFilters.isValid !== undefined) params.set('isValid', String(newFilters.isValid));
    if (newFilters.feedEnableSearch !== undefined) params.set('feedEnableSearch', String(newFilters.feedEnableSearch));
    newFilters.wooStockStatus.forEach(s => params.append('wooStockStatus', s));
    if (newFilters.hasOverrides !== undefined) params.set('hasOverrides', String(newFilters.hasOverrides));
    if (newFilters.page > 1) params.set('page', String(newFilters.page));
    if (newFilters.limit !== 50) params.set('limit', String(newFilters.limit));

    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [filters, router, pathname]);

  // Reset all filters to defaults
  const resetFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  // Toggle sort direction or change sort column
  const toggleSort = useCallback((column: CatalogFilters['sortBy']) => {
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

  // Check if any filters are active (non-default)
  const hasActiveFilters = useMemo(() => {
    return filters.search !== '' ||
           filters.syncStatus.length > 0 ||
           filters.isValid !== undefined ||
           filters.feedEnableSearch !== undefined ||
           filters.wooStockStatus.length > 0 ||
           filters.hasOverrides !== undefined;
  }, [filters]);

  // Get filters in API format (for bulk update filtered mode)
  const getApiFilters = useCallback(() => {
    return {
      search: filters.search || undefined,
      syncStatus: filters.syncStatus.length > 0 ? filters.syncStatus : undefined,
      isValid: filters.isValid,
      feedEnableSearch: filters.feedEnableSearch,
      wooStockStatus: filters.wooStockStatus.length > 0 ? filters.wooStockStatus : undefined,
      hasOverrides: filters.hasOverrides,
    };
  }, [filters]);

  return {
    filters,
    setFilters,
    resetFilters,
    toggleSort,
    hasActiveFilters,
    getApiFilters,
  };
}
