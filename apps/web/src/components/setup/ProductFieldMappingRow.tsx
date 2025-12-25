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
}: Props) {
  const requirementColors = {
    Required: 'bg-red-500/20 text-red-300 border-red-500/30',
    Recommended: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    Optional: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    Conditional: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };

  // Determine field characteristics
  const isEnableSearchField = spec.attribute === 'enable_search';
  const isEnableCheckoutField = spec.attribute === 'enable_checkout';
  const isDimensions = spec.attribute === 'dimensions';
  const isDimensionOrWeightField = ['dimensions', 'length', 'width', 'height', 'weight'].includes(spec.attribute);
  const isConditionField = spec.attribute === 'condition';
  const isShopManagedField = [
    'seller_name', 'seller_url', 'seller_privacy_policy',
    'seller_tos', 'return_policy', 'return_window',
  ].includes(spec.attribute);

  const isLockedField = LOCKED_FIELD_SET.has(spec.attribute);
  const allowsStaticOverride = STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS.has(spec.attribute);
  // Fields with hardcoded transforms that ignore the mapping selection
  const isTransformLockedField = spec.attribute === 'sale_price_effective_date';

  // Can this field be customized at product level?
  const isFullyLocked = isLockedField && !allowsStaticOverride;
  // enable_search is editable, enable_checkout is disabled (coming soon)
  const isReadOnly = isEnableCheckoutField || isDimensions || isShopManagedField || isFullyLocked || isTransformLockedField;

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
      // Select a WooCommerce field - create mapping override
      setIsStaticMode(false);
      onOverrideChange(spec.attribute, { type: 'mapping', value });
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
  const computedPreview = effectiveMapping && !isEnableSearchField && !isEnableCheckoutField
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
    // Don't validate enable_search/enable_checkout (they have special handling)
    if (isEnableSearchField || isEnableCheckoutField) return { isValid: true };

    // Use server-side validation errors if available (from validateFeedEntry)
    if (serverValidationErrors && serverValidationErrors.length > 0) {
      return {
        isValid: false,
        error: serverValidationErrors.join('; ')
      };
    }

    // Fall back to client-side validation
    return validateResolvedValue(spec.attribute, previewValue, spec.requirement);
  }, [spec.attribute, spec.requirement, previewValue, isStaticMode, isEnableSearchField, isEnableCheckoutField, serverValidationErrors]);

  // Preview display
  let previewDisplay = formattedValue || '';
  let previewStyle = 'text-white/80';

  if (isEnableSearchField) {
    // For enable_search, show the current value (from override or API preview)
    const currentValue = productOverride?.type === 'static' ? productOverride.value : apiPreviewValue;
    previewDisplay = currentValue === 'true' ? 'true' : currentValue === 'false' ? 'false' : 'true';
    previewStyle = previewDisplay === 'true' ? 'text-[#5df0c0]' : 'text-white/40';
  } else if (isEnableCheckoutField) {
    // enable_checkout is always false (feature not yet available)
    previewDisplay = 'false';
    previewStyle = 'text-white/40';
  } else if (isNoMappingOverride) {
    // "No mapping" override - show empty
    previewDisplay = '';
    previewStyle = 'text-white/40';
  } else if (!previewValue && !isStaticMode) {
    // "No value" when mapped but no data, empty when not mapped
    previewDisplay = effectiveMapping ? 'No value' : '';
    previewStyle = 'text-white/40';
  } else if (isStaticMode && !productOverride) {
    // Static mode but no saved value yet
    previewDisplay = 'Enter value and click ✓';
    previewStyle = 'text-white/40 italic';
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
    <div className={`grid grid-cols-[1fr_280px_1fr] gap-6 py-4 border-b border-white/5 items-start transition-colors ${
      hasOverride ? 'bg-[#5df0c0]/5 hover:bg-[#5df0c0]/10' : 'hover:bg-white/[0.02]'
    }`}>
      {/* Column 1: OpenAI Field Info */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-white font-medium">{spec.attribute}</span>
          {isDimensionOrWeightField && (
            <div className="relative group">
              <span className="text-white/60 cursor-help text-sm">ℹ️</span>
              <div className="absolute left-0 top-6 hidden group-hover:block z-10 w-64 p-3 bg-gray-900 border border-white/20 rounded-lg shadow-lg text-xs text-white/80">
                <div className="font-semibold text-white mb-1">Unit from WooCommerce</div>
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
              <span className="text-yellow-400 cursor-help text-sm">ℹ️</span>
              <div className="absolute left-0 top-6 hidden group-hover:block z-10 w-64 p-3 bg-gray-900 border border-yellow-400/30 rounded-lg shadow-lg text-xs text-white/80">
                <div className="font-semibold text-yellow-300 mb-1">Conditional Field</div>
                {spec.dependencies ? (
                  <div>
                    <span className="text-white/60">Required when: </span>
                    <span className="text-white/70">{spec.dependencies}</span>
                  </div>
                ) : (
                  <span className="text-white/60">This field is conditionally required based on other fields.</span>
                )}
              </div>
            </div>
          )}
          {hasOverride && (
            <span className="text-xs px-2 py-0.5 rounded bg-[#5df0c0]/20 text-[#5df0c0] border border-[#5df0c0]/30">
              Custom
            </span>
          )}
        </div>
        <p className="text-sm text-white/60">{spec.description}</p>
        <div className="text-xs text-white/40">
          {spec.supportedValues ? (
            <>Values: <span className="text-white/60">{spec.supportedValues}</span></>
          ) : (
            <>Example: <span className="text-white/60">{spec.example}</span></>
          )}
        </div>
      </div>

      {/* Column 2: Mapping Controls */}
      <div className="flex flex-col gap-2">
        {isEnableSearchField ? (
          // enable_search - Simple true/false toggle dropdown
          <>
            <select
              value={productOverride?.type === 'static' ? productOverride.value : (apiPreviewValue || 'true')}
              onChange={(e) => {
                onOverrideChange(spec.attribute, { type: 'static', value: e.target.value });
              }}
              className="w-full px-3 py-2 bg-[#1a1d29] rounded-lg border border-white/10 text-white text-sm focus:border-[#5df0c0]/50 focus:outline-none"
            >
              <option value="true">Enabled (true)</option>
              <option value="false">Disabled (false)</option>
            </select>
            {hasOverride && (
              <button
                onClick={handleReset}
                className="text-xs text-white/50 hover:text-white/80 underline text-left"
              >
                Reset to Shop Default
              </button>
            )}
          </>
        ) : isReadOnly ? (
          // Read-only field display
          <div className="w-full px-4 py-3 bg-[#1a1d29] rounded-lg border border-white/10 flex items-start gap-2">
            <span className="text-white text-sm font-medium">
              {isEnableCheckoutField ? 'Feature coming soon' :
               isDimensions ? 'Auto-populated' :
               isShopManagedField ? 'Managed in Shops page' :
               isTransformLockedField ? 'Auto-combined' :
               isConditionField ? 'Defaults to "new"' :
               lockedMappingValue || 'Locked'}
            </span>
            <div className="relative group mt-[2px]">
              <span className="text-white/60 cursor-help text-sm">ℹ️</span>
              <div className="absolute left-0 top-6 hidden group-hover:block z-10 w-72 p-3 bg-gray-900 border border-white/20 rounded-lg shadow-lg text-xs text-white/80">
                {isEnableCheckoutField ? (
                  <div>
                    <div className="font-semibold text-white mb-1">Coming Soon</div>
                    <div>Checkout functionality will be available in a future update.</div>
                  </div>
                ) : isDimensions ? (
                  <div>
                    <div className="font-semibold text-white mb-1">Auto-filled dimensions</div>
                    <div>Populates automatically when length, width, and height are available.</div>
                  </div>
                ) : isShopManagedField ? (
                  <div>
                    <div className="font-semibold text-white mb-1">Update in Shops page</div>
                    <div className="mb-2">Edit this value from the Shops page to change the feed output.</div>
                    <Link href="/shops" className="text-[#5df0c0] underline">Go to Shops</Link>
                  </div>
                ) : isTransformLockedField ? (
                  <div>
                    <div className="font-semibold text-white mb-1">Auto-combined field</div>
                    <div>Combines date_on_sale_from and date_on_sale_to from WooCommerce.</div>
                  </div>
                ) : isConditionField ? (
                  <div>
                    <div className="font-semibold text-white mb-1">Product Condition</div>
                    <div>Automatically set to "new" for all products. Most WooCommerce stores sell new products.</div>
                  </div>
                ) : (
                  <div>
                    <div className="font-semibold text-white mb-1">Managed automatically</div>
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
                className={`w-full h-[40px] px-4 py-2.5 text-left bg-[#252936] hover:bg-[#2d3142] rounded-lg border transition-colors flex items-center justify-between border-white/10 ${
                  wooFieldsLoading ? 'cursor-not-allowed opacity-60' : ''
                }`}
              >
                <span className={`text-sm truncate ${
                  isStaticMode ? 'text-[#5df0c0]' :
                  selectedValue === NO_MAPPING_OPTION ? 'text-amber-400' :
                  selectedValue ? 'text-white' : 'text-white/60'
                }`}>
                  {wooFieldsLoading ? 'Loading fields...' : getSelectionLabel(isStaticMode ? STATIC_VALUE_OPTION : selectedValue)}
                </span>
                <svg className="w-4 h-4 text-white/40 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Panel */}
              {isDropdownOpen && !wooFieldsLoading && (
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

                  {/* Options List */}
                  <div className="overflow-y-auto">
                    {/* No mapping option - only show when there's a shop mapping to override */}
                    {!searchQuery && (shopMapping || spec.wooCommerceMapping?.field) && (
                      <button
                        onClick={() => handleDropdownChange(NO_MAPPING_OPTION)}
                        className={`w-full px-4 py-3 text-left hover:bg-[#2d3142] transition-colors border-b border-white/10 ${
                          selectedValue === NO_MAPPING_OPTION ? 'bg-[#2d3142]' : ''
                        }`}
                      >
                        <div className="text-sm text-amber-400 font-medium">No mapping (exclude field)</div>
                        <div className="text-xs text-white/40 mt-0.5">This field will be empty for this product</div>
                      </button>
                    )}

                    {/* Static value option */}
                    {!searchQuery && (allowsStaticOverride || !isLockedField) && (
                      <button
                        onClick={() => handleDropdownChange(STATIC_VALUE_OPTION)}
                        className={`w-full px-4 py-3 text-left hover:bg-[#2d3142] transition-colors border-b border-white/10 ${
                          isStaticMode ? 'bg-[#2d3142]' : ''
                        }`}
                      >
                        <div className="text-sm text-[#5df0c0] font-medium">+ Set Static Value</div>
                        <div className="text-xs text-white/40 mt-0.5">Enter a custom value for this product</div>
                      </button>
                    )}

                    {/* WooCommerce fields */}
                    {!isLockedField && filteredFields.length > 0 ? (
                      filteredFields.map((field) => (
                        <button
                          key={field.value}
                          onClick={() => handleDropdownChange(field.value)}
                          className={`w-full px-4 py-3 text-left hover:bg-[#2d3142] transition-colors border-b border-white/5 last:border-0 ${
                            selectedValue === field.value && !isStaticMode ? 'bg-[#2d3142]' : ''
                          }`}
                        >
                          <div className="text-sm text-white font-medium">{field.label}</div>
                          <div className="text-xs text-white/40 mt-0.5">{field.value}</div>
                          {field.description && (
                            <div className="text-xs text-white/30 mt-1">{field.description}</div>
                          )}
                        </button>
                      ))
                    ) : !isLockedField && searchQuery ? (
                      <div className="p-4 text-center text-white/40 text-sm">No fields found</div>
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
                    className={`flex-1 px-3 py-2 bg-[#1a1d29] rounded-lg border text-white text-sm focus:outline-none ${
                      validationError
                        ? 'border-red-500/50 focus:border-red-500'
                        : 'border-white/10 focus:border-[#5df0c0]/50'
                    }`}
                  />
                  <button
                    onClick={handleStaticValueSave}
                    disabled={!isDraftValid}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      isDraftValid
                        ? 'bg-[#5df0c0]/20 border-[#5df0c0]/50 text-[#5df0c0] hover:bg-[#5df0c0]/30 cursor-pointer'
                        : 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                    }`}
                    title={isDraftValid ? 'Save static value' : 'Enter a valid value first'}
                  >
                    ✓
                  </button>
                </div>
                {/* Format hint - always visible in static mode */}
                {getFormatHint(spec) && (
                  <span className="text-xs text-white/50">{getFormatHint(spec)}</span>
                )}
                {validationError && (
                  <span className="text-xs text-red-400">{validationError}</span>
                )}
              </div>
            )}

            {/* Reset button when has override */}
            {hasOverride && (
              <button
                onClick={handleReset}
                className="text-xs text-white/50 hover:text-white/80 underline text-left"
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
          className={`w-full !h-[40px] px-4 bg-[#1a1d29] rounded-lg border flex items-center overflow-hidden cursor-default ${
            !resolvedValueValidation.isValid
              ? 'border-amber-500/50'
              : 'border-white/10'
          }`}
          title={previewDisplay}
          style={{ height: '40px', minHeight: '40px', maxHeight: '40px' }}
        >
          {!resolvedValueValidation.isValid && (
            <span className="text-amber-400 mr-2 flex-shrink-0" title={resolvedValueValidation.error}>
              ⚠️
            </span>
          )}
          <span className={`text-xs ${previewStyle} truncate block w-full leading-tight`}>
            {previewDisplay}
          </span>
        </div>
        {!resolvedValueValidation.isValid && (
          <span className="text-xs text-amber-400">
            {resolvedValueValidation.error}
          </span>
        )}
      </div>
    </div>
  );
}
