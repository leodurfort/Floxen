import { create } from 'zustand';

interface CatalogSelectionState {
  // Selected product IDs (persists across pages within a session)
  selectedIds: Set<string>;

  // "Select all matching" mode - when true, selection applies to ALL filtered products
  selectAllMatching: boolean;

  // "Select all global" mode - when true, selection applies to ALL products in catalog (no filters)
  selectAllGlobal: boolean;

  // Shop ID to scope selection (clear selection when shop changes)
  currentShopId: string | null;

  // Actions
  setShopId: (shopId: string) => void;
  toggleProduct: (id: string) => void;
  selectProducts: (ids: string[]) => void;
  deselectProducts: (ids: string[]) => void;
  selectAllOnPage: (ids: string[]) => void;
  deselectAllOnPage: (ids: string[]) => void;
  setSelectAllMatching: (value: boolean) => void;
  setSelectAllGlobal: (value: boolean) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  getSelectedCount: () => number;
  getSelectedIds: () => string[];
  isGlobalSelectMode: () => boolean;
}

export const useCatalogSelection = create<CatalogSelectionState>((set, get) => ({
  selectedIds: new Set(),
  selectAllMatching: false,
  selectAllGlobal: false,
  currentShopId: null,

  setShopId: (shopId) => {
    const { currentShopId } = get();
    if (currentShopId !== shopId) {
      // Clear selection when shop changes
      set({
        currentShopId: shopId,
        selectedIds: new Set(),
        selectAllMatching: false,
        selectAllGlobal: false,
      });
    }
  },

  toggleProduct: (id) => set((state) => {
    const newSet = new Set(state.selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return { selectedIds: newSet, selectAllMatching: false, selectAllGlobal: false };
  }),

  selectProducts: (ids) => set((state) => {
    const newSet = new Set(state.selectedIds);
    ids.forEach(id => newSet.add(id));
    return { selectedIds: newSet };
  }),

  deselectProducts: (ids) => set((state) => {
    const newSet = new Set(state.selectedIds);
    ids.forEach(id => newSet.delete(id));
    return { selectedIds: newSet, selectAllMatching: false, selectAllGlobal: false };
  }),

  selectAllOnPage: (ids) => set((state) => {
    const newSet = new Set(state.selectedIds);
    ids.forEach(id => newSet.add(id));
    return { selectedIds: newSet };
  }),

  deselectAllOnPage: (ids) => set((state) => {
    const newSet = new Set(state.selectedIds);
    ids.forEach(id => newSet.delete(id));
    return { selectedIds: newSet, selectAllMatching: false, selectAllGlobal: false };
  }),

  setSelectAllMatching: (value) => set({ selectAllMatching: value, selectAllGlobal: false }),

  setSelectAllGlobal: (value) => set({ selectAllGlobal: value, selectAllMatching: false }),

  clearSelection: () => set({
    selectedIds: new Set(),
    selectAllMatching: false,
    selectAllGlobal: false,
  }),

  isSelected: (id) => get().selectedIds.has(id),

  getSelectedCount: () => get().selectedIds.size,

  getSelectedIds: () => Array.from(get().selectedIds),

  isGlobalSelectMode: () => get().selectAllGlobal || get().selectAllMatching,
}));
