'use client';

import { LOCKED_FIELD_MAPPINGS, OpenAIFieldSpec } from '@productsynch/shared';
import { WooCommerceFieldSelector } from './WooCommerceFieldSelector';
import { extractTransformedPreviewValue, formatFieldValue, WooCommerceField } from '@/lib/wooCommerceFields';

interface Props {
  spec: OpenAIFieldSpec;
  currentMapping: string | null;
  isUserSelected: boolean;  // True if user explicitly selected a mapping (not just spec default)
  onMappingChange: (attribute: string, wooField: string | null) => void;
  previewProductJson: any | null;  // WooCommerce raw JSON for selected product
  previewShopData?: any | null;    // Shop-level data (seller info, return policy, etc.)
  wooFields: WooCommerceField[];   // WooCommerce fields fetched once by parent
  wooFieldsLoading: boolean;       // Loading state for woo fields
}

export function FieldMappingRow({ spec, currentMapping, isUserSelected, onMappingChange, previewProductJson, previewShopData, wooFields, wooFieldsLoading }: Props) {
  const requirementColors = {
    Required: 'bg-red-50 text-red-600 border-red-200',
    Recommended: 'bg-amber-50 text-amber-600 border-amber-200',
    Optional: 'bg-blue-50 text-blue-600 border-blue-200',
    Conditional: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  // Check for special boolean fields (both are now read-only at shop level)
  const isEnableSearchField = spec.attribute === 'enable_search';
  const isEnableCheckoutField = spec.attribute === 'enable_checkout';
  const isDimensionOrWeightField = ['dimensions', 'length', 'width', 'height', 'weight'].includes(spec.attribute);
  const lockedMappingValue = LOCKED_FIELD_MAPPINGS[spec.attribute];
  const isLockedField = Boolean(lockedMappingValue);

  // Use spec properties for non-editable field detection (consistent with ProductFieldMappingRow)
  // enable_search and enable_checkout are now locked at shop level
  const isNonEditableField = spec.isAutoPopulated || spec.isShopManaged || isLockedField || isEnableSearchField || isEnableCheckoutField;

  const defaultMapping = spec.wooCommerceMapping?.field || null;
  const effectiveMapping = (isLockedField ? lockedMappingValue : currentMapping || (spec.isAutoPopulated ? defaultMapping : null)) || null;

  // Extract and format preview value
  // Show preview if:
  // 1. User has explicitly selected a mapping (isUserSelected), OR
  // 2. This is a locked field (always mapped), OR
  // 3. This is a non-editable field like dimensions or shop-managed fields, OR
  // 4. There's an effective mapping (including spec defaults)
  const shouldShowPreview = isUserSelected || isLockedField || isNonEditableField || Boolean(effectiveMapping);
  const previewValue = shouldShowPreview && effectiveMapping && !isEnableSearchField && !isEnableCheckoutField
    ? extractTransformedPreviewValue(spec, effectiveMapping, previewProductJson, previewShopData || undefined)
    : null;
  const formattedValue = formatFieldValue(previewValue);

  // Determine preview display text
  let previewDisplay = formattedValue;
  let previewStyle = 'text-gray-700';

  if (isEnableSearchField) {
    // enable_search is always "true" at shop level (locked as Enabled)
    previewDisplay = 'true';
    previewStyle = 'text-[#FA7315]';
  } else if (isEnableCheckoutField) {
    // enable_checkout is always "false" at shop level (feature coming soon)
    previewDisplay = 'false';
    previewStyle = 'text-gray-400';
  } else if (!effectiveMapping) {
    previewDisplay = '';
    previewStyle = 'text-gray-400';
  } else if (!previewProductJson) {
    previewDisplay = 'Select a product to preview...';
    previewStyle = 'text-gray-400 italic';
  }

  return (
    <div className="grid grid-cols-[1fr_280px_1fr] gap-6 py-4 border-b border-gray-100 hover:bg-gray-50/50 items-start">
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

      {/* Column 2: WooCommerce Field Selector or Toggle */}
      <div className="flex items-start pt-0">
        {isNonEditableField ? (
          <div className="w-full">
            <div className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 flex items-start gap-2">
              <div className="flex flex-col">
                <span className="text-gray-900 text-sm font-medium">
                  {isEnableSearchField ? 'Enabled' :
                   isEnableCheckoutField ? 'Disabled' :
                   spec.isAutoPopulated ? 'Auto-populated' :
                   isLockedField ? effectiveMapping :
                   'Managed in Shops page'}
                </span>
              </div>
              <div className="relative group mt-[2px]">
                <span className="text-gray-500 cursor-help text-sm">ℹ️</span>
                <div className="absolute left-0 top-6 hidden group-hover:block z-10 w-72 p-3 bg-white border border-gray-200 rounded-lg shadow-lg text-xs text-gray-700">
                  {isEnableSearchField ? (
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Customize per product</div>
                      <div>All products are searchable by default. You can disable search for specific products in the Products page.</div>
                    </div>
                  ) : isEnableCheckoutField ? (
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Feature coming soon</div>
                      <div>Direct checkout inside ChatGPT will be available in a future update.</div>
                    </div>
                  ) : spec.isAutoPopulated ? (
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Auto-populated field</div>
                      <div>This value is computed automatically from other product data.</div>
                    </div>
                  ) : isLockedField ? (
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Managed automatically</div>
                      <div>This mapping is predefined and cannot be edited.</div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Update in Shops page</div>
                      <div className="mb-2">Edit this value from the Shops page to change the feed output.</div>
                      <a href="/shops" className="text-[#FA7315] underline">Go to Shops</a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <WooCommerceFieldSelector
            value={currentMapping}
            onChange={(wooField) => onMappingChange(spec.attribute, wooField)}
            openaiAttribute={spec.attribute}
            requirement={spec.requirement}
            fields={wooFields}
            loading={wooFieldsLoading}
          />
        )}
      </div>

      {/* Column 3: Preview Data */}
      <div className="flex items-start pt-0">
        <div
          className="w-full !h-[40px] px-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center overflow-hidden cursor-default"
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
