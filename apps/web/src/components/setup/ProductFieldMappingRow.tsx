'use client';

import { useMemo } from 'react';
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
import { extractTransformedPreviewValue, formatFieldValue, WooCommerceField } from '@/lib/wooCommerceFields';
import { Tooltip, StatusBadge } from '@/components/ui/Tooltip';
import { DescriptionPopover } from '@/components/ui/DescriptionPopover';
import { ProductMappingSelector } from './ProductMappingSelector';

function validateResolvedValue(
  attribute: string,
  value: any,
  requirement: string
): StaticValueValidationResult {
  if (value === null || value === undefined || value === '') {
    if (requirement === 'Required') {
      return { isValid: false, error: 'Required field has no value' };
    }
    return { isValid: true };
  }
  const stringValue = typeof value === 'string' ? value : String(value);
  return validateStaticValue(attribute, stringValue);
}

interface Props {
  spec: OpenAIFieldSpec;
  shopMapping: string | null;
  productOverride: ProductFieldOverride | null;
  onOverrideChange: (attribute: string, override: ProductFieldOverride | null) => void;
  previewProductJson: any | null;
  previewShopData?: any | null;
  previewValue?: any;
  wooFields: WooCommerceField[];
  wooFieldsLoading: boolean;
  serverValidationErrors?: string[] | null;
  feedEnableSearch?: boolean;
  onEnableSearchChange?: (enableSearch: boolean) => void;
  shopDefaultEnableSearch?: boolean;
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
  const isEnableSearchField = spec.attribute === 'enable_search';
  const isDimensionOrWeightField = ['dimensions', 'length', 'width', 'height', 'weight'].includes(spec.attribute);
  const isLockedField = LOCKED_FIELD_SET.has(spec.attribute);
  const allowsStaticOverride = STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS.has(spec.attribute);
  const isReadOnly = !isEnableSearchField && !isProductEditable(spec);
  const lockedMappingValue = LOCKED_FIELD_MAPPINGS[spec.attribute];
  const hasOverride = productOverride !== null;

  const isStaticMode = productOverride?.type === 'static';
  const isNoMappingMode = productOverride?.type === 'mapping' && productOverride.value === null;
  const staticValue = isStaticMode ? (productOverride.value || '') : '';

  const getCurrentFieldValue = (): string | null => {
    if (productOverride?.type === 'mapping' && productOverride.value !== null) {
      return productOverride.value;
    }
    if (productOverride?.type === 'static' || isNoMappingMode) {
      return null;
    }
    return shopMapping || spec.wooCommerceMapping?.field || null;
  };

  const getEffectiveMapping = (): string | null => {
    if (productOverride?.type === 'static') return null;
    if (productOverride?.type === 'mapping') return productOverride.value;
    return shopMapping || spec.wooCommerceMapping?.field || null;
  };

  const effectiveMapping = getEffectiveMapping();
  const computedPreview = effectiveMapping && !isEnableSearchField && !spec.isFeatureDisabled
    ? extractTransformedPreviewValue(spec, effectiveMapping, previewProductJson, previewShopData || undefined)
    : null;

  const previewValue = productOverride?.type === 'static'
    ? staticValue
    : (apiPreviewValue ?? computedPreview);
  const formattedValue = formatFieldValue(previewValue);

  const resolvedValueValidation = useMemo(() => {
    if (isStaticMode) return { isValid: true };
    if (isEnableSearchField || spec.isFeatureDisabled) return { isValid: true };

    if (serverValidationErrors && serverValidationErrors.length > 0) {
      return { isValid: false, error: serverValidationErrors.join('; ') };
    }

    return validateResolvedValue(spec.attribute, previewValue, spec.requirement);
  }, [spec.attribute, spec.requirement, spec.isFeatureDisabled, previewValue, isStaticMode, isEnableSearchField, serverValidationErrors]);

  let previewDisplay = formattedValue || '';
  let previewStyle = 'text-gray-700';

  if (isEnableSearchField) {
    previewDisplay = feedEnableSearch ? 'true' : 'false';
    previewStyle = feedEnableSearch ? 'text-[#FA7315]' : 'text-gray-400';
  } else if (spec.isFeatureDisabled) {
    previewDisplay = 'false';
    previewStyle = 'text-gray-400';
  } else if (isNoMappingMode) {
    previewDisplay = '(excluded)';
    previewStyle = 'text-gray-400 italic';
  } else if (!previewValue && !isStaticMode) {
    previewDisplay = effectiveMapping ? 'No value' : '-';
    previewStyle = 'text-gray-400';
  }

  const handleFieldSelect = (field: string) => {
    const shopDefault = shopMapping || spec.wooCommerceMapping?.field || null;
    if (field === shopDefault) {
      onOverrideChange(spec.attribute, null);
    } else {
      onOverrideChange(spec.attribute, { type: 'mapping', value: field });
    }
  };

  const handleNoMappingSelect = () => {
    onOverrideChange(spec.attribute, { type: 'mapping', value: null });
  };

  const handleStaticValueSave = (value: string) => {
    onOverrideChange(spec.attribute, { type: 'static', value });
  };

  const handleReset = () => {
    onOverrideChange(spec.attribute, null);
  };

  const getReadOnlyDisplayText = () => {
    if (spec.isFeatureDisabled) return 'Feature coming soon';
    if (spec.isAutoPopulated) return 'Auto-populated';
    if (spec.isShopManaged) return 'Managed in Stores page';
    return lockedMappingValue || 'Locked';
  };

  const getReadOnlyTooltipContent = () => {
    if (spec.isFeatureDisabled) {
      return (
        <div>
          <div className="font-semibold mb-1">Coming Soon</div>
          <div>This functionality will be available in a future update.</div>
        </div>
      );
    }
    if (spec.isAutoPopulated) {
      return (
        <div>
          <div className="font-semibold mb-1">Auto-populated field</div>
          <div>This value is computed automatically from other product data.</div>
        </div>
      );
    }
    if (spec.isShopManaged) {
      return (
        <div>
          <div className="font-semibold mb-1">Update in Stores page</div>
          <div className="mb-2">Edit this value from the Stores page to change the feed output.</div>
          <Link href="/shops" className="text-[#FA7315] underline">Go to Stores</Link>
        </div>
      );
    }
    return (
      <div>
        <div className="font-semibold mb-1">Managed automatically</div>
        <div>This mapping is predefined and cannot be edited.</div>
      </div>
    );
  };

  return (
    <tr className={`border-b border-gray-200 align-top transition-colors ${
      hasOverride ? 'bg-[#FA7315]/5 hover:bg-[#FA7315]/10' : 'hover:bg-gray-50'
    }`}>
      <td className="py-4 px-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-900 font-medium">{spec.attribute}</span>
            {isDimensionOrWeightField && (
              <Tooltip
                content={
                  <div>
                    <div className="font-semibold mb-1">Unit from WooCommerce</div>
                    <div>The unit is automatically derived from your WooCommerce store settings.</div>
                  </div>
                }
                side="right"
              >
                <span className="text-[#FA7315] cursor-help text-sm font-medium">i</span>
              </Tooltip>
            )}
            {spec.requirement === 'Conditional' && spec.dependencies && (
              <Tooltip
                content={
                  <div>
                    <div className="font-semibold text-amber-600 mb-1">Conditional Field</div>
                    <div>{spec.dependencies}</div>
                  </div>
                }
                side="right"
              >
                <span className="text-[#FA7315] cursor-help text-sm font-medium">i</span>
              </Tooltip>
            )}
          </div>
          <DescriptionPopover
            description={spec.description}
            example={spec.example || null}
            values={spec.supportedValues || null}
          />
        </div>
      </td>

      <td className="py-4 px-4">
        <div className="flex flex-col gap-1">
          <StatusBadge status={spec.requirement} />
          {hasOverride && (
            <span className="text-xs px-2 py-0.5 rounded bg-[#FA7315]/10 text-[#FA7315] border border-[#FA7315]/30 inline-flex w-fit">
              Custom
            </span>
          )}
        </div>
      </td>

      <td className="py-4 px-4">
        {isEnableSearchField ? (
          <div className="flex flex-col gap-2">
            <select
              value={feedEnableSearch ? 'true' : 'false'}
              onChange={(e) => onEnableSearchChange?.(e.target.value === 'true')}
              className="w-full h-[40px] px-3 py-2 bg-white rounded-lg border border-gray-300 text-gray-900 text-sm focus:border-[#FA7315] focus:outline-none"
            >
              <option value="true">Enabled (true)</option>
              <option value="false">Disabled (false)</option>
            </select>
            {shopDefaultEnableSearch !== undefined && feedEnableSearch !== shopDefaultEnableSearch && (
              <button
                onClick={() => onEnableSearchChange?.(shopDefaultEnableSearch)}
                className="text-xs text-gray-500 hover:text-gray-700 underline text-left"
              >
                Reset to Shop Default ({shopDefaultEnableSearch ? 'Enabled' : 'Disabled'})
              </button>
            )}
          </div>
        ) : isReadOnly ? (
          <Tooltip content={getReadOnlyTooltipContent()} side="top">
            <div className="w-full px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-2 cursor-help">
              <span className="text-gray-900 text-sm font-medium truncate">
                {getReadOnlyDisplayText()}
              </span>
              <span className="text-[#FA7315] text-sm font-medium">i</span>
            </div>
          </Tooltip>
        ) : (
          <ProductMappingSelector
            value={getCurrentFieldValue()}
            staticValue={staticValue}
            isStaticMode={isStaticMode}
            isNoMappingMode={isNoMappingMode}
            onFieldSelect={handleFieldSelect}
            onNoMappingSelect={handleNoMappingSelect}
            onStaticValueSave={handleStaticValueSave}
            onReset={handleReset}
            spec={spec}
            shopMapping={shopMapping}
            wooFields={wooFields}
            wooFieldsLoading={wooFieldsLoading}
            hasOverride={hasOverride}
            allowStaticOverride={allowsStaticOverride || !isLockedField}
            isLockedField={isLockedField}
          />
        )}
      </td>

      <td className="py-4 px-4 w-[265px] max-w-[265px]">
        <div className="flex flex-col gap-1">
          <Tooltip
            content={previewDisplay !== '-' && previewDisplay.length > 25 ? previewDisplay : null}
            side="top"
            maxWidth={400}
          >
            <div
              className={`px-3 py-2.5 bg-gray-50 rounded-lg border text-sm truncate cursor-default max-w-full overflow-hidden ${
                !resolvedValueValidation.isValid ? 'border-amber-300' : 'border-gray-200'
              } ${previewStyle}`}
            >
              {!resolvedValueValidation.isValid && (
                <span className="text-amber-500 mr-1">⚠️</span>
              )}
              {previewDisplay}
            </div>
          </Tooltip>
          {!resolvedValueValidation.isValid && (
            <span className="text-xs text-amber-600">
              {resolvedValueValidation.error}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}
