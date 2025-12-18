'use client';

import { LOCKED_FIELD_MAPPINGS, OpenAIFieldSpec } from '@productsynch/shared';
import { WooCommerceFieldSelector } from './WooCommerceFieldSelector';
import { ToggleSwitch } from './ToggleSwitch';
import { extractTransformedPreviewValue, formatFieldValue } from '@/lib/wooCommerceFields';

interface Props {
  spec: OpenAIFieldSpec;
  currentMapping: string | null;
  isUserSelected: boolean;  // True if user explicitly selected a mapping (not just spec default)
  onMappingChange: (attribute: string, wooField: string | null) => void;
  previewProductJson: any | null;  // WooCommerce raw JSON for selected product
  previewShopData?: any | null;    // Shop-level data (seller info, return policy, etc.)
}

export function FieldMappingRow({ spec, currentMapping, isUserSelected, onMappingChange, previewProductJson, previewShopData }: Props) {
  const requirementColors = {
    Required: 'bg-red-500/20 text-red-300 border-red-500/30',
    Recommended: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    Optional: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    Conditional: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };

  // Check if this is a toggle field
  const isToggleField = spec.attribute === 'enable_search' || spec.attribute === 'enable_checkout';
  const isCheckoutField = spec.attribute === 'enable_checkout';
  const isDimensions = spec.attribute === 'dimensions';
  const isShopManagedField = [
    'seller_name',
    'seller_url',
    'seller_privacy_policy',
    'seller_tos',
    'return_policy',
    'return_window',
  ].includes(spec.attribute);
  const lockedMappingValue = LOCKED_FIELD_MAPPINGS[spec.attribute];
  const isLockedField = Boolean(lockedMappingValue);
  const isNonEditableField = isDimensions || isShopManagedField || isLockedField;

  // For toggle fields, mapping value is "ENABLED" or "DISABLED"
  // Default enable_search to ENABLED
  const isEnabled = isToggleField
    ? (currentMapping === 'ENABLED' || (spec.attribute === 'enable_search' && !currentMapping))
    : false;

  // Extract and format preview value
  // Only show preview if:
  // 1. User has explicitly selected a mapping (isUserSelected), OR
  // 2. This is a locked field (always mapped), OR
  // 3. This is a non-editable field like dimensions or shop-managed fields
  const shouldShowPreview = isUserSelected || isLockedField || isNonEditableField;

  const defaultMapping = spec.wooCommerceMapping?.field || null;
  const effectiveMapping = (isLockedField ? lockedMappingValue : currentMapping || (isDimensions ? defaultMapping : null)) || null;
  const previewValue = shouldShowPreview && effectiveMapping && !isToggleField
    ? extractTransformedPreviewValue(spec, effectiveMapping, previewProductJson, previewShopData || undefined)
    : null;
  const formattedValue = formatFieldValue(previewValue);

  // Determine preview display text
  let previewDisplay = formattedValue;
  let previewStyle = 'text-white/80';

  if (isToggleField) {
    previewDisplay = isEnabled ? 'true' : 'false';
    previewStyle = isEnabled ? 'text-[#5df0c0]' : 'text-white/40';
  } else if (!effectiveMapping) {
    previewDisplay = '';
    previewStyle = 'text-white/40';
  } else if (!previewProductJson) {
    previewDisplay = 'Select a product to preview...';
    previewStyle = 'text-white/40 italic';
  }

  return (
    <div className="grid grid-cols-[1fr_280px_1fr] gap-6 py-4 border-b border-white/5 hover:bg-white/[0.02] items-start">
      {/* Column 1: OpenAI Field Info */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-white font-medium">{spec.attribute}</span>
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
        </div>
        <p className="text-sm text-white/60">{spec.description}</p>
        <div className="text-xs text-white/40">
          Example: <span className="text-white/60">{spec.example}</span>
        </div>
      </div>

      {/* Column 2: WooCommerce Field Selector or Toggle */}
      <div className="flex items-start pt-0">
        {isNonEditableField ? (
          <div className="w-full">
            <div className="w-full px-4 py-3 bg-[#1a1d29] rounded-lg border border-white/10 flex items-start gap-2">
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">
                  {isDimensions ? 'Auto-populated' : isLockedField ? spec.attribute : 'Managed in Shops page'}
                </span>
              </div>
              <div className="relative group mt-[2px]">
                <span className="text-white/60 cursor-help text-sm">ℹ️</span>
                <div className="absolute left-0 top-6 hidden group-hover:block z-10 w-72 p-3 bg-gray-900 border border-white/20 rounded-lg shadow-lg text-xs text-white/80">
                  {isDimensions ? (
                    <div>
                      <div className="font-semibold text-white mb-1">Auto-filled dimensions</div>
                      <div>Populates automatically when length, width, and height are available.</div>
                    </div>
                  ) : isLockedField ? (
                    <div>
                      <div className="font-semibold text-white mb-1">Managed automatically</div>
                      <div>This mapping is predefined and cannot be edited.</div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold text-white mb-1">Update in Shops page</div>
                      <div className="mb-2">Edit this value from the Shops page to change the feed output.</div>
                      <a href="/shops" className="text-[#5df0c0] underline">Go to Shops</a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : isToggleField ? (
          <div className="w-full">
            <ToggleSwitch
              enabled={isEnabled}
              onChange={(enabled) => onMappingChange(spec.attribute, enabled ? 'ENABLED' : 'DISABLED')}
              disabled={isCheckoutField}
              label={isEnabled ? 'Enabled' : 'Disabled'}
            />
            {isCheckoutField && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-white/50">
                <span title="This feature will be available soon">ℹ️</span>
                <span>Feature coming soon</span>
              </div>
            )}
          </div>
        ) : (
          <WooCommerceFieldSelector
            value={currentMapping}
            onChange={(wooField) => onMappingChange(spec.attribute, wooField)}
            openaiAttribute={spec.attribute}
            requirement={spec.requirement}
          />
        )}
      </div>

      {/* Column 3: Preview Data */}
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
