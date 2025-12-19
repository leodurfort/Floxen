import { create } from 'zustand';
import { Shop } from '@productsynch/shared';
import { listShops } from '@/lib/api';

interface ShopsState {
  shops: Shop[];
  selectedShop: Shop | null;
  loading: boolean;
  error: string | null;
  setShops: (shops: Shop[]) => void;
  setSelectedShop: (shop: Shop | null) => void;
  loadShops: (accessToken: string) => Promise<void>;
  removeShop: (shopId: string) => void;
  updateShop: (shopId: string, updates: Partial<Shop>) => void;
}

export const useShops = create<ShopsState>((set, get) => ({
  shops: [],
  selectedShop: null,
  loading: false,
  error: null,

  setShops: (shops) => set({ shops }),

  setSelectedShop: (shop) => set({ selectedShop: shop }),

  loadShops: async (accessToken: string) => {
    set({ loading: true, error: null });
    try {
      const data = await listShops(accessToken);
      const { selectedShop } = get();

      // Update selected shop with fresh data if it still exists
      let newSelectedShop = selectedShop;
      if (selectedShop) {
        const updatedShop = data.shops.find((s: Shop) => s.id === selectedShop.id);
        newSelectedShop = updatedShop || null;
      }

      // Auto-select first connected shop if none selected
      if (!newSelectedShop && data.shops.length > 0) {
        const connectedShop = data.shops.find((s: Shop) => s.isConnected);
        newSelectedShop = connectedShop || data.shops[0];
      }

      set({ shops: data.shops, selectedShop: newSelectedShop, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load shops';
      set({ error: message, loading: false });
    }
  },

  removeShop: (shopId: string) => {
    const { shops, selectedShop } = get();
    const newShops = shops.filter((s) => s.id !== shopId);

    // Clear selected shop if it was removed
    let newSelectedShop = selectedShop;
    if (selectedShop?.id === shopId) {
      const connectedShop = newShops.find((s) => s.isConnected);
      newSelectedShop = connectedShop || newShops[0] || null;
    }

    set({ shops: newShops, selectedShop: newSelectedShop });
  },

  updateShop: (shopId: string, updates: Partial<Shop>) => {
    const { shops, selectedShop } = get();
    const newShops = shops.map((s) =>
      s.id === shopId ? { ...s, ...updates } : s
    );

    // Update selected shop if it was the one modified
    let newSelectedShop = selectedShop;
    if (selectedShop?.id === shopId) {
      newSelectedShop = { ...selectedShop, ...updates };

      // If shop became disconnected, try to select another connected shop
      if (updates.isConnected === false) {
        const connectedShop = newShops.find((s) => s.isConnected && s.id !== shopId);
        if (connectedShop) {
          newSelectedShop = connectedShop;
        }
      }
    }

    set({ shops: newShops, selectedShop: newSelectedShop });
  },
}));
