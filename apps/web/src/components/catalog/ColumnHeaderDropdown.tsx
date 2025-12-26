'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ColumnValue {
  value: string;
  label: string;
  count?: number;
}

export interface ColumnHeaderDropdownProps {
  columnId: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;

  // Current state
  currentSort: { column: string; order: 'asc' | 'desc' } | null;
  currentTextFilter: string;
  currentValueFilter: string[];

  // Unique values for checkbox list
  uniqueValues: ColumnValue[];
  loadingValues?: boolean;
  onLoadValues?: () => void;

  // Callbacks
  onSort: (order: 'asc' | 'desc' | null) => void;
  onTextFilter: (text: string) => void;
  onValueFilter: (values: string[]) => void;
  onClearFilter: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ColumnHeaderDropdown({
  columnId,
  label,
  sortable = true,
  filterable = true,
  currentSort,
  currentTextFilter,
  currentValueFilter,
  uniqueValues,
  loadingValues = false,
  onLoadValues,
  onSort,
  onTextFilter,
  onValueFilter,
  onClearFilter,
}: ColumnHeaderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(''); // Local search for filtering the list (not a filter itself)
  const [pendingValues, setPendingValues] = useState<string[]>([]); // Pending checkbox selections
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Check if this column is sorted
  const isSorted = currentSort?.column === columnId;
  const sortOrder = isSorted ? currentSort.order : null;

  // Check if this column has active filters
  const hasActiveFilter = Boolean(currentTextFilter) || currentValueFilter.length > 0;

  // Check if pending values differ from current (user has unapplied changes)
  const hasPendingChanges = isOpen && (
    pendingValues.length !== currentValueFilter.length ||
    !pendingValues.every(v => currentValueFilter.includes(v))
  );

  // Initialize pending values when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setPendingValues([...currentValueFilter]);
      setSearchInput(''); // Reset search when opening
    }
  }, [isOpen, currentValueFilter]);

  // Load values when dropdown opens
  useEffect(() => {
    if (isOpen && filterable && onLoadValues && uniqueValues.length === 0 && !loadingValues) {
      onLoadValues();
    }
  }, [isOpen, filterable, onLoadValues, uniqueValues.length, loadingValues]);

  // Close on click outside (discards pending changes)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        // Pending changes are discarded automatically since we reset on next open
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Toggle value in pending selection (does NOT apply immediately)
  const toggleValue = useCallback(
    (value: string) => {
      setPendingValues(prev =>
        prev.includes(value)
          ? prev.filter((v) => v !== value)
          : [...prev, value]
      );
    },
    []
  );

  // Select all values in pending
  const selectAllPending = useCallback(() => {
    setPendingValues(uniqueValues.map((v) => v.value));
  }, [uniqueValues]);

  // Deselect all in pending
  const deselectAllPending = useCallback(() => {
    setPendingValues([]);
  }, []);

  // Apply pending filter and close dropdown
  const applyFilter = useCallback(() => {
    onValueFilter(pendingValues);
    setIsOpen(false);
  }, [pendingValues, onValueFilter]);

  // Clear all filters for this column
  const handleClear = useCallback(() => {
    setSearchInput('');
    onClearFilter();
  }, [onClearFilter]);

  // Filter unique values by search input
  const filteredValues = uniqueValues.filter(
    (v) =>
      v.label.toLowerCase().includes(searchInput.toLowerCase()) ||
      v.value.toLowerCase().includes(searchInput.toLowerCase())
  );

  return (
    <div className="relative inline-flex items-center">
      {/* Column Header Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1 px-2 py-1 text-left text-sm font-medium
          text-white/70 hover:text-white transition-colors rounded
          ${isOpen ? 'bg-white/10' : 'hover:bg-white/5'}
          ${hasActiveFilter ? 'text-[#5df0c0]' : ''}
        `}
      >
        <span className="truncate">{label}</span>

        {/* Sort indicator */}
        {isSorted && (
          <span className="text-[#5df0c0] ml-1">
            {sortOrder === 'asc' ? '↑' : '↓'}
          </span>
        )}

        {/* Filter indicator */}
        {hasActiveFilter && (
          <span className="w-1.5 h-1.5 bg-[#5df0c0] rounded-full ml-1" />
        )}

        {/* Dropdown arrow */}
        <svg
          className={`w-3 h-3 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-1 z-50 w-64 bg-[#1a1d29] border border-white/10 rounded-lg shadow-xl overflow-hidden"
        >
          {/* Sort Section */}
          {sortable && (
            <div className="p-2 border-b border-white/10">
              <div className="flex gap-1">
                <button
                  onClick={() => onSort('asc')}
                  className={`
                    flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors
                    ${sortOrder === 'asc'
                      ? 'bg-[#5df0c0] text-black'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  Sort A→Z
                </button>
                <button
                  onClick={() => onSort('desc')}
                  className={`
                    flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors
                    ${sortOrder === 'desc'
                      ? 'bg-[#5df0c0] text-black'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  Sort Z→A
                </button>
                {(isSorted || hasActiveFilter) && (
                  <button
                    onClick={handleClear}
                    className="px-2 py-1.5 text-xs font-medium rounded bg-white/5 text-white/70 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Filter Section */}
          {filterable && (
            <>
              {/* Search Input */}
              <div className="p-2 border-b border-white/10">
                <div className="relative">
                  <svg
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded text-white placeholder-white/40 focus:outline-none focus:border-[#5df0c0]/50"
                  />
                  {searchInput && (
                    <button
                      onClick={() => setSearchInput('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Checkbox List */}
              <div className="max-h-48 overflow-y-auto">
                {loadingValues ? (
                  <div className="p-4 text-center text-white/40 text-sm">Loading...</div>
                ) : filteredValues.length === 0 ? (
                  <div className="p-4 text-center text-white/40 text-sm">No values found</div>
                ) : (
                  <>
                    {/* Select All / Deselect All */}
                    <div className="px-2 py-1.5 border-b border-white/10 flex gap-2">
                      <button
                        onClick={selectAllPending}
                        className="text-xs text-[#5df0c0] hover:text-[#5df0c0]/80"
                      >
                        Select All
                      </button>
                      <span className="text-white/20">|</span>
                      <button
                        onClick={deselectAllPending}
                        className="text-xs text-white/60 hover:text-white"
                      >
                        Clear
                      </button>
                    </div>

                    {/* Value Checkboxes */}
                    {filteredValues.map((item) => (
                      <label
                        key={item.value}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={pendingValues.includes(item.value)}
                          onChange={() => toggleValue(item.value)}
                          className="w-4 h-4 rounded border-white/20 bg-transparent text-[#5df0c0] focus:ring-[#5df0c0]/50"
                        />
                        <span className="flex-1 text-sm text-white/80 truncate">{item.label}</span>
                        {item.count !== undefined && (
                          <span className="text-xs text-white/40">({item.count})</span>
                        )}
                      </label>
                    ))}
                  </>
                )}
              </div>

              {/* Apply Filter Button */}
              {filteredValues.length > 0 && (
                <div className="p-2 border-t border-white/10">
                  <button
                    onClick={applyFilter}
                    disabled={!hasPendingChanges && pendingValues.length === 0}
                    className={`
                      w-full px-3 py-2 text-sm font-medium rounded transition-colors
                      ${hasPendingChanges || pendingValues.length > 0
                        ? 'bg-[#5df0c0] text-black hover:bg-[#4de0b0]'
                        : 'bg-white/10 text-white/40 cursor-not-allowed'
                      }
                    `}
                  >
                    {pendingValues.length > 0
                      ? `Apply Filter (${pendingValues.length} selected)`
                      : 'Apply Filter'
                    }
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
