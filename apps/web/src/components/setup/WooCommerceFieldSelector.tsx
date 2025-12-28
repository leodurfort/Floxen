'use client';

import { useState, useRef, useEffect } from 'react';
import { WooCommerceField, searchWooFields, getWooField } from '@/lib/wooCommerceFields';

interface Props {
  value: string | null;           // Current selected field value
  onChange: (value: string | null) => void;
  openaiAttribute: string;        // For debugging/logging
  requirement?: 'Required' | 'Recommended' | 'Optional' | 'Conditional';  // Field requirement level
  fields: WooCommerceField[];     // WooCommerce fields passed from parent
  loading: boolean;               // Loading state passed from parent
}

export function WooCommerceFieldSelector({ value, onChange, openaiAttribute, requirement, fields, loading }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredFields = (searchQuery ? searchWooFields(fields, searchQuery) : fields)
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label));
  const selectedField = value ? getWooField(fields, value) : null;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(field: WooCommerceField) {
    onChange(field.value);
    setIsOpen(false);
    setSearchQuery('');
  }

  function handleClear() {
    onChange(null);
    setIsOpen(false);
    setSearchQuery('');
  }

  // Determine button text and styling
  let buttonText: string;
  let buttonClass: string;
  let borderClass: string;

  if (loading) {
    buttonText = 'Loading fields...';
    buttonClass = 'text-gray-400';
    borderClass = 'border-gray-200';
  } else if (selectedField) {
    buttonText = selectedField.label;
    buttonClass = 'text-gray-900';
    borderClass = 'border-gray-300';
  } else if (value) {
    // Field was set but no longer exists - treat as unmapped
    // This can happen if a field was deleted or the field list changed
    if (requirement === 'Required') {
      buttonText = '⚠️ Not mapped';
      buttonClass = 'text-amber-600';
      borderClass = 'border-amber-300';
    } else {
      buttonText = 'Select WooCommerce field';
      buttonClass = 'text-gray-500';
      borderClass = 'border-gray-200';
    }
  } else {
    // No mapping set - show alert only for required fields
    if (requirement === 'Required') {
      buttonText = '⚠️ Not mapped';
      buttonClass = 'text-amber-600';
      borderClass = 'border-amber-300';
    } else {
      // Non-required fields show neutral placeholder
      buttonText = 'Select WooCommerce field';
      buttonClass = 'text-gray-500';
      borderClass = 'border-gray-200';
    }
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => !loading && setIsOpen(!isOpen)}
        disabled={loading}
        className={`w-full h-[40px] px-4 py-2.5 text-left bg-white hover:bg-gray-50 rounded-lg border transition-colors flex items-center justify-between ${borderClass} ${
          loading ? 'cursor-not-allowed opacity-60' : ''
        }`}
      >
        <span className={`text-sm truncate ${buttonClass}`}>
          {buttonText}
        </span>
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && !loading && (
        <div className="absolute z-50 top-full left-0 w-full mt-2 bg-white rounded-lg border border-gray-200 shadow-xl max-h-[320px] overflow-hidden flex flex-col">
          {/* Search Bar */}
          <div className="p-3 border-b border-gray-100">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fields..."
              className="w-full px-3 py-2 bg-gray-50 text-gray-900 text-sm rounded border border-gray-200 focus:outline-none focus:border-[#FA7315]"
              autoFocus
            />
          </div>

          {/* Field List */}
          <div className="overflow-y-auto">
            {/* Clear mapping option (only show when not searching and a field is currently selected) */}
            {!searchQuery && value && (
              <button
                onClick={handleClear}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100"
              >
                <div className="text-sm text-gray-500 italic">Select WooCommerce field</div>
                <div className="text-xs text-gray-400 mt-0.5">Clear this mapping</div>
              </button>
            )}

            {filteredFields.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchQuery ? 'No fields found' : 'No fields available'}
              </div>
            ) : (
              filteredFields.map((field) => (
                <button
                  key={field.value}
                  onClick={() => handleSelect(field)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                    value === field.value ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="text-sm text-gray-900 font-medium">{field.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{field.value}</div>
                  {field.description && (
                    <div className="text-xs text-gray-400 mt-1">{field.description}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
