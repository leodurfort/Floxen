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

  const filteredFields = searchQuery ? searchWooFields(fields, searchQuery) : fields;
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
    buttonClass = 'text-white/40';
    borderClass = 'border-white/10';
  } else if (selectedField) {
    buttonText = selectedField.label;
    buttonClass = 'text-white';
    borderClass = 'border-white/10';
  } else if (value) {
    // Field was set but no longer exists - treat as unmapped
    // This can happen if a field was deleted or the field list changed
    if (requirement === 'Required') {
      buttonText = '⚠️ Not mapped';
      buttonClass = 'text-amber-400/60';
      borderClass = 'border-amber-400/30';
    } else {
      buttonText = 'Select WooCommerce field';
      buttonClass = 'text-white/60';
      borderClass = 'border-white/10';
    }
  } else {
    // No mapping set - show alert only for required fields
    if (requirement === 'Required') {
      buttonText = '⚠️ Not mapped';
      buttonClass = 'text-amber-400/60';
      borderClass = 'border-amber-400/30';
    } else {
      // Non-required fields show neutral placeholder
      buttonText = 'Select WooCommerce field';
      buttonClass = 'text-white/60';
      borderClass = 'border-white/10';
    }
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => !loading && setIsOpen(!isOpen)}
        disabled={loading}
        className={`w-full h-[40px] px-4 py-2.5 text-left bg-[#252936] hover:bg-[#2d3142] rounded-lg border transition-colors flex items-center justify-between ${borderClass} ${
          loading ? 'cursor-not-allowed opacity-60' : ''
        }`}
      >
        <span className={`text-sm truncate ${buttonClass}`}>
          {buttonText}
        </span>
        <svg className="w-4 h-4 text-white/40 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && !loading && (
        <div className="absolute z-50 top-full left-0 w-full mt-2 bg-[#252936] rounded-lg border border-white/10 shadow-2xl max-h-[320px] overflow-hidden flex flex-col">
          {/* Search Bar */}
          <div className="p-3 border-b border-white/10">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fields..."
              className="w-full px-3 py-2 bg-[#1a1d29] text-white text-sm rounded border border-white/10 focus:outline-none focus:border-[#5df0c0]"
              autoFocus
            />
          </div>

          {/* Field List */}
          <div className="overflow-y-auto">
            {/* Clear mapping option (only show when not searching and a field is currently selected) */}
            {!searchQuery && value && (
              <button
                onClick={handleClear}
                className="w-full px-4 py-3 text-left hover:bg-[#2d3142] transition-colors border-b border-white/10"
              >
                <div className="text-sm text-white/60 italic">Select WooCommerce field</div>
                <div className="text-xs text-white/30 mt-0.5">Clear this mapping</div>
              </button>
            )}

            {filteredFields.length === 0 ? (
              <div className="p-4 text-center text-white/40 text-sm">
                {searchQuery ? 'No fields found' : 'No fields available'}
              </div>
            ) : (
              filteredFields.map((field) => (
                <button
                  key={field.value}
                  onClick={() => handleSelect(field)}
                  className={`w-full px-4 py-3 text-left hover:bg-[#2d3142] transition-colors border-b border-white/5 last:border-0 ${
                    value === field.value ? 'bg-[#2d3142]' : ''
                  }`}
                >
                  <div className="text-sm text-white font-medium">{field.label}</div>
                  <div className="text-xs text-white/40 mt-0.5">{field.value}</div>
                  {field.description && (
                    <div className="text-xs text-white/30 mt-1">{field.description}</div>
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
