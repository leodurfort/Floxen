'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ALL_COLUMNS,
  getDefaultVisibleColumns,
  getColumnsByCategory,
  getStoredColumns,
  saveStoredColumns,
  type ColumnDefinition,
} from '@/lib/columnDefinitions';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface EditColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  visibleColumns: string[];
  onSave: (columns: string[]) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function EditColumnsModal({
  isOpen,
  onClose,
  shopId,
  visibleColumns,
  onSave,
}: EditColumnsModalProps) {
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(visibleColumns));
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Get columns grouped by category
  const columnsByCategory = useMemo(() => getColumnsByCategory(), []);

  // Filter columns by search query
  const filteredColumnsByCategory = useMemo(() => {
    if (!searchQuery.trim()) return columnsByCategory;

    const query = searchQuery.toLowerCase();
    const filtered = new Map<string, ColumnDefinition[]>();

    columnsByCategory.forEach((columns, category) => {
      const matchingColumns = columns.filter(
        (col) =>
          col.label.toLowerCase().includes(query) ||
          col.id.toLowerCase().includes(query)
      );
      if (matchingColumns.length > 0) {
        filtered.set(category, matchingColumns);
      }
    });

    return filtered;
  }, [columnsByCategory, searchQuery]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedColumns(new Set(visibleColumns));
      setSearchQuery('');
      // Expand all categories by default
      setExpandedCategories(new Set(Array.from(columnsByCategory.keys())));
    }
  }, [isOpen, visibleColumns, columnsByCategory]);

  // Toggle single column
  const toggleColumn = (columnId: string) => {
    // Don't allow toggling always-visible columns
    if (columnId === 'checkbox' || columnId === 'actions') return;

    setSelectedColumns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      return newSet;
    });
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Select all columns in a category
  const selectAllInCategory = (category: string) => {
    const columns = columnsByCategory.get(category) || [];
    setSelectedColumns((prev) => {
      const newSet = new Set(prev);
      columns.forEach((col) => {
        if (col.id !== 'checkbox' && col.id !== 'actions') {
          newSet.add(col.id);
        }
      });
      return newSet;
    });
  };

  // Deselect all columns in a category
  const deselectAllInCategory = (category: string) => {
    const columns = columnsByCategory.get(category) || [];
    setSelectedColumns((prev) => {
      const newSet = new Set(prev);
      columns.forEach((col) => {
        if (col.id !== 'checkbox' && col.id !== 'actions') {
          newSet.delete(col.id);
        }
      });
      return newSet;
    });
  };

  // Check if all columns in category are selected
  const isCategoryFullySelected = (category: string): boolean => {
    const columns = columnsByCategory.get(category) || [];
    return columns.every(
      (col) => col.id === 'checkbox' || col.id === 'actions' || selectedColumns.has(col.id)
    );
  };

  // Check if any column in category is selected
  const isCategoryPartiallySelected = (category: string): boolean => {
    const columns = columnsByCategory.get(category) || [];
    const selectableColumns = columns.filter(
      (col) => col.id !== 'checkbox' && col.id !== 'actions'
    );
    const selectedCount = selectableColumns.filter((col) => selectedColumns.has(col.id)).length;
    return selectedCount > 0 && selectedCount < selectableColumns.length;
  };

  // Handle save
  const handleSave = () => {
    const columnsArray = Array.from(selectedColumns);
    saveStoredColumns(shopId, columnsArray);
    onSave(columnsArray);
    onClose();
  };

  // Reset to default
  const handleReset = () => {
    setSelectedColumns(new Set(getDefaultVisibleColumns()));
  };

  // Count selected columns
  const selectedCount = selectedColumns.size;
  const totalCount = ALL_COLUMNS.filter(
    (col) => col.id !== 'checkbox' && col.id !== 'actions'
  ).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl border border-gray-200 w-[600px] max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Columns</h2>
            <p className="text-sm text-gray-500 mt-1">
              {selectedCount} of {totalCount} columns selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search columns..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FA7315]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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

        {/* Body - Scrollable Categories */}
        <div className="flex-1 overflow-y-auto">
          {Array.from(filteredColumnsByCategory.entries()).map(([category, columns]) => (
            <div key={category} className="border-b border-gray-100 last:border-b-0">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      expandedCategories.has(category) ? 'rotate-90' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span className="font-medium text-gray-900">{category}</span>
                  <span className="text-xs text-gray-500">
                    ({columns.filter((c) => selectedColumns.has(c.id)).length}/{columns.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isCategoryPartiallySelected(category) && (
                    <span className="w-2 h-2 bg-[#FA7315]/50 rounded-full" />
                  )}
                  {isCategoryFullySelected(category) && (
                    <span className="w-2 h-2 bg-[#FA7315] rounded-full" />
                  )}
                </div>
              </button>

              {/* Category Columns */}
              {expandedCategories.has(category) && (
                <div className="px-6 pb-3">
                  {/* Select All / Deselect All */}
                  <div className="flex gap-3 mb-2 ml-7">
                    <button
                      onClick={() => selectAllInCategory(category)}
                      className="text-xs text-[#FA7315] hover:text-[#E5650F]"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => deselectAllInCategory(category)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Deselect All
                    </button>
                  </div>

                  {/* Column Checkboxes */}
                  <div className="grid grid-cols-2 gap-1">
                    {columns.map((column) => {
                      const isAlwaysVisible =
                        column.id === 'checkbox' || column.id === 'actions';
                      const isSelected = selectedColumns.has(column.id);

                      return (
                        <label
                          key={column.id}
                          className={`
                            flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer
                            ${isAlwaysVisible ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
                          `}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected || isAlwaysVisible}
                            onChange={() => toggleColumn(column.id)}
                            disabled={isAlwaysVisible}
                            className="w-4 h-4 rounded border-gray-300 bg-white text-[#FA7315] focus:ring-[#FA7315]/50 disabled:opacity-50"
                          />
                          <span className="text-sm text-gray-700 truncate">{column.label}</span>
                          {isAlwaysVisible && (
                            <span className="text-xs text-gray-400">(always)</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredColumnsByCategory.size === 0 && (
            <div className="p-8 text-center text-gray-500">No columns match your search</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Reset to Default
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-[#FA7315] text-white font-medium rounded-lg hover:bg-[#E5650F] transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Re-export helper functions for backward compatibility
export { getStoredColumns, saveStoredColumns } from '@/lib/columnDefinitions';
