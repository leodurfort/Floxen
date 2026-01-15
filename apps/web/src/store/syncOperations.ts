import { create } from 'zustand';

/**
 * Tracks when operations that trigger background reprocessing were initiated.
 * Used to enable temporary polling to detect when reprocessing completes.
 */
interface SyncOperationsState {
  /** Timestamp when field mappings were last updated (triggers 60s polling) */
  fieldMappingsUpdatedAt: number | null;
  /** Call after field mappings mutation completes to start polling */
  setFieldMappingsUpdated: () => void;
}

export const useSyncOperations = create<SyncOperationsState>((set) => ({
  fieldMappingsUpdatedAt: null,
  setFieldMappingsUpdated: () => set({ fieldMappingsUpdatedAt: Date.now() }),
}));
