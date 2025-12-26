'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/store/auth';
import { bulkUpdateProducts, BulkUpdateOperation, BulkUpdateFilters, BulkUpdateResponse } from '@/lib/api';

export interface BulkUpdateProgress {
  isProcessing: boolean;
  error: string | null;
  result: BulkUpdateResponse | null;
}

export function useBulkUpdate(shopId: string) {
  const { accessToken } = useAuth();
  const [progress, setProgress] = useState<BulkUpdateProgress>({
    isProcessing: false,
    error: null,
    result: null,
  });

  const executeBulkUpdate = useCallback(async (
    selectionMode: 'selected' | 'filtered',
    productIds: string[] | undefined,
    filters: BulkUpdateFilters | undefined,
    update: BulkUpdateOperation
  ): Promise<BulkUpdateResponse | null> => {
    if (!accessToken) {
      setProgress({
        isProcessing: false,
        error: 'Not authenticated',
        result: null,
      });
      return null;
    }

    setProgress({
      isProcessing: true,
      error: null,
      result: null,
    });

    try {
      const result = await bulkUpdateProducts(shopId, accessToken, {
        selectionMode,
        productIds,
        filters,
        update,
      });

      setProgress({
        isProcessing: false,
        error: result.failedProducts > 0 ? `${result.failedProducts} products failed to update` : null,
        result,
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bulk update failed';
      setProgress({
        isProcessing: false,
        error: errorMessage,
        result: null,
      });
      return null;
    }
  }, [shopId, accessToken]);

  const reset = useCallback(() => {
    setProgress({
      isProcessing: false,
      error: null,
      result: null,
    });
  }, []);

  return {
    progress,
    executeBulkUpdate,
    reset,
  };
}
