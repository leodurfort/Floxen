'use client';

import { useState, useRef, useEffect } from 'react';
import { WooCommerceField, WOO_COMMERCE_FIELDS, searchWooFields, getWooField } from '@/lib/wooCommerceFields';

interface Props {
  value: string | null;           // Current selected field value
  onChange: (value: string) => void;
  openaiAttribute: string;        // For debugging/logging
}

export function WooCommerceFieldSelector({ value, onChange, openaiAttribute }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredFields = searchQuery ? searchWooFields(searchQuery) : WOO_COMMERCE_FIELDS;
  const selectedField = value ? getWooField(value) : null;

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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left bg-[#252936] hover:bg-[#2d3142] rounded-lg border border-white/10 transition-colors flex items-center justify-between"
      >
        <span className="text-sm text-white truncate">
          {selectedField ? selectedField.label : 'Select WooCommerce field...'}
        </span>
        <svg className="w-4 h-4 text-white/40 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#252936] rounded-lg border border-white/10 shadow-2xl max-h-96 overflow-hidden flex flex-col">
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
            {filteredFields.length === 0 ? (
              <div className="p-4 text-center text-white/40 text-sm">No fields found</div>
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
