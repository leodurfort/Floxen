'use client';

import { useState, useRef, useEffect } from 'react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  multiple?: boolean;
}

export function FilterDropdown({
  label,
  options,
  selected,
  onChange,
  multiple = true,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (value: string) => {
    if (multiple) {
      if (selected.includes(value)) {
        onChange(selected.filter(v => v !== value));
      } else {
        onChange([...selected, value]);
      }
    } else {
      onChange(selected.includes(value) ? [] : [value]);
      setIsOpen(false);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map(o => o.value));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const hasSelection = selected.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1 px-2 py-1 rounded text-xs
          transition-colors
          ${hasSelection
            ? 'bg-[#5df0c0]/20 text-[#5df0c0] border border-[#5df0c0]/30'
            : 'text-white/60 hover:text-white/80 hover:bg-white/5'}
        `}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        {hasSelection && <span>{selected.length}</span>}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-[#1a1d29] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-white/10">
            <span className="text-xs text-white/40 uppercase tracking-wide">{label}</span>
          </div>

          {multiple && (
            <div className="flex gap-2 p-2 border-b border-white/10">
              <button
                onClick={handleSelectAll}
                className="text-xs text-[#5df0c0] hover:underline"
              >
                Select All
              </button>
              <button
                onClick={handleClearAll}
                className="text-xs text-white/60 hover:text-white hover:underline"
              >
                Clear
              </button>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto">
            {options.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 cursor-pointer"
              >
                <input
                  type={multiple ? 'checkbox' : 'radio'}
                  checked={selected.includes(option.value)}
                  onChange={() => handleToggle(option.value)}
                  className="w-4 h-4 rounded border-white/20 bg-transparent text-[#5df0c0] focus:ring-[#5df0c0]/50"
                />
                <span className="text-sm text-white/80">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Boolean filter dropdown (All / Yes / No)
interface BooleanFilterProps {
  label: string;
  value: boolean | undefined;
  onChange: (value: boolean | undefined) => void;
}

export function BooleanFilter({ label, value, onChange }: BooleanFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasSelection = value !== undefined;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1 px-2 py-1 rounded text-xs
          transition-colors
          ${hasSelection
            ? 'bg-[#5df0c0]/20 text-[#5df0c0] border border-[#5df0c0]/30'
            : 'text-white/60 hover:text-white/80 hover:bg-white/5'}
        `}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        {hasSelection && <span>{value ? 'Yes' : 'No'}</span>}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-32 bg-[#1a1d29] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-white/10">
            <span className="text-xs text-white/40 uppercase tracking-wide">{label}</span>
          </div>
          <div>
            {[
              { label: 'All', val: undefined },
              { label: 'Yes', val: true },
              { label: 'No', val: false },
            ].map((option) => (
              <button
                key={String(option.val)}
                onClick={() => {
                  onChange(option.val);
                  setIsOpen(false);
                }}
                className={`
                  w-full text-left px-3 py-2 text-sm hover:bg-white/5
                  ${value === option.val ? 'text-[#5df0c0]' : 'text-white/80'}
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Text search filter
interface SearchFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchFilter({ value, onChange, placeholder = 'Search...' }: SearchFilterProps) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-64 pl-9 pr-4 py-2 bg-[#1a1d29] text-white text-sm rounded-lg border border-white/10 focus:outline-none focus:border-[#5df0c0]/50 placeholder-white/40"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
