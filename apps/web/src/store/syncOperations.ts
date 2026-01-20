import { create } from 'zustand';

const USER_SYNC_KEY_PREFIX = 'productsynch.userSync.';

/**
 * Tracks when operations that trigger background reprocessing were initiated.
 * Used to enable temporary polling to detect when reprocessing completes.
 */
interface SyncOperationsState {
  /** Timestamp when field mappings were last updated (triggers 60s polling) */
  fieldMappingsUpdatedAt: number | null;
  /** Call after field mappings mutation completes to start polling */
  setFieldMappingsUpdated: () => void;
  /** Mark a sync as user-initiated (persists to localStorage) */
  setUserInitiatedSync: (shopId: string) => void;
  /** Clear user-initiated sync flag */
  clearUserInitiatedSync: (shopId: string) => void;
  /** Check if a sync was user-initiated */
  isUserInitiatedSync: (shopId: string) => boolean;
}

export const useSyncOperations = create<SyncOperationsState>((set) => ({
  fieldMappingsUpdatedAt: null,
  setFieldMappingsUpdated: () => set({ fieldMappingsUpdatedAt: Date.now() }),

  setUserInitiatedSync: (shopId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${USER_SYNC_KEY_PREFIX}${shopId}`, 'true');
    }
  },

  clearUserInitiatedSync: (shopId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${USER_SYNC_KEY_PREFIX}${shopId}`);
    }
  },

  isUserInitiatedSync: (shopId: string) => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`${USER_SYNC_KEY_PREFIX}${shopId}`) === 'true';
    }
    return false;
  },
}));
