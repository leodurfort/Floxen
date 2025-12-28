'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  LOCKED_FIELD_MAPPINGS,
  LOCKED_FIELD_SET,
  STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS,
  OpenAIFieldSpec,
  ProductFieldOverride,
  validateStaticValue,
  StaticValueValidationResult,
  isProductEditable,
} from '@productsynch/shared';
import { extractTransformedPreviewValue, formatFieldValue, WooCommerceField, searchWooFields } from '@/lib/wooCommerceFields';

// Validate resolved value against OpenAI spec
function validateResolvedValue(
  attribute: string,
  value: any,
  requirement: string
): StaticValueValidationResult {
  // Skip validation for empty optional/recommended fields
  if (value === null || value === undefined || value === '') {
    if (requirement === 'Required') {
      return { isValid: false, error: 'Required field has no value' };
    }
    return { isValid: true };
  }

  // Convert to string for validation
  const stringValue = typeof value === 'string' ? value : String(value);
  return validateStaticValue(attribute, stringValue);
}

// Special dropdown values
const STATIC_VALUE_OPTION = '__STATIC_VALUE__';
const NO_MAPPING_OPTION = '__NO_MAPPING__';

// Helper to generate format hint from spec
function getFormatHint(spec: OpenAIFieldSpec): string {
  const hints: string[] = [];

  // Add supported values hint
  if (spec.supportedValues) {
    hints.push(`Values: ${spec.supportedValues}`);
  }

  // Add validation rules
  if (spec.validationRules && spec.validationRules.length > 0) {
    hints.push(...spec.validationRules);
  }

  // Add data type hint if no other hints
  if (hints.length === 0 && spec.dataType) {
    hints.push(`Type: ${spec.dataType}`);
  }

  return hints.join(' · ');
}

interface Props {
  spec: OpenAIFieldSpec;
  shopMapping: string | null;  // The shop-level mapping for this field
  productOverride: ProductFieldOverride | null;  // Current product override (if any)
  onOverrideChange: (attribute: string, override: ProductFieldOverride | null) => void;
  previewProductJson: any | null;
  previewShopData?: any | null;
  previewValue?: any;  // Pre-computed resolved value from API
  wooFields: WooCommerceField[];
  wooFieldsLoading: boolean;
  serverValidationErrors?: string[] | null;  // Server-side validation errors for this field
  // enable_search uses the feedEnableSearch column directly (not overrides)
  feedEnableSearch?: boolean;
  onEnableSearchChange?: (enableSearch: boolean) => void;
  shopDefaultEnableSearch?: boolean;  // Shop-level default for enable_search
}

export function ProductFieldMappingRow({
  spec,
  shopMapping,
  productOverride,
  onOverrideChange,
  previewProductJson,
  previewShopData,
  previewValue: apiPreviewValue,
  wooFields,
  wooFieldsLoading,
  serverValidationErrors,
  feedEnableSearch,
  onEnableSearchChange,
  shopDefaultEnableSearch,
}: Props) {
  const requirementColors = {
    Required: 'bg-red-50 text-red-600 border-red-200',
    Recommended: 'bg-amber-50 text-amber-600 border-amber-200',
    Optional: 'bg-blue-50 text-blue-600 border-blue-200',
    Conditional: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  // Determine field characteristics using spec properties
  const isEnableSearchField = spec.attribute === 'enable_search';
  const isDimensionOrWeightField = ['dimensions', 'length', 'width', 'height', 'weight'].includes(spec.attribute);

  const isLockedField = LOCKED_FIELD_SET.has(spec.attribute);
  const allowsStaticOverride = STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS.has(spec.attribute);

  // Use spec properties for editability instead of hardcoded field names
  // isReadOnly = true when field is NOT product-editable (per spec) AND not enable_search (which has special dropdown UI)
  const isReadOnly = !isEnableSearchField && !isProductEditable(spec);

  // Get the currently active mapping value
  const getCurrentMapping = (): string | null => {
    if (productOverride?.type === 'mapping') {
      // Null value means "no mapping" override
      return productOverride.value === null ? NO_MAPPING_OPTION : productOverride.value;
    }
    if (productOverride?.type === 'static') return STATIC_VALUE_OPTION;
    return shopMapping || spec.wooCommerceMapping?.field || null;
  };

  // State
  const [selectedValue, setSelectedValue] = useState<string | null>(getCurrentMapping());
  const [staticValue, setStaticValue] = useState(productOverride?.type === 'static' ? (productOverride.value || '') : '');
  const [draftStaticValue, setDraftStaticValue] = useState(staticValue);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isStaticMode, setIsStaticMode] = useState(productOverride?.type === 'static');

  // Custom dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync state when productOverride changes from parent
  useEffect(() => {
    const newMapping = getCurrentMapping();
    setSelectedValue(newMapping);
    if (productOverride?.type === 'static') {
      setStaticValue(productOverride.value || '');
      setDraftStaticValue(productOverride.value || '');
      setIsStaticMode(true);
    } else {
      setIsStaticMode(false);
    }
  }, [productOverride, shopMapping]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setSearchQuery('');
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

  // Validate the draft static value
  const validateDraft = (value: string): boolean => {
    if (!value) {
      setValidationError('Value is required');
      return false;
    }
    const validation = validateStaticValue(spec.attribute, value);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid value');
      return false;
    }
    setValidationError(null);
    return true;
  };

  // Check if draft is valid (for enabling tick button)
  const isDraftValid = useMemo(() => {
    if (!draftStaticValue) return false;
    const validation = validateStaticValue(spec.attribute, draftStaticValue);
    return validation.isValid;
  }, [draftStaticValue, spec.attribute]);

  // Handle dropdown selection change
  const handleDropdownChange = (value: string) => {
    setSelectedValue(value);
    setIsDropdownOpen(false);
    setSearchQuery('');

    if (value === STATIC_VALUE_OPTION) {
      // Switch to static value mode
      setIsStaticMode(true);
      setDraftStaticValue(staticValue);
      setValidationError(null);
    } else if (value === NO_MAPPING_OPTION) {
      // No mapping override - exclude this field for this product
      setIsStaticMode(false);
      onOverrideChange(spec.attribute, { type: 'mapping', value: null });
    } else {
      // Select a WooCommerce field
      setIsStaticMode(false);

      // Get effective shop-level mapping
      const shopDefault = shopMapping || spec.wooCommerceMapping?.field || null;

      // If selecting same as shop default, remove override instead of creating one
      if (value === shopDefault) {
        onOverrideChange(spec.attribute, null);
      } else {
        onOverrideChange(spec.attribute, { type: 'mapping', value });
      }
    }
  };

  // Handle static value input change (no auto-save)
  const handleStaticInputChange = (value: string) => {
    setDraftStaticValue(value);
    // Clear error while typing
    if (validationError) {
      setValidationError(null);
    }
  };

  // Handle static value save (tick button click)
  const handleStaticValueSave = () => {
    if (validateDraft(draftStaticValue)) {
      setStaticValue(draftStaticValue);
      onOverrideChange(spec.attribute, { type: 'static', value: draftStaticValue });
    }
  };

  // Handle reset to shop default
  const handleReset = () => {
    setSelectedValue(shopMapping || spec.wooCommerceMapping?.field || null);
    setStaticValue('');
    setDraftStaticValue('');
    setIsStaticMode(false);
    setValidationError(null);
    onOverrideChange(spec.attribute, null);
  };

  // Get locked field value
  const lockedMappingValue = LOCKED_FIELD_MAPPINGS[spec.attribute];

  // Has custom override?
  const hasOverride = productOverride !== null;

  // Compute preview - only show saved values, not draft
  const getEffectiveMapping = (): string | null => {
    if (productOverride?.type === 'static') return null;
    if (productOverride?.type === 'mapping') {
      // Null value means "no mapping" - return null (field excluded)
      return productOverride.value;
    }
    return shopMapping || spec.wooCommerceMapping?.field || null;
  };

  // Check if this is a "no mapping" override (null value)
  const isNoMappingOverride = productOverride?.type === 'mapping' && productOverride.value === null;

  const effectiveMapping = getEffectiveMapping();
  const computedPreview = effectiveMapping && !isEnableSearchField && !spec.isFeatureDisabled
    ? extractTransformedPreviewValue(spec, effectiveMapping, previewProductJson, previewShopData || undefined)
    : null;

  // Use API preview for saved static values, compute for mappings
  const previewValue = productOverride?.type === 'static'
    ? staticValue  // Show saved static value (not draft)
    : (apiPreviewValue ?? computedPreview);
  const formattedValue = formatFieldValue(previewValue);

  // Validate the resolved value (for mapped values, not static - static is validated separately)
  // Prefer server-side validation errors when available (more comprehensive)
  const resolvedValueValidation = useMemo(() => {
    // Don't validate if in static mode (user is editing)
    if (isStaticMode) return { isValid: true };
    // Don't validate enable_search or feature-disabled fields (they have special handling)
    if (isEnableSearchField || spec.isFeatureDisabled) return { isValid: true };

    // Use server-side validation errors if available (from validateFeedEntry)
    if (serverValidationErrors && serverValidationErrors.length > 0) {
      return {
        isValid: false,
        error: serverValidationErrors.join('; ')
      };
    }

    // Fall back to client-side validation
    return validateResolvedValue(spec.attribute, previewValue, spec.requirement);
  }, [spec.attribute, spec.requirement, spec.isFeatureDisabled, previewValue, isStaticMode, isEnableSearchField, serverValidationErrors]);

  // Preview display
  let previewDisplay = formattedValue || '';
  let previewStyle = 'text-gray-700';

  if (isEnableSearchField) {
    // For enable_search, show the current value from feedEnableSearch column
    previewDisplay = feedEnableSearch ? 'true' : 'false';
    previewStyle = feedEnableSearch ? 'text-[#FA7315]' : 'text-gray-400';
  } else if (spec.isFeatureDisabled) {
    // Feature disabled fields always show false
    previewDisplay = 'false';
    previewStyle = 'text-gray-400';
  } else if (isNoMappingOverride) {
    // "No mapping" override - show empty
    previewDisplay = '';
    previewStyle = 'text-gray-400';
  } else if (!previewValue && !isStaticMode) {
    // "No value" when mapped but no data, empty when not mapped
    previewDisplay = effectiveMapping ? 'No value' : '';
    previewStyle = 'text-gray-400';
  } else if (isStaticMode && !productOverride) {
    // Static mode but no saved value yet
    previewDisplay = 'Enter value and click ✓';
    previewStyle = 'text-gray-400 italic';
  }

  // Find label for current selection
  const getSelectionLabel = (value: string | null): string => {
    if (!value) return 'Select field or value';
    if (value === STATIC_VALUE_OPTION) return '+ Set Static Value';
    if (value === NO_MAPPING_OPTION) return 'No mapping (excluded)';
    const field = wooFields.find(f => f.value === value);
    return field?.label || value;
  };

  return (
    <div className={`grid grid-cols-[1fr_280px_1fr] gap-6 py-4 border-b border-gray-100 items-start transition-colors ${
      hasOverride ? 'bg-[#FA7315]/5 hover:bg-[#FA7315]/10' : 'hover:bg-gray-50/50'
    }`}>
      {/* Column 1: OpenAI Field Info */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-gray-900 font-medium">{spec.attribute}</span>
          {isDimensionOrWeightField && (
            <div className="relative group">
              <span className="text-gray-500 cursor-help text-sm">ℹ️</span>
              <div className="absolute left-0 top-6 hidden group-hover:block z-10 w-64 p-3 bg-white border border-gray-200 rounded-lg shadow-lg text-xs text-gray-700">
                <div className="font-semibold text-gray-900 mb-1">Unit from WooCommerce</div>
                <div>The unit is automatically derived from your WooCommerce store settings.</div>
              </div>
            </div>
          )}
          <span className={`text-xs px-2 py-0.5 rounded border ${requirementColors[spec.requirement]}`}>
            {spec.requirement}
          </span>
          {/* Info Icon with Tooltip for Conditional Fields */}
          {spec.requirement === 'Conditional' && (
            <div className="relative group">
              <span className="text-amber-500 cursor-help text-sm">ℹ️</span>
              <div className="absolute left-0 top-6 hidden group-hover:block z-10 w-64 p-3 bg-white border border-amber-200 rounded-lg shadow-lg text-xs text-gray-700">
                <div className="font-semibold text-amber-600 mb-1">Conditional Field</div>
                {spec.dependencies ? (
                  <div>
                    <span className="text-gray-500">Required when: </span>
                    <span className="text-gray-700">{spec.dependencies}</span>
                  </div>
                ) : (
                  <span className="text-gray-500">This field is conditionally required based on other fields.</span>
                )}
              </div>
            </div>
          )}
          {hasOverride && (
            <span className="text-xs px-2 py-0.5 rounded bg-[#FA7315]/10 text-[#FA7315] border border-[#FA7315]/30">
              Custom
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600">{spec.description}</p>
        <div className="text-xs text-gray-400">
          {spec.supportedValues ? (
            <>Values: <span className="text-gray-500">{spec.supportedValues}</span></>
          ) : (
            <>Example: <span className="text-gray-500">{spec.example}</span></>
          )}
        </div>
      </div>

      {/* Column 2: Mapping Controls */}
      <div className="flex flex-col gap-2">
        {isEnableSearchField ? (
          // enable_search - uses feedEnableSearch column directly (not overrides)
          <>
            <select
              value={feedEnableSearch ? 'true' : 'false'}
              onChange={(e) => {
                onEnableSearchChange?.(e.target.value === 'true');
              }}
              className="w-full px-3 py-2 bg-white rounded-lg border border-gray-300 text-gray-900 text-sm focus:border-[#FA7315] focus:outline-none"
            >
              <option value="true">Enabled (true)</option>
              <option value="false">Disabled (false)</option>
            </select>
            {/* Reset button when enable_search differs from shop default */}
            {shopDefaultEnableSearch !== undefined && feedEnableSearch !== shopDefaultEnableSearch && (
              <button
                onClick={() => onEnableSearchChange?.(shopDefaultEnableSearch)}
                className="text-xs text-gray-500 hover:text-gray-700 underline text-left"
              >
                Reset to Shop Default ({shopDefaultEnableSearch ? 'Enabled' : 'Disabled'})
              </button>
            )}
          </>
        ) : isReadOnly ? (
          // Read-only field display - use spec properties for display text
          <div className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 flex items-start gap-2">
            <span className="text-gray-900 text-sm font-medium">
              {spec.isFeatureDisabled ? 'Feature coming soon' :
               spec.isAutoPopulated ? 'Auto-populated' :
               spec.isShopManaged ? 'Managed in Shops page' :
               lockedMappingValue || 'Locked'}
            </span>
            <div className="relative group mt-[2px]">
              <span className="text-gray-500 cursor-help text-sm">ℹ️</span>
              <div className="absolute left-0 top-6 hidden group-hover:block z-10 w-72 p-3 bg-white border border-gray-200 rounded-lg shadow-lg text-xs text-gray-700">
                {spec.isFeatureDisabled ? (
                  <div>
                    <div className="font-semibold text-gray-900 mb-1">Coming Soon</div>
                    <div>This functionality will be available in a future update.</div>
                  </div>
                ) : spec.isAutoPopulated ? (
                  <div>
                    <div className="font-semibold text-gray-900 mb-1">Auto-populated field</div>
                    <div>This value is computed automatically from other product data.</div>
                  </div>
                ) : spec.isShopManaged ? (
                  <div>
                    <div className="font-semibold text-gray-900 mb-1">Update in Shops page</div>
                    <div className="mb-2">Edit this value from the Shops page to change the feed output.</div>
                    <Link href="/shops" className="text-[#FA7315] underline">Go to Shops</Link>
                  </div>
                ) : (
                  <div>
                    <div className="font-semibold text-gray-900 mb-1">Managed automatically</div>
                    <div>This mapping is predefined and cannot be edited.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Custom styled dropdown */}
            <div className="relative w-full" ref={dropdownRef}>
              {/* Trigger Button */}
              <button
                onClick={() => !wooFieldsLoading && setIsDropdownOpen(!isDropdownOpen)}
                disabled={wooFieldsLoading}
                className={`w-full h-[40px] px-4 py-2.5 text-left bg-white hover:bg-gray-50 rounded-lg border border-gray-300 transition-colors flex items-center justify-between ${
                  wooFieldsLoading ? 'cursor-not-allowed opacity-60' : ''
                }`}
              >
                <span className={`text-sm truncate ${
                  isStaticMode ? 'text-[#FA7315]' :
                  selectedValue === NO_MAPPING_OPTION ? 'text-amber-600' :
                  selectedValue ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {wooFieldsLoading ? 'Loading fields...' : getSelectionLabel(isStaticMode ? STATIC_VALUE_OPTION : selectedValue)}
                </span>
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Panel */}
              {isDropdownOpen && !wooFieldsLoading && (
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

                  {/* Options List */}
                  <div className="overflow-y-auto">
                    {/* No mapping option - only show when there's a shop mapping to override */}
                    {!searchQuery && (shopMapping || spec.wooCommerceMapping?.field) && (
                      <button
                        onClick={() => handleDropdownChange(NO_MAPPING_OPTION)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                          selectedValue === NO_MAPPING_OPTION ? 'bg-gray-50' : ''
                        }`}
                      >
                        <div className="text-sm text-amber-600 font-medium">No mapping (exclude field)</div>
                        <div className="text-xs text-gray-500 mt-0.5">This field will be empty for this product</div>
                      </button>
                    )}

                    {/* Static value option */}
                    {!searchQuery && (allowsStaticOverride || !isLockedField) && (
                      <button
                        onClick={() => handleDropdownChange(STATIC_VALUE_OPTION)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                          isStaticMode ? 'bg-gray-50' : ''
                        }`}
                      >
                        <div className="text-sm text-[#FA7315] font-medium">+ Set Static Value</div>
                        <div className="text-xs text-gray-500 mt-0.5">Enter a custom value for this product</div>
                      </button>
                    )}

                    {/* WooCommerce fields */}
                    {!isLockedField && filteredFields.length > 0 ? (
                      filteredFields.map((field) => (
                        <button
                          key={field.value}
                          onClick={() => handleDropdownChange(field.value)}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                            selectedValue === field.value && !isStaticMode ? 'bg-gray-50' : ''
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

            {/* Static value input with validation button */}
            {isStaticMode && (
              <div className="flex flex-col gap-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draftStaticValue}
                    onChange={(e) => handleStaticInputChange(e.target.value)}
                    placeholder={`Enter ${spec.attribute} value...`}
                    className={`flex-1 px-3 py-2 bg-white rounded-lg border text-gray-900 text-sm focus:outline-none ${
                      validationError
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-gray-300 focus:border-[#FA7315]'
                    }`}
                  />
                  <button
                    onClick={handleStaticValueSave}
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
                {/* Format hint - always visible in static mode */}
                {getFormatHint(spec) && (
                  <span className="text-xs text-gray-500">{getFormatHint(spec)}</span>
                )}
                {validationError && (
                  <span className="text-xs text-red-600">{validationError}</span>
                )}
              </div>
            )}

            {/* Reset button when has override */}
            {hasOverride && (
              <button
                onClick={handleReset}
                className="text-xs text-gray-500 hover:text-gray-700 underline text-left"
              >
                Reset to Shop Default
              </button>
            )}
          </>
        )}
      </div>

      {/* Column 3: Preview */}
      <div className="flex flex-col gap-1">
        <div
          className={`w-full !h-[40px] px-4 bg-gray-50 rounded-lg border flex items-center overflow-hidden cursor-default ${
            !resolvedValueValidation.isValid
              ? 'border-amber-300'
              : 'border-gray-200'
          }`}
          title={previewDisplay}
          style={{ height: '40px', minHeight: '40px', maxHeight: '40px' }}
        >
          {!resolvedValueValidation.isValid && (
            <span className="text-amber-500 mr-2 flex-shrink-0" title={resolvedValueValidation.error}>
              ⚠️
            </span>
          )}
          <span className={`text-xs ${previewStyle} truncate block w-full leading-tight`}>
            {previewDisplay}
          </span>
        </div>
        {!resolvedValueValidation.isValid && (
          <span className="text-xs text-amber-600">
            {resolvedValueValidation.error}
          </span>
        )}
      </div>
    </div>
  );
}
