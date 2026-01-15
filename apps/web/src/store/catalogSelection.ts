import { create } from 'zustand';

interface CatalogSelectionState {
  selectedIds: Set<string>;
  selectAllMatching: boolean;
  selectAllGlobal: boolean;
  selectAllByItemGroupId: string | null;
  selectAllByItemGroupCount: number | null;
  currentShopId: string | null;

  setShopId: (shopId: string) => void;
  toggleProduct: (id: string) => void;
  selectProducts: (ids: string[]) => void;
  deselectProducts: (ids: string[]) => void;
  selectAllOnPage: (ids: string[]) => void;
  deselectAllOnPage: (ids: string[]) => void;
  setSelectAllMatching: (value: boolean) => void;
  setSelectAllGlobal: (value: boolean) => void;
  setSelectAllByItemGroupId: (itemGroupId: string | null, count?: number) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  getSelectedCount: () => number;
  getSelectedIds: () => string[];
  isGlobalSelectMode: () => boolean;
}

const CLEAR_GLOBAL_MODES = {
  selectAllMatching: false,
  selectAllGlobal: false,
  selectAllByItemGroupId: null,
  selectAllByItemGroupCount: null,
} as const;

export const useCatalogSelection = create<CatalogSelectionState>((set, get) => ({
  selectedIds: new Set(),
  selectAllMatching: false,
  selectAllGlobal: false,
  selectAllByItemGroupId: null,
  selectAllByItemGroupCount: null,
  currentShopId: null,

  setShopId: (shopId) => {
    if (get().currentShopId !== shopId) {
      set({ currentShopId: shopId, selectedIds: new Set(), ...CLEAR_GLOBAL_MODES });
    }
  },

  toggleProduct: (id) => set((state) => {
    const newSet = new Set(state.selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return { selectedIds: newSet, ...CLEAR_GLOBAL_MODES };
  }),

  selectProducts: (ids) => set((state) => {
    const newSet = new Set(state.selectedIds);
    for (const id of ids) newSet.add(id);
    return { selectedIds: newSet };
  }),

  deselectProducts: (ids) => set((state) => {
    const newSet = new Set(state.selectedIds);
    for (const id of ids) newSet.delete(id);
    return { selectedIds: newSet, ...CLEAR_GLOBAL_MODES };
  }),

  selectAllOnPage: (ids) => set((state) => {
    const newSet = new Set(state.selectedIds);
    for (const id of ids) newSet.add(id);
    return { selectedIds: newSet };
  }),

  deselectAllOnPage: (ids) => set((state) => {
    const newSet = new Set(state.selectedIds);
    for (const id of ids) newSet.delete(id);
    return { selectedIds: newSet, ...CLEAR_GLOBAL_MODES };
  }),

  setSelectAllMatching: (value) => set({
    selectAllMatching: value,
    selectAllGlobal: false,
    selectAllByItemGroupId: null,
    selectAllByItemGroupCount: null,
  }),

  setSelectAllGlobal: (value) => set({
    selectAllGlobal: value,
    selectAllMatching: false,
    selectAllByItemGroupId: null,
    selectAllByItemGroupCount: null,
  }),

  setSelectAllByItemGroupId: (itemGroupId, count) => set({
    selectAllByItemGroupId: itemGroupId,
    selectAllByItemGroupCount: count ?? null,
    selectAllMatching: false,
    selectAllGlobal: false,
  }),

  clearSelection: () => set({ selectedIds: new Set(), ...CLEAR_GLOBAL_MODES }),

  isSelected: (id) => get().selectedIds.has(id),
  getSelectedCount: () => get().selectedIds.size,
  getSelectedIds: () => Array.from(get().selectedIds),
  isGlobalSelectMode: () => {
    const state = get();
    return state.selectAllGlobal || state.selectAllMatching || state.selectAllByItemGroupId !== null;
  },
}));
