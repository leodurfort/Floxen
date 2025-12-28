'use client';

interface ClearFiltersButtonProps {
  hasActiveFilters: boolean;
  onClear: () => void;
}

export function ClearFiltersButton({ hasActiveFilters, onClear }: ClearFiltersButtonProps) {
  if (!hasActiveFilters) return null;

  return (
    <button
      onClick={onClear}
      className="
        flex items-center gap-2 px-3 py-2 text-sm font-medium
        bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200
        text-gray-600 hover:text-red-600
        rounded-lg transition-colors
      "
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
      Clear Filters
    </button>
  );
}
