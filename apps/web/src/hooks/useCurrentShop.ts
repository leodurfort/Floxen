import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useShopsQuery, useShopsSyncPolling } from './useShopsQuery';
import type { Shop } from '@productsynch/shared';

/**
 * URL-First Shop Selection Hook
 *
 * This hook derives the current shop from the URL, making the URL the single
 * source of truth for shop selection. This eliminates desync between URL and state.
 *
 * Priority order:
 * 1. Shop ID from pathname (e.g., /shops/abc123/products)
 * 2. Shop ID from query param (e.g., /shops?shop=abc123 after OAuth)
 * 3. First connected shop (fallback for /dashboard, etc.)
 * 4. First shop in list (final fallback)
 *
 * @returns {Object} Current shop state
 *   - currentShop: The currently selected shop (or null if none/loading)
 *   - shopIdFromUrl: The shop ID extracted from URL (or null)
 *   - isLoading: Whether shops are still loading
 *   - shops: All shops from React Query
 */
export function useCurrentShop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: shops = [], isLoading } = useShopsQuery();

  // Extract shop ID from pathname: /shops/[id]/...
  const shopIdFromPathname = useMemo(() => {
    const match = pathname.match(/^\/shops\/([^/]+)/);
    if (match && match[1] !== 'new') {
      return match[1];
    }
    return null;
  }, [pathname]);

  // Extract shop ID from query param: ?shop=abc123
  const shopIdFromQuery = searchParams.get('shop');

  // Combine: pathname takes priority over query param
  const shopIdFromUrl = shopIdFromPathname || shopIdFromQuery;

  // Derive current shop from URL or fallback
  const currentShop = useMemo((): Shop | null => {
    if (shops.length === 0) return null;

    // Priority 1: Shop ID from URL
    if (shopIdFromUrl) {
      const shop = shops.find((s) => s.id === shopIdFromUrl);
      if (shop) return shop;
      // Shop ID in URL doesn't exist - fall through to fallback
    }

    // Priority 2: First connected shop
    const connected = shops.find((s) => s.isConnected);
    if (connected) return connected;

    // Priority 3: First shop in list
    return shops[0];
  }, [shops, shopIdFromUrl]);

  // Enable polling only during first sync (for first sync banner auto-hide)
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
