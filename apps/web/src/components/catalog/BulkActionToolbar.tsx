'use client';

interface BulkActionToolbarProps {
  selectedCount: number;
  totalMatchingCount: number;
  totalCatalogCount: number;
  selectAllMatching: boolean;
  selectAllGlobal: boolean;
  selectAllByItemGroupId: string | null;
  hasActiveFilters: boolean;
  onSelectAllMatching: () => void;
  onSelectAllGlobal: () => void;
  onSelectAllByItemGroup: () => void;
  onClearSelection: () => void;
  onBulkEdit: () => void;
  isProcessing: boolean;
  // Item group info for "Select similar products" feature
  selectedProductItemGroupId: string | null;
  itemGroupCount: number | null;
}

export function BulkActionToolbar({
  selectedCount,
  totalMatchingCount,
  totalCatalogCount,
  selectAllMatching,
  selectAllGlobal,
  selectAllByItemGroupId,
  hasActiveFilters,
  onSelectAllMatching,
  onSelectAllGlobal,
  onSelectAllByItemGroup,
  onClearSelection,
  onBulkEdit,
  isProcessing,
  selectedProductItemGroupId,
  itemGroupCount,
}: BulkActionToolbarProps) {
  // Determine display count based on selection mode
  const displayCount = selectAllGlobal
    ? totalCatalogCount
    : selectAllMatching
    ? totalMatchingCount
    : selectAllByItemGroupId !== null && itemGroupCount !== null
    ? itemGroupCount
    : selectedCount;

  // Show "Select all" button when:
  // - Not already in a "select all" mode
  // - Some products are selected but not all
  const showSelectAllButton =
    !selectAllMatching &&
    !selectAllGlobal &&
    !selectAllByItemGroupId &&
    selectedCount > 0 &&
    selectedCount < (hasActiveFilters ? totalMatchingCount : totalCatalogCount);

  // Show "Select similar products" button when:
  // - Exactly 1 product is selected (not in any "select all" mode)
  // - The selected product has an item_group_id
  // - There are more than 1 products with the same item_group_id
  const showSelectSimilarButton =
    !selectAllMatching &&
    !selectAllGlobal &&
    !selectAllByItemGroupId &&
    selectedCount === 1 &&
    selectedProductItemGroupId !== null &&
    itemGroupCount !== null &&
    itemGroupCount > 1;

  // Determine the target count and handler based on filters
  const selectAllTargetCount = hasActiveFilters ? totalMatchingCount : totalCatalogCount;
  const selectAllHandler = hasActiveFilters ? onSelectAllMatching : onSelectAllGlobal;
  const selectAllLabel = hasActiveFilters
    ? `Select all ${totalMatchingCount.toLocaleString()} matching products`
    : `Select all ${totalCatalogCount.toLocaleString()} products`;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[#FA7315]/10 border border-[#FA7315]/30 rounded-lg mb-4">
      <div className="flex items-center gap-4">
        <span className="text-[#FA7315] font-medium">
          {displayCount.toLocaleString()} product{displayCount !== 1 ? 's' : ''} selected
        </span>

        {/* Show "Select all" button */}
        {showSelectAllButton && (
          <button
            onClick={selectAllHandler}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            {selectAllLabel}
          </button>
        )}

        {/* Show "Select similar products" button */}
        {showSelectSimilarButton && (
          <button
            onClick={onSelectAllByItemGroup}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Select {itemGroupCount!.toLocaleString()} similar products
          </button>
        )}

        {/* Status message when all filtered products are selected */}
        {selectAllMatching && hasActiveFilters && (
          <span className="text-sm text-gray-600">
            All products matching current filters are selected
          </span>
        )}

        {/* Status message when all products in catalog are selected */}
        {selectAllGlobal && (
          <span className="text-sm text-gray-600">
            All products in catalog are selected
          </span>
        )}

        {/* Status message when all products in item group are selected */}
        {selectAllByItemGroupId && (
          <span className="text-sm text-gray-600">
            All similar products are selected
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onBulkEdit}
          disabled={isProcessing}
          className="px-3 py-1.5 text-sm bg-[#FA7315] text-white font-medium rounded-lg hover:bg-[#E5650F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isProcessing ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Bulk Edit
            </>
          )}
        </button>

        <button
          onClick={onClearSelection}
          disabled={isProcessing}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
