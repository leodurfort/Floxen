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
        bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30
        text-white/70 hover:text-red-400
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
