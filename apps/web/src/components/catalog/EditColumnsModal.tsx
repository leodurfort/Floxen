'use client';

import { useState, useEffect } from 'react';

export interface ColumnConfig {
  id: string;
  label: string;
  defaultVisible: boolean;
}

export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'checkbox', label: 'Selection', defaultVisible: true },
  { id: 'wooProductId', label: 'ID', defaultVisible: true },
  { id: 'image', label: 'Image', defaultVisible: true },
  { id: 'wooTitle', label: 'Name', defaultVisible: true },
  { id: 'wooPermalink', label: 'URL', defaultVisible: true },
  { id: 'wooPrice', label: 'Price', defaultVisible: true },
  { id: 'syncStatus', label: 'Status', defaultVisible: true },
  { id: 'overrides', label: 'Overrides', defaultVisible: true },
  { id: 'isValid', label: 'Valid', defaultVisible: true },
  { id: 'updatedAt', label: 'Last Modified', defaultVisible: true },
  { id: 'feedEnableSearch', label: 'Enable Search', defaultVisible: false },
  { id: 'wooStockStatus', label: 'Stock Status', defaultVisible: false },
  { id: 'wooStockQuantity', label: 'Stock Qty', defaultVisible: false },
];

interface EditColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  visibleColumns: string[];
  onSave: (columns: string[]) => void;
}

export function EditColumnsModal({
  isOpen,
  onClose,
  visibleColumns,
  onSave,
}: EditColumnsModalProps) {
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(visibleColumns));

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedColumns(new Set(visibleColumns));
    }
  }, [isOpen, visibleColumns]);

  const toggleColumn = (columnId: string) => {
    // Don't allow toggling checkbox column
    if (columnId === 'checkbox') return;

    setSelectedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      return newSet;
    });
  };

  const handleSave = () => {
    onSave(Array.from(selectedColumns));
    onClose();
  };

  const handleReset = () => {
    setSelectedColumns(new Set(
      DEFAULT_COLUMNS.filter(c => c.defaultVisible).map(c => c.id)
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1a1d29] rounded-2xl border border-white/10 w-[400px] max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Edit Columns</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-sm text-white/60 mb-4">
            Select which columns to display in the product table.
          </p>
          <div className="space-y-2">
            {DEFAULT_COLUMNS.map(column => (
              <label
                key={column.id}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer
                  ${column.id === 'checkbox' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5'}
                `}
              >
                <input
                  type="checkbox"
                  checked={selectedColumns.has(column.id)}
                  onChange={() => toggleColumn(column.id)}
                  disabled={column.id === 'checkbox'}
                  className="w-4 h-4 rounded border-white/20 bg-transparent text-[#5df0c0] focus:ring-[#5df0c0]/50 disabled:opacity-50"
                />
                <span className="text-sm text-white/80">{column.label}</span>
                {column.id === 'checkbox' && (
                  <span className="text-xs text-white/40">(always visible)</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-white/60 hover:text-white transition-colors"
          >
            Reset to Default
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-[#5df0c0] text-black font-medium rounded-lg hover:bg-[#5df0c0]/90 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to get visible columns from localStorage
export function getStoredColumns(shopId: string): string[] {
  if (typeof window === 'undefined') {
    return DEFAULT_COLUMNS.filter(c => c.defaultVisible).map(c => c.id);
  }

  const stored = localStorage.getItem(`productsynch:catalog:columns:${shopId}`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Invalid JSON, return defaults
    }
  }
  return DEFAULT_COLUMNS.filter(c => c.defaultVisible).map(c => c.id);
}

// Helper to save visible columns to localStorage
export function saveStoredColumns(shopId: string, columns: string[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`productsynch:catalog:columns:${shopId}`, JSON.stringify(columns));
  }
}
