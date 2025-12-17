'use client';

import { useState, useRef, useEffect } from 'react';
import { WooCommerceField, searchWooFields, getWooField } from '@/lib/wooCommerceFields';
import { useAuth } from '@/store/auth';
import { useParams } from 'next/navigation';

interface Props {
  value: string | null;           // Current selected field value
  onChange: (value: string | null) => void;
  openaiAttribute: string;        // For debugging/logging
}

export function WooCommerceFieldSelector({ value, onChange, openaiAttribute }: Props) {
  const params = useParams<{ id: string }>();
  const { accessToken } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fields, setFields] = useState<WooCommerceField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load fields from API
  useEffect(() => {
    if (!accessToken || !params.id) return;

    async function loadFields() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/shops/${params.id}/woo-fields`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!res.ok) {
          throw new Error(`Failed to load fields: ${res.statusText}`);
        }

        const data = await res.json();
        setFields(data.fields || []);
      } catch (err) {
        console.error('[WooCommerceFieldSelector] Failed to load fields', err);
        setError(err instanceof Error ? err.message : 'Failed to load fields');
      } finally {
        setLoading(false);
      }
    }

    loadFields();
  }, [accessToken, params.id]);

  const filteredFields = searchQuery ? searchWooFields(fields, searchQuery) : fields;
  const selectedField = value ? getWooField(fields, value) : null;
  const hasInvalidMapping = value && !selectedField && !loading; // Field value exists but not found in list

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
  } else if (error) {
    buttonText = `⚠️ Error loading fields`;
    buttonClass = 'text-red-400';
    borderClass = 'border-red-400/50';
  } else if (selectedField) {
    buttonText = selectedField.label;
    buttonClass = 'text-white';
    borderClass = 'border-white/10';
  } else if (hasInvalidMapping) {
    buttonText = `⚠️ Invalid: ${value}`;
    buttonClass = 'text-amber-400';
    borderClass = 'border-amber-400/50';
  } else {
    // No mapping set
    buttonText = '⚠️ Not mapped';
    buttonClass = 'text-amber-400/60';
    borderClass = 'border-amber-400/30';
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => !loading && !error && setIsOpen(!isOpen)}
        disabled={loading || !!error}
        className={`w-full h-[40px] px-4 py-2.5 text-left bg-[#252936] hover:bg-[#2d3142] rounded-lg border transition-colors flex items-center justify-between ${borderClass} ${
          loading || error ? 'cursor-not-allowed opacity-60' : ''
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
      {isOpen && !loading && !error && (
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
            {/* Clear mapping option (only show when not searching) */}
            {!searchQuery && (
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
