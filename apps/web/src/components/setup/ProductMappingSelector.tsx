'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { OpenAIFieldSpec, validateStaticValue } from '@productsynch/shared';
import { WooCommerceField, searchWooFields, getWooField } from '@/lib/wooCommerceFields';

// Helper to generate format hint from spec
function getFormatHint(spec: OpenAIFieldSpec): string {
  const hints: string[] = [];

  if (spec.supportedValues) {
    hints.push(`Values: ${spec.supportedValues}`);
  }

  if (spec.validationRules && spec.validationRules.length > 0) {
    hints.push(...spec.validationRules);
  }

  if (hints.length === 0 && spec.dataType) {
    hints.push(`Type: ${spec.dataType}`);
  }

  return hints.join(' · ');
}

interface ProductMappingSelectorProps {
  // Current state
  value: string | null;              // Selected WooCommerce field or null
  staticValue: string | null;        // Current static value (if in static mode)
  isStaticMode: boolean;             // Whether static value is active
  isNoMappingMode: boolean;          // Whether "no mapping" is selected

  // Callbacks
  onFieldSelect: (field: string) => void;
  onNoMappingSelect: () => void;
  onStaticValueSave: (value: string) => void;
  onReset: () => void;

  // Configuration
  spec: OpenAIFieldSpec;
  shopMapping: string | null;        // Shop default (for "no mapping" option visibility)
  wooFields: WooCommerceField[];
  wooFieldsLoading: boolean;
  hasOverride: boolean;              // Show reset button
  allowStaticOverride: boolean;      // Whether static values allowed
  isLockedField: boolean;            // Hide WooCommerce fields list
}

export function ProductMappingSelector({
  value,
  staticValue,
  isStaticMode,
  isNoMappingMode,
  onFieldSelect,
  onNoMappingSelect,
  onStaticValueSave,
  onReset,
  spec,
  shopMapping,
  wooFields,
  wooFieldsLoading,
  hasOverride,
  allowStaticOverride,
  isLockedField,
}: ProductMappingSelectorProps) {
  // Dropdown state
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Static value input state
  const [isStaticExpanded, setIsStaticExpanded] = useState(false);
  const [draftStaticValue, setDraftStaticValue] = useState(staticValue || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync draft when staticValue prop changes
  useEffect(() => {
    if (staticValue !== null) {
      setDraftStaticValue(staticValue);
    }
  }, [staticValue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setIsStaticExpanded(false);
        setValidationError(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter fields based on search
  const filteredFields = useMemo(() => {
    const fields = searchQuery ? searchWooFields(wooFields, searchQuery) : wooFields;
    return fields.slice().sort((a, b) => a.label.localeCompare(b.label));
  }, [wooFields, searchQuery]);

  // Check if draft is valid
  const isDraftValid = useMemo(() => {
    if (!draftStaticValue) return false;
    const validation = validateStaticValue(spec.attribute, draftStaticValue);
    return validation.isValid;
  }, [draftStaticValue, spec.attribute]);

  // Handle static value input change
  function handleStaticInputChange(value: string) {
    setDraftStaticValue(value);
    // Clear error while typing
    if (validationError) {
      setValidationError(null);
    }
  }

  // Handle static value save
  function handleStaticValueSubmit() {
    if (!draftStaticValue) {
      setValidationError('Value is required');
      return;
    }
    const validation = validateStaticValue(spec.attribute, draftStaticValue);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid value');
      return;
    }
    setValidationError(null);
    onStaticValueSave(draftStaticValue);
    setIsOpen(false);
    setIsStaticExpanded(false);
    setSearchQuery('');
  }

  // Handle Enter key in static input
  function handleStaticInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleStaticValueSubmit();
    }
  }

  // Handle field selection
  function handleFieldClick(field: WooCommerceField) {
    onFieldSelect(field.value);
    setIsOpen(false);
    setSearchQuery('');
    setIsStaticExpanded(false);
  }

  // Handle no mapping selection
  function handleNoMappingClick() {
    onNoMappingSelect();
    setIsOpen(false);
    setSearchQuery('');
    setIsStaticExpanded(false);
  }

  // Get trigger button text
  function getTriggerText(): string {
    if (wooFieldsLoading) return 'Loading fields...';
    if (isStaticMode && staticValue) return `Static: ${staticValue}`;
    if (isNoMappingMode) return 'No mapping (excluded)';
    if (value) {
      const field = getWooField(wooFields, value);
      return field?.label || value;
    }
    return 'Select field or value';
  }

  // Get trigger text styling
  function getTriggerClass(): string {
    if (isStaticMode) return 'text-[#FA7315]';
    if (isNoMappingMode) return 'text-amber-600';
    if (value) return 'text-gray-900';
    return 'text-gray-500';
  }

  // Show "no mapping" option only if there's a shop mapping to override
  const showNoMappingOption = Boolean(shopMapping || spec.wooCommerceMapping?.field);

  return (
    <div className="flex flex-col gap-2">
      {/* Dropdown Container */}
      <div className="relative w-full" ref={dropdownRef}>
        {/* Trigger Button */}
        <button
          onClick={() => !wooFieldsLoading && setIsOpen(!isOpen)}
          disabled={wooFieldsLoading}
          className={`w-full h-[40px] px-4 py-2.5 text-left bg-white hover:bg-gray-50 rounded-lg border border-gray-300 transition-colors flex items-center justify-between ${
            wooFieldsLoading ? 'cursor-not-allowed opacity-60' : ''
          }`}
        >
          <span className={`text-sm truncate ${getTriggerClass()}`}>
            {getTriggerText()}
          </span>
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Panel */}
        {isOpen && !wooFieldsLoading && (
          <div className="absolute z-50 top-full left-0 w-full mt-2 bg-white rounded-lg border border-gray-200 shadow-xl max-h-[400px] overflow-hidden flex flex-col">
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

            {/* Options List */}
            <div className="overflow-y-auto">
              {/* No mapping option */}
              {!searchQuery && showNoMappingOption && (
                <button
                  onClick={handleNoMappingClick}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                    isNoMappingMode ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="text-sm text-amber-600 font-medium">No mapping (exclude field)</div>
                  <div className="text-xs text-gray-500 mt-0.5">This field will be empty for this product</div>
                </button>
              )}

              {/* Static value option */}
              {!searchQuery && (allowStaticOverride || !isLockedField) && (
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setIsStaticExpanded(!isStaticExpanded)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      isStaticExpanded || isStaticMode ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-[#FA7315] font-medium">+ Set Static Value</div>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${isStaticExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">Enter a custom value for this product</div>
                  </button>

                  {/* Expanded static value input */}
                  {isStaticExpanded && (
                    <div className="px-4 pb-3 pt-1 bg-gray-50">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={draftStaticValue}
                          onChange={(e) => handleStaticInputChange(e.target.value)}
                          onKeyDown={handleStaticInputKeyDown}
                          placeholder={`Enter ${spec.attribute} value...`}
                          className={`flex-1 px-3 py-2 bg-white rounded-lg border text-gray-900 text-sm focus:outline-none ${
                            validationError
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-gray-300 focus:border-[#FA7315]'
                          }`}
                          autoFocus
                        />
                        <button
                          onClick={handleStaticValueSubmit}
                          disabled={!isDraftValid}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            isDraftValid
                              ? 'bg-[#FA7315]/10 border-[#FA7315]/50 text-[#FA7315] hover:bg-[#FA7315]/20 cursor-pointer'
                              : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                          title={isDraftValid ? 'Save static value' : 'Enter a valid value first'}
                        >
                          ✓
                        </button>
                      </div>
                      {/* Format hint */}
                      {getFormatHint(spec) && (
                        <span className="text-xs text-gray-500 mt-1 block">{getFormatHint(spec)}</span>
                      )}
                      {/* Validation error */}
                      {validationError && (
                        <span className="text-xs text-red-600 mt-1 block">{validationError}</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* WooCommerce fields */}
              {!isLockedField && filteredFields.length > 0 ? (
                filteredFields.map((field) => (
                  <button
                    key={field.value}
                    onClick={() => handleFieldClick(field)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                      value === field.value && !isStaticMode && !isNoMappingMode ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="text-sm text-gray-900 font-medium">{field.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{field.value}</div>
                    {field.description && (
                      <div className="text-xs text-gray-400 mt-1">{field.description}</div>
                    )}
                  </button>
                ))
              ) : !isLockedField && searchQuery ? (
                <div className="p-4 text-center text-gray-500 text-sm">No fields found</div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Reset button - outside dropdown */}
      {hasOverride && (
        <button
          onClick={onReset}
          className="text-xs text-gray-500 hover:text-gray-700 underline text-left"
        >
          Reset to Shop Default
        </button>
      )}
    </div>
  );
}
