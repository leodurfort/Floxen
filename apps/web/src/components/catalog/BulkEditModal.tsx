'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  CATEGORY_CONFIG,
  LOCKED_FIELD_SET,
  PRODUCT_EDITABLE_FIELDS,
  validateStaticValue,
  OpenAIFieldCategory,
  OpenAIFieldSpec,
} from '@productsynch/shared';
import { BulkUpdateOperation } from '@/lib/api';
import { searchWooFields } from '@/lib/wooCommerceFields';
import { useWooFieldsQuery } from '@/hooks/useWooFieldsQuery';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (update: BulkUpdateOperation) => Promise<void>;
  selectedCount: number;
  isProcessing: boolean;
  shopId: string;
}

export function BulkEditModal({
  isOpen,
  onClose,
  onSubmit,
  selectedCount,
  isProcessing,
  shopId,
}: BulkEditModalProps) {
  const [selectedAttribute, setSelectedAttribute] = useState<string | null>(null);
  const [overrideType, setOverrideType] = useState<'mapping' | 'static' | 'remove'>('static');
  const [staticValue, setStaticValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // WooCommerce field selector state - now using React Query
  const { data: wooFields = [], isLoading: wooFieldsLoading } = useWooFieldsQuery(isOpen ? shopId : undefined);
  const [selectedWooField, setSelectedWooField] = useState<string | null>(null);
  const [wooFieldSearch, setWooFieldSearch] = useState('');
  const [isWooDropdownOpen, setIsWooDropdownOpen] = useState(false);
  const wooDropdownRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAttribute(null);
      setOverrideType('static');
      setStaticValue('');
      setValidationError(null);
      setSelectedWooField(null);
      setWooFieldSearch('');
      setIsWooDropdownOpen(false);
      setEnableSearchValue('true');
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wooDropdownRef.current && !wooDropdownRef.current.contains(event.target as Node)) {
        setIsWooDropdownOpen(false);
        setWooFieldSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter WooCommerce fields based on search
  const filteredWooFields = useMemo(() => {
    const fields = wooFieldSearch ? searchWooFields(wooFields, wooFieldSearch) : wooFields;
    return fields.slice().sort((a, b) => a.label.localeCompare(b.label));
  }, [wooFields, wooFieldSearch]);

  // Get available fields - use PRODUCT_EDITABLE_FIELDS from shared package
  // This automatically excludes: auto-populated, shop-managed, feature-disabled, and fully locked fields
  const availableFields = PRODUCT_EDITABLE_FIELDS;

  // Check if enable_search is selected (needs special dropdown UI)
  const isEnableSearchField = selectedAttribute === 'enable_search';
  const [enableSearchValue, setEnableSearchValue] = useState<'true' | 'false'>('true');

  // Group by category
  const categories = useMemo(() => {
    const groups: { id: OpenAIFieldCategory; label: string; order: number; fields: OpenAIFieldSpec[] }[] = [];

    Object.entries(CATEGORY_CONFIG).forEach(([id, config]) => {
      const fields = availableFields.filter(spec => spec.category === id);
      if (fields.length > 0) {
        groups.push({
          id: id as OpenAIFieldCategory,
          label: config.label,
          order: config.order,
          fields,
        });
      }
    });

    return groups.sort((a, b) => a.order - b.order);
  }, [availableFields]);

  const selectedSpec = useMemo(() => {
    return availableFields.find(f => f.attribute === selectedAttribute);
  }, [selectedAttribute, availableFields]);

  const isLockedField = selectedAttribute ? LOCKED_FIELD_SET.has(selectedAttribute) : false;

  // Validate static value on change
  useEffect(() => {
    if (overrideType === 'static' && selectedAttribute && staticValue) {
      const validation = validateStaticValue(selectedAttribute, staticValue);
      setValidationError(validation.isValid ? null : validation.error || 'Invalid value');
    } else {
      setValidationError(null);
    }
  }, [overrideType, selectedAttribute, staticValue]);

  // Get label for selected WooCommerce field
  const getSelectedWooFieldLabel = () => {
    if (!selectedWooField) return 'Select WooCommerce field...';
    const field = wooFields.find(f => f.value === selectedWooField);
    return field?.label || selectedWooField;
  };

  const handleSubmit = async () => {
    if (!selectedAttribute) return;

    let update: BulkUpdateOperation;

    // Special handling for enable_search - use dedicated update type
    if (isEnableSearchField) {
      update = { type: 'enable_search', value: enableSearchValue === 'true' };
    } else if (overrideType === 'remove') {
      update = { type: 'remove_override', attribute: selectedAttribute };
    } else if (overrideType === 'static') {
      if (!staticValue.trim()) {
        setValidationError('Value is required');
        return;
      }
      const validation = validateStaticValue(selectedAttribute, staticValue);
      if (!validation.isValid) {
        setValidationError(validation.error || 'Invalid value');
        return;
      }
      update = { type: 'static_override', attribute: selectedAttribute, value: staticValue };
    } else {
      // mapping type - use selected WooCommerce field (can be null for "exclude")
      update = { type: 'field_mapping', attribute: selectedAttribute, wooField: selectedWooField };
    }

    await onSubmit(update);
  };

  // Can submit when:
  // - An attribute is selected
  // - No validation errors
  // - Not processing
  // - For enable_search: always (uses dropdown)
  // - For static: value is entered
  // - For mapping: either a field is selected OR null is intentional (exclude)
  const canSubmit = selectedAttribute && !validationError && !isProcessing &&
    (isEnableSearchField ||  // enable_search always has a valid value from dropdown
     overrideType === 'remove' ||
     (overrideType === 'static' && staticValue.trim()) ||
     overrideType === 'mapping'); // mapping can be null (exclude) or a field

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1a1d29] rounded-2xl border border-white/10 w-[600px] max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Bulk Edit Fields</h2>
            <p className="text-sm text-white/60 mt-1">
              Apply changes to {selectedCount.toLocaleString()} selected product{selectedCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-white/40 hover:text-white transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Field Selection */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Select Field to Update
              </label>
              <select
                value={selectedAttribute || ''}
                onChange={(e) => {
                  setSelectedAttribute(e.target.value || null);
                  setStaticValue('');
                  setValidationError(null);
                  setSelectedWooField(null);
                  // Default to static for locked fields
                  if (e.target.value && LOCKED_FIELD_SET.has(e.target.value)) {
                    setOverrideType('static');
                  }
                }}
                className="w-full px-4 py-3 bg-[#252936] text-white rounded-lg border border-white/10 focus:outline-none focus:border-[#5df0c0]/50"
              >
                <option value="">Choose a field...</option>
                {categories.map(cat => (
                  <optgroup key={cat.id} label={cat.label}>
                    {cat.fields.map(field => (
                      <option key={field.attribute} value={field.attribute}>
                        {field.attribute}
                        {LOCKED_FIELD_SET.has(field.attribute) ? ' (static only)' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Field Info */}
            {selectedSpec && (
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <p className="text-sm text-white/80">{selectedSpec.description}</p>
                <p className="text-xs text-white/40 mt-2">
                  Type: {selectedSpec.dataType}
                  {selectedSpec.supportedValues && ` | Values: ${selectedSpec.supportedValues}`}
                </p>
                {selectedSpec.example && (
                  <p className="text-xs text-white/40 mt-1">Example: {selectedSpec.example}</p>
                )}
              </div>
            )}

            {/* enable_search - Special dropdown UI */}
            {isEnableSearchField && (
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Search Visibility
                </label>
                <select
                  value={enableSearchValue}
                  onChange={(e) => setEnableSearchValue(e.target.value as 'true' | 'false')}
                  className="w-full px-4 py-3 bg-[#252936] text-white rounded-lg border border-white/10 focus:outline-none focus:border-[#5df0c0]/50"
                >
                  <option value="true">Enabled (true) - Products appear in ChatGPT search</option>
                  <option value="false">Disabled (false) - Products hidden from search</option>
                </select>
                <p className="mt-2 text-xs text-white/40">
                  This controls whether products can be surfaced in ChatGPT search results.
                </p>
              </div>
            )}

            {/* Override Type - for non-enable_search fields */}
            {selectedAttribute && !isEnableSearchField && (
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Update Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOverrideType('static')}
                    className={`
                      px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                      ${overrideType === 'static'
                        ? 'bg-[#5df0c0]/20 border-[#5df0c0]/50 text-[#5df0c0]'
                        : 'bg-[#252936] border-white/10 text-white/60 hover:text-white'}
                    `}
                  >
                    Set Static Value
                  </button>
                  {!isLockedField && (
                    <button
                      onClick={() => {
                        setOverrideType('mapping');
                        setSelectedWooField(null); // Reset to allow fresh selection
                      }}
                      className={`
                        px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                        ${overrideType === 'mapping'
                          ? 'bg-[#5df0c0]/20 border-[#5df0c0]/50 text-[#5df0c0]'
                          : 'bg-[#252936] border-white/10 text-white/60 hover:text-white'}
                      `}
                    >
                      Custom Mapping
                    </button>
                  )}
                  <button
                    onClick={() => setOverrideType('remove')}
                    className={`
                      px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                      ${overrideType === 'remove'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                        : 'bg-[#252936] border-white/10 text-white/60 hover:text-white'}
                    `}
                  >
                    Remove Override
                  </button>
                </div>
              </div>
            )}

            {/* Static Value Input */}
            {selectedAttribute && overrideType === 'static' && (
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Static Value
                </label>
                <input
                  type="text"
                  value={staticValue}
                  onChange={(e) => setStaticValue(e.target.value)}
                  placeholder={selectedSpec?.example || 'Enter value...'}
                  className={`
                    w-full px-4 py-3 bg-[#252936] text-white rounded-lg border
                    focus:outline-none transition-colors
                    ${validationError
                      ? 'border-red-500/50 focus:border-red-500'
                      : 'border-white/10 focus:border-[#5df0c0]/50'}
                  `}
                />
                {validationError && (
                  <p className="mt-2 text-sm text-red-400">{validationError}</p>
                )}
              </div>
            )}

            {/* WooCommerce Field Selector */}
            {selectedAttribute && overrideType === 'mapping' && (
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  WooCommerce Field Mapping
                </label>

                {/* Custom styled dropdown for WooCommerce fields */}
                <div className="relative" ref={wooDropdownRef}>
                  <button
                    onClick={() => !wooFieldsLoading && setIsWooDropdownOpen(!isWooDropdownOpen)}
                    disabled={wooFieldsLoading}
                    className={`
                      w-full h-[44px] px-4 py-2.5 text-left bg-[#252936] hover:bg-[#2d3142] rounded-lg border
                      transition-colors flex items-center justify-between border-white/10
                      ${wooFieldsLoading ? 'cursor-not-allowed opacity-60' : ''}
                    `}
                  >
                    <span className={`text-sm truncate ${
                      selectedWooField ? 'text-white' : 'text-white/60'
                    }`}>
                      {wooFieldsLoading ? 'Loading fields...' : getSelectedWooFieldLabel()}
                    </span>
                    <svg className="w-4 h-4 text-white/40 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Panel */}
                  {isWooDropdownOpen && !wooFieldsLoading && (
                    <div className="absolute z-50 top-full left-0 w-full mt-2 bg-[#252936] rounded-lg border border-white/10 shadow-2xl max-h-[280px] overflow-hidden flex flex-col">
                      {/* Search Bar */}
                      <div className="p-3 border-b border-white/10">
                        <input
                          type="text"
                          value={wooFieldSearch}
                          onChange={(e) => setWooFieldSearch(e.target.value)}
                          placeholder="Search fields..."
                          className="w-full px-3 py-2 bg-[#1a1d29] text-white text-sm rounded border border-white/10 focus:outline-none focus:border-[#5df0c0]"
                          autoFocus
                        />
                      </div>

                      {/* Options List */}
                      <div className="overflow-y-auto">
                        {/* "No mapping" option - exclude field */}
                        {!wooFieldSearch && (
                          <button
                            onClick={() => {
                              setSelectedWooField(null);
                              setIsWooDropdownOpen(false);
                              setWooFieldSearch('');
                            }}
                            className={`
                              w-full px-4 py-3 text-left hover:bg-[#2d3142] transition-colors border-b border-white/10
                              ${selectedWooField === null ? 'bg-[#2d3142]' : ''}
                            `}
                          >
                            <div className="text-sm text-amber-400 font-medium">No mapping (exclude field)</div>
                            <div className="text-xs text-white/40 mt-0.5">This field will be empty for selected products</div>
                          </button>
                        )}

                        {/* WooCommerce fields */}
                        {filteredWooFields.length > 0 ? (
                          filteredWooFields.map((field) => (
                            <button
                              key={field.value}
                              onClick={() => {
                                setSelectedWooField(field.value);
                                setIsWooDropdownOpen(false);
                                setWooFieldSearch('');
                              }}
                              className={`
                                w-full px-4 py-3 text-left hover:bg-[#2d3142] transition-colors border-b border-white/5 last:border-0
                                ${selectedWooField === field.value ? 'bg-[#2d3142]' : ''}
                              `}
                            >
                              <div className="text-sm text-white font-medium">{field.label}</div>
                              <div className="text-xs text-white/40 mt-0.5">{field.value}</div>
                              {field.description && (
                                <div className="text-xs text-white/30 mt-1">{field.description}</div>
                              )}
                            </button>
                          ))
                        ) : wooFieldSearch ? (
                          <div className="p-4 text-center text-white/40 text-sm">No fields found</div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>

                {/* Info about the selected mapping */}
                {selectedWooField === null && (
                  <div className="mt-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                    <p className="text-sm text-amber-400">
                      This will exclude "{selectedAttribute}" from the feed for all selected products.
                    </p>
                  </div>
                )}
                {selectedWooField && (
                  <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                    <p className="text-sm text-blue-400">
                      This will map "{selectedAttribute}" to WooCommerce field "{selectedWooField}" for all selected products.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Remove Override Warning */}
            {selectedAttribute && overrideType === 'remove' && (
              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                <p className="text-sm text-amber-400">
                  This will remove any existing override for "{selectedAttribute}" and revert to shop-level defaults.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-white/60 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-6 py-2 bg-[#5df0c0] text-black font-medium rounded-lg hover:bg-[#5df0c0]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : (
              `Apply to ${selectedCount.toLocaleString()} Products`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
