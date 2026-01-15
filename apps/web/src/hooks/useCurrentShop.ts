import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useShopsQuery, useShopsSyncPolling } from './useShopsQuery';
import type { Shop } from '@productsynch/shared';

/**
 * Derives the current shop from the URL (single source of truth).
 * Priority: pathname > query param > first connected shop > first shop.
 */
export function useCurrentShop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: shops = [], isLoading } = useShopsQuery();

  const shopIdFromPathname = useMemo(() => {
    const match = pathname.match(/^\/shops\/([^/]+)/);
    return match && match[1] !== 'new' ? match[1] : null;
  }, [pathname]);

  const shopIdFromQuery = searchParams.get('shop');
  const shopIdFromUrl = shopIdFromPathname || shopIdFromQuery;

  const currentShop = useMemo((): Shop | null => {
    if (shops.length === 0) return null;
    if (shopIdFromUrl) {
      const shop = shops.find((s) => s.id === shopIdFromUrl);
      if (shop) return shop;
    }
    return shops.find((s) => s.isConnected) ?? shops[0];
  }, [shops, shopIdFromUrl]);

  const isFirstSync = (currentShop?.syncStatus === 'SYNCING' || currentShop?.syncStatus === 'PENDING')
    && currentShop?.lastSyncAt === null;
  useShopsSyncPolling(isFirstSync);

  return {
    currentShop,
    shopIdFromUrl,
    isLoading,
    shops,
  };
}
