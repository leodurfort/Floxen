import { useQuery } from '@tanstack/react-query';
import { useEffect, RefObject } from 'react';
import { useAuth } from '@/store/auth';
import * as api from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import type { WooCommerceField } from '@/lib/wooCommerceFields';

export type { WooCommerceField };

/**
 * Calls callback when clicking outside of the specified element(s).
 */
export function useClickOutside(
  refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  callback: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    function handleClickOutside(event: MouseEvent) {
      const refsArray = Array.isArray(refs) ? refs : [refs];
      const target = event.target as Node;
      const isOutside = refsArray.every(
        ref => ref.current && !ref.current.contains(target)
      );
      if (isOutside) {
        callback();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [refs, callback, enabled]);
}

export function useWooFieldsQuery(shopId: string | undefined) {
  const { user, hydrated } = useAuth();

  return useQuery({
    queryKey: queryKeys.wooCommerce.fields(shopId ?? ''),
    queryFn: async () => {
      if (!shopId) throw new Error('No store selected');
      const result = await api.getWooFields(shopId);
      return result.fields;
    },
    enabled: hydrated && !!user && !!shopId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useWooProductDataQuery(shopId: string | undefined, productId: string | null | undefined) {
  const { user, hydrated } = useAuth();

  return useQuery({
    queryKey: queryKeys.wooCommerce.productData(shopId ?? '', productId ?? ''),
    queryFn: async () => {
      if (!shopId || !productId) throw new Error('No store or product selected');
      return api.getProductWooData(shopId, productId);
    },
    enabled: hydrated && !!user && !!shopId && !!productId,
    staleTime: 60 * 1000,
  });
}
