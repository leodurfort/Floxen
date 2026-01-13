'use client';

interface SelectAllConfirmDialogProps {
  isOpen: boolean;
  totalCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SelectAllConfirmDialog({
  isOpen,
  totalCount,
  onConfirm,
  onCancel,
}: SelectAllConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        {/* Warning Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-amber-100 rounded-full">
          <svg
            className="w-6 h-6 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
          Select All Products?
        </h3>

        {/* Message */}
        <p className="text-gray-600 text-center mb-6">
          You are about to select{' '}
          <span className="font-semibold text-gray-900">
            {totalCount.toLocaleString()} products
          </span>
          . Any bulk edit you perform will apply to all of them.
        </p>

        {/* Warning Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-amber-800">
            <span className="font-medium">This action affects your entire catalog.</span>{' '}
            Make sure you review your bulk edit carefully before applying.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-[#FA7315] text-white font-medium rounded-lg hover:bg-[#E5650F] transition-colors"
          >
            Select All {totalCount.toLocaleString()}
          </button>
        </div>
      </div>
    </div>
  );
}
