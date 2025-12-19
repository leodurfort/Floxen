'use client';

import { useState, useEffect } from 'react';
import {
  LOCKED_FIELD_MAPPINGS,
  LOCKED_FIELD_SET,
  STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS,
  OpenAIFieldSpec,
  ProductFieldOverride,
  validateStaticValue,
} from '@productsynch/shared';
import { WooCommerceFieldSelector } from './WooCommerceFieldSelector';
import { extractTransformedPreviewValue, formatFieldValue, WooCommerceField } from '@/lib/wooCommerceFields';

type OverrideMode = 'shop_default' | 'custom_mapping' | 'static_value';

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
}: Props) {
  const requirementColors = {
    Required: 'bg-red-500/20 text-red-300 border-red-500/30',
    Recommended: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    Optional: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    Conditional: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };

  // Determine field characteristics
  const isToggleField = spec.attribute === 'enable_search' || spec.attribute === 'enable_checkout';
  const isDimensions = spec.attribute === 'dimensions';
  const isShopManagedField = [
    'seller_name', 'seller_url', 'seller_privacy_policy',
    'seller_tos', 'return_policy', 'return_window',
  ].includes(spec.attribute);

  const isLockedField = LOCKED_FIELD_SET.has(spec.attribute);
  const allowsStaticOverride = STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS.has(spec.attribute);

  // Can this field be customized at product level?
  const isFullyLocked = isLockedField && !allowsStaticOverride;
  const isReadOnly = isToggleField || isDimensions || isShopManagedField || isFullyLocked;

  // Determine current mode
  const getCurrentMode = (): OverrideMode => {
    if (!productOverride) return 'shop_default';
    return productOverride.type === 'static' ? 'static_value' : 'custom_mapping';
  };

  const [mode, setMode] = useState<OverrideMode>(getCurrentMode());
  const [staticValue, setStaticValue] = useState(productOverride?.type === 'static' ? productOverride.value : '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [customMapping, setCustomMapping] = useState(productOverride?.type === 'mapping' ? productOverride.value : null);

  // Update local state when productOverride changes
  useEffect(() => {
    const newMode = getCurrentMode();
    setMode(newMode);
    if (productOverride?.type === 'static') {
      setStaticValue(productOverride.value);
    } else if (productOverride?.type === 'mapping') {
      setCustomMapping(productOverride.value);
    }
  }, [productOverride]);

  // Handle mode change
  const handleModeChange = (newMode: OverrideMode) => {
    setMode(newMode);
    setValidationError(null);

    if (newMode === 'shop_default') {
      // Clear the override
      onOverrideChange(spec.attribute, null);
    } else if (newMode === 'custom_mapping') {
      // Initialize with shop mapping or null
      const mapping = customMapping || shopMapping;
      if (mapping) {
        onOverrideChange(spec.attribute, { type: 'mapping', value: mapping });
      }
    } else if (newMode === 'static_value') {
      // Don't save empty static value yet
      if (staticValue) {
        const validation = validateStaticValue(spec.attribute, staticValue);
        if (validation.isValid) {
          onOverrideChange(spec.attribute, { type: 'static', value: staticValue });
        } else {
          setValidationError(validation.error || 'Invalid value');
        }
      }
    }
  };

  // Handle static value change
  const handleStaticValueChange = (value: string) => {
    setStaticValue(value);

    if (!value) {
      setValidationError(null);
      return;
    }

    const validation = validateStaticValue(spec.attribute, value);
    if (validation.isValid) {
      setValidationError(null);
      onOverrideChange(spec.attribute, { type: 'static', value });
    } else {
      setValidationError(validation.error || 'Invalid value');
    }
  };

  // Handle custom mapping change
  const handleMappingChange = (wooField: string | null) => {
    setCustomMapping(wooField);
    if (wooField) {
      onOverrideChange(spec.attribute, { type: 'mapping', value: wooField });
    } else {
      // If cleared, fall back to shop default
      handleModeChange('shop_default');
    }
  };

  // Handle reset to shop default
  const handleReset = () => {
    setMode('shop_default');
    setStaticValue('');
    setCustomMapping(null);
    setValidationError(null);
    onOverrideChange(spec.attribute, null);
  };

  // Compute effective mapping for preview
  const getEffectiveMapping = (): string | null => {
    if (mode === 'static_value') return null;  // Static value doesn't use mapping
    if (mode === 'custom_mapping' && customMapping) return customMapping;
    return shopMapping || spec.wooCommerceMapping?.field || null;
  };

  // Get locked field value
  const lockedMappingValue = LOCKED_FIELD_MAPPINGS[spec.attribute];

  // Extract preview value
  const effectiveMapping = getEffectiveMapping();
  const computedPreview = effectiveMapping && !isToggleField
    ? extractTransformedPreviewValue(spec, effectiveMapping, previewProductJson, previewShopData || undefined)
    : null;

  // Use API-provided preview value if available, otherwise compute
  const previewValue = mode === 'static_value' && staticValue
    ? staticValue
    : (apiPreviewValue ?? computedPreview);
  const formattedValue = formatFieldValue(previewValue);

  // Has custom override?
  const hasOverride = productOverride !== null;

  // Preview display
  let previewDisplay = formattedValue || '';
  let previewStyle = 'text-white/80';

  if (isToggleField) {
    const isEnabled = shopMapping === 'ENABLED' || (spec.attribute === 'enable_search' && !shopMapping);
    previewDisplay = isEnabled ? 'true' : 'false';
    previewStyle = isEnabled ? 'text-[#5df0c0]' : 'text-white/40';
  } else if (!previewValue && mode !== 'static_value') {
    previewDisplay = effectiveMapping ? 'No value' : 'Not mapped';
    previewStyle = 'text-white/40';
  }

  // Mode options based on field type
  const getModeOptions = () => {
    const options = [
      { value: 'shop_default', label: 'Use Shop Default' },
    ];

    // Locked fields can only have static value (if allowed)
    if (isLockedField) {
      if (allowsStaticOverride) {
        options.push({ value: 'static_value', label: 'Set Static Value' });
      }
    } else {
      options.push({ value: 'custom_mapping', label: 'Custom Mapping' });
      options.push({ value: 'static_value', label: 'Set Static Value' });
    }

    return options;
  };

  return (
    <div className={`grid grid-cols-[1fr_280px_1fr] gap-6 py-4 border-b border-white/5 items-start transition-colors ${
      hasOverride ? 'bg-[#5df0c0]/5 hover:bg-[#5df0c0]/10' : 'hover:bg-white/[0.02]'
    }`}>
      {/* Column 1: OpenAI Field Info */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-white font-medium">{spec.attribute}</span>
          <span className={`text-xs px-2 py-0.5 rounded border ${requirementColors[spec.requirement]}`}>
            {spec.requirement}
          </span>
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

      {/* Column 2: Override Controls */}
      <div className="flex flex-col gap-2">
        {isReadOnly ? (
          // Read-only field display
          <div className="w-full px-4 py-3 bg-[#1a1d29] rounded-lg border border-white/10 flex items-center gap-2">
            <span className="text-white text-sm">
              {isToggleField ? 'Toggle (Read-only)' :
               isDimensions ? 'Auto-populated' :
               isShopManagedField ? 'Managed in Shop' :
               lockedMappingValue || 'Locked'}
            </span>
            <span className="text-white/40 cursor-help text-sm" title="This field cannot be customized at product level">
              ℹ️
            </span>
          </div>
        ) : (
          <>
            {/* Mode selector */}
            <select
              value={mode}
              onChange={(e) => handleModeChange(e.target.value as OverrideMode)}
              className="w-full px-3 py-2 bg-[#1a1d29] rounded-lg border border-white/10 text-white text-sm focus:border-[#5df0c0]/50 focus:outline-none"
            >
              {getModeOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Mode-specific input */}
            {mode === 'custom_mapping' && (
              <WooCommerceFieldSelector
                value={customMapping}
                onChange={handleMappingChange}
                openaiAttribute={spec.attribute}
                requirement={spec.requirement}
                fields={wooFields}
                loading={wooFieldsLoading}
              />
            )}

            {mode === 'static_value' && (
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  value={staticValue}
                  onChange={(e) => handleStaticValueChange(e.target.value)}
                  placeholder={`Enter ${spec.attribute} value...`}
                  className={`w-full px-3 py-2 bg-[#1a1d29] rounded-lg border text-white text-sm focus:outline-none ${
                    validationError
                      ? 'border-red-500/50 focus:border-red-500'
                      : 'border-white/10 focus:border-[#5df0c0]/50'
                  }`}
                />
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
      <div className="flex items-start pt-0">
        <div
          className="w-full !h-[40px] px-4 bg-[#1a1d29] rounded-lg border border-white/10 flex items-center overflow-hidden cursor-default"
          title={previewDisplay}
          style={{ height: '40px', minHeight: '40px', maxHeight: '40px' }}
        >
          <span className={`text-xs ${previewStyle} truncate block w-full leading-tight`}>
            {previewDisplay}
          </span>
        </div>
      </div>
    </div>
  );
}
