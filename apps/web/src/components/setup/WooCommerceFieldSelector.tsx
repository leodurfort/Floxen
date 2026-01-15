'use client';

import { useState, useRef, useCallback } from 'react';
import { WooCommerceField, searchWooFields, getWooField } from '@/lib/wooCommerceFields';
import { useClickOutside } from '@/hooks/useWooFieldsQuery';

interface Props {
  value: string | null;
  onChange: (value: string | null) => void;
  openaiAttribute: string;
  requirement?: 'Required' | 'Recommended' | 'Optional' | 'Conditional';
  fields: WooCommerceField[];
  loading: boolean;
}

export function WooCommerceFieldSelector({ value, onChange, openaiAttribute, requirement, fields, loading }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredFields = (searchQuery ? searchWooFields(fields, searchQuery) : fields)
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label));
  const selectedField = value ? getWooField(fields, value) : null;

  useClickOutside(dropdownRef, useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, []), isOpen);

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
  } else if (requirement === 'Required') {
    buttonText = '⚠️ Not mapped';
    buttonClass = 'text-amber-600';
    borderClass = 'border-amber-300';
  } else {
    buttonText = 'Select WooCommerce field';
    buttonClass = 'text-gray-500';
    borderClass = 'border-gray-200';
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
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

      {isOpen && !loading && (
        <div className="absolute z-50 top-full left-0 w-full mt-2 bg-white rounded-lg border border-gray-200 shadow-xl max-h-[320px] overflow-hidden flex flex-col">
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

          <div className="overflow-y-auto">
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
