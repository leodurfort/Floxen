import { create } from 'zustand';
import { Shop } from '@productsynch/shared';

/**
 * Simplified shops store - only manages selection state
 * All shop data fetching is now handled by React Query (useShopsQuery)
 */
interface ShopsState {
  selectedShop: Shop | null;
  setSelectedShop: (shop: Shop | null) => void;
}

export const useShops = create<ShopsState>((set) => ({
  selectedShop: null,
  setSelectedShop: (shop) => set({ selectedShop: shop }),
}));
