'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
import { useWooFieldsQuery, useClickOutside } from '@/hooks/useWooFieldsQuery';

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

  const { data: wooFields = [], isLoading: wooFieldsLoading } = useWooFieldsQuery(isOpen ? shopId : undefined);
  const [selectedWooField, setSelectedWooField] = useState<string | null>(null);
  const [wooFieldSearch, setWooFieldSearch] = useState('');
  const [isWooDropdownOpen, setIsWooDropdownOpen] = useState(false);
  const wooDropdownRef = useRef<HTMLDivElement>(null);

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

  useClickOutside(wooDropdownRef, useCallback(() => {
    setIsWooDropdownOpen(false);
    setWooFieldSearch('');
  }, []), isWooDropdownOpen);

  const filteredWooFields = useMemo(() => {
    const fields = wooFieldSearch ? searchWooFields(wooFields, wooFieldSearch) : wooFields;
    return fields.slice().sort((a, b) => a.label.localeCompare(b.label));
  }, [wooFields, wooFieldSearch]);

  const availableFields = PRODUCT_EDITABLE_FIELDS;
  const isEnableSearchField = selectedAttribute === 'enable_search';
  const [enableSearchValue, setEnableSearchValue] = useState<'true' | 'false'>('true');

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

  useEffect(() => {
    if (overrideType === 'static' && selectedAttribute && staticValue) {
      const validation = validateStaticValue(selectedAttribute, staticValue);
      setValidationError(validation.isValid ? null : validation.error || 'Invalid value');
    } else {
      setValidationError(null);
    }
  }, [overrideType, selectedAttribute, staticValue]);

  const getSelectedWooFieldLabel = () => {
    if (!selectedWooField) return 'Select WooCommerce field...';
    const field = wooFields.find(f => f.value === selectedWooField);
    return field?.label || selectedWooField;
  };

  const handleSubmit = async () => {
    if (!selectedAttribute) return;

    let update: BulkUpdateOperation;

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
      update = { type: 'field_mapping', attribute: selectedAttribute, wooField: selectedWooField };
    }

    await onSubmit(update);
  };

  const canSubmit = selectedAttribute && !validationError && !isProcessing &&
    (isEnableSearchField || overrideType === 'remove' ||
     (overrideType === 'static' && staticValue.trim()) ||
     overrideType === 'mapping');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl border border-gray-200 w-[600px] max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bulk Edit Fields</h2>
            <p className="text-sm text-gray-600 mt-1">
              Apply changes to {selectedCount.toLocaleString()} selected product{selectedCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg border border-gray-300 focus:outline-none focus:border-[#FA7315] focus:ring-2 focus:ring-[#FA7315]/10"
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

            {selectedSpec && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700">{selectedSpec.description}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Type: {selectedSpec.dataType}
                  {selectedSpec.supportedValues && ` | Values: ${selectedSpec.supportedValues}`}
                </p>
                {selectedSpec.example && (
                  <p className="text-xs text-gray-500 mt-1">Example: {selectedSpec.example}</p>
                )}
              </div>
            )}

            {isEnableSearchField && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Visibility
                </label>
                <select
                  value={enableSearchValue}
                  onChange={(e) => setEnableSearchValue(e.target.value as 'true' | 'false')}
                  className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg border border-gray-300 focus:outline-none focus:border-[#FA7315] focus:ring-2 focus:ring-[#FA7315]/10"
                >
                  <option value="true">Enabled (true) - Products appear in ChatGPT search</option>
                  <option value="false">Disabled (false) - Products hidden from search</option>
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  This controls whether products can be surfaced in ChatGPT search results.
                </p>
              </div>
            )}

            {selectedAttribute && !isEnableSearchField && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Update Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOverrideType('static')}
                    className={`
                      px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                      ${overrideType === 'static'
                        ? 'bg-[#FA7315]/10 border-[#FA7315]/50 text-[#FA7315]'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:text-gray-900'}
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
                          ? 'bg-[#FA7315]/10 border-[#FA7315]/50 text-[#FA7315]'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:text-gray-900'}
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
                        ? 'bg-amber-50 border-amber-300 text-amber-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:text-gray-900'}
                    `}
                  >
                    Remove Custom Value
                  </button>
                </div>
              </div>
            )}

            {selectedAttribute && overrideType === 'static' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Static Value
                </label>
                <input
                  type="text"
                  value={staticValue}
                  onChange={(e) => setStaticValue(e.target.value)}
                  placeholder={selectedSpec?.example || 'Enter value...'}
                  className={`
                    w-full px-4 py-3 bg-white text-gray-900 rounded-lg border
                    focus:outline-none transition-colors
                    ${validationError
                      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/10'
                      : 'border-gray-300 focus:border-[#FA7315] focus:ring-2 focus:ring-[#FA7315]/10'}
                  `}
                />
                {validationError && (
                  <p className="mt-2 text-sm text-red-600">{validationError}</p>
                )}
              </div>
            )}

            {selectedAttribute && overrideType === 'mapping' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WooCommerce Field Mapping
                </label>
                <div className="relative" ref={wooDropdownRef}>
                  <button
                    onClick={() => !wooFieldsLoading && setIsWooDropdownOpen(!isWooDropdownOpen)}
                    disabled={wooFieldsLoading}
                    className={`
                      w-full h-[44px] px-4 py-2.5 text-left bg-white hover:bg-gray-50 rounded-lg border border-gray-300
                      transition-colors flex items-center justify-between
                      ${wooFieldsLoading ? 'cursor-not-allowed opacity-60' : ''}
                    `}
                  >
                    <span className={`text-sm truncate ${
                      selectedWooField ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {wooFieldsLoading ? 'Loading fields...' : getSelectedWooFieldLabel()}
                    </span>
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isWooDropdownOpen && !wooFieldsLoading && (
                    <div className="absolute z-50 top-full left-0 w-full mt-2 bg-white rounded-lg border border-gray-200 shadow-xl max-h-[280px] overflow-hidden flex flex-col">
                      <div className="p-3 border-b border-gray-100">
                        <input
                          type="text"
                          value={wooFieldSearch}
                          onChange={(e) => setWooFieldSearch(e.target.value)}
                          placeholder="Search fields..."
                          className="w-full px-3 py-2 bg-gray-50 text-gray-900 text-sm rounded border border-gray-200 focus:outline-none focus:border-[#FA7315]"
                          autoFocus
                        />
                      </div>

                      <div className="overflow-y-auto">
                        {!wooFieldSearch && (
                          <button
                            onClick={() => {
                              setSelectedWooField(null);
                              setIsWooDropdownOpen(false);
                              setWooFieldSearch('');
                            }}
                            className={`
                              w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100
                              ${selectedWooField === null ? 'bg-gray-50' : ''}
                            `}
                          >
                            <div className="text-sm text-amber-600 font-medium">No mapping (exclude field)</div>
                            <div className="text-xs text-gray-500 mt-0.5">This field will be empty for selected products</div>
                          </button>
                        )}

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
                                w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0
                                ${selectedWooField === field.value ? 'bg-gray-50' : ''}
                              `}
                            >
                              <div className="text-sm text-gray-900 font-medium">{field.label}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{field.value}</div>
                              {field.description && (
                                <div className="text-xs text-gray-400 mt-1">{field.description}</div>
                              )}
                            </button>
                          ))
                        ) : wooFieldSearch ? (
                          <div className="p-4 text-center text-gray-500 text-sm">No fields found</div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>

                {selectedWooField === null && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700">
                      This will exclude "{selectedAttribute}" from the feed for all selected products.
                    </p>
                  </div>
                )}
                {selectedWooField && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      This will map "{selectedAttribute}" to WooCommerce field "{selectedWooField}" for all selected products.
                    </p>
                  </div>
                )}
              </div>
            )}

            {selectedAttribute && overrideType === 'remove' && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-700">
                  This will remove any existing custom value for "{selectedAttribute}" and revert to shop-level defaults.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-6 py-2 bg-[#FA7315] text-white font-medium rounded-lg hover:bg-[#E5650F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
