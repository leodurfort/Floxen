'use client';

import { OpenAIFieldSpec } from '@productsynch/shared';
import { WooCommerceFieldSelector } from './WooCommerceFieldSelector';
import { ToggleSwitch } from './ToggleSwitch';
import { extractFieldValue, formatFieldValue } from '@/lib/wooCommerceFields';

interface Props {
  spec: OpenAIFieldSpec;
  currentMapping: string | null;
  onMappingChange: (attribute: string, wooField: string | null) => void;
  previewProductJson: any | null;  // WooCommerce raw JSON for selected product
  previewShopData?: any | null;    // Shop-level data (seller info, return policy, etc.)
}

export function FieldMappingRow({ spec, currentMapping, onMappingChange, previewProductJson, previewShopData }: Props) {
  const requirementColors = {
    Required: 'bg-red-500/20 text-red-300 border-red-500/30',
    Recommended: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    Optional: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    Conditional: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };

  // Check if this is a toggle field
  const isToggleField = spec.attribute === 'enable_search' || spec.attribute === 'enable_checkout';
  const isCheckoutField = spec.attribute === 'enable_checkout';

  // For toggle fields, mapping value is "ENABLED" or "DISABLED"
  // Default enable_search to ENABLED
  const isEnabled = isToggleField
    ? (currentMapping === 'ENABLED' || (spec.attribute === 'enable_search' && !currentMapping))
    : false;

  // Extract and format preview value
  const previewValue = currentMapping && !isToggleField
    ? extractFieldValue(previewProductJson, currentMapping, previewShopData)
    : null;
  const formattedValue = formatFieldValue(previewValue);

  // Debug logging for shop fields specifically
  const isShopField = currentMapping?.startsWith('shop.');
  if (isShopField) {
    console.log(`[FieldMappingRow] Shop field "${spec.attribute}":`, {
      currentMapping,
      hasPreviewShopData: !!previewShopData,
      previewShopData,
      previewValue,
      formattedValue,
    });
  }

  // Determine preview display text
  let previewDisplay = formattedValue;
  let previewStyle = 'text-white/80';

  if (isToggleField) {
    previewDisplay = isEnabled ? '✓ Enabled' : 'Disabled';
    previewStyle = isEnabled ? 'text-[#5df0c0]' : 'text-white/40';
  } else if (!currentMapping) {
    previewDisplay = '⚠️ No field mapped';
    previewStyle = 'text-amber-400/60 italic';
  } else if (!previewProductJson) {
    previewDisplay = 'Select a product to preview...';
    previewStyle = 'text-white/40 italic';
  }

  // Debug logging for all fields to diagnose empty fields
  console.log(`[FieldMappingRow] ${spec.attribute}:`, {
    currentMapping: currentMapping || 'NOT MAPPED',
    hasPreviewData: !!previewProductJson,
    isToggleField,
    isEnabled,
    previewValue,
    formattedValue,
    previewDisplay,
  });

  return (
    <div className="grid grid-cols-[1fr_280px_1fr] gap-6 py-4 border-b border-white/5 hover:bg-white/[0.02] items-start">
      {/* Column 1: OpenAI Field Info */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-white font-medium">{spec.attribute}</span>
          <span className={`text-xs px-2 py-0.5 rounded border ${requirementColors[spec.requirement]}`}>
            {spec.requirement}
          </span>
        </div>
        <p className="text-sm text-white/60">{spec.description}</p>
        <div className="text-xs text-white/40">
          Example: <span className="text-white/60">{spec.example}</span>
        </div>
      </div>

      {/* Column 2: WooCommerce Field Selector or Toggle */}
      <div className="flex items-start pt-0">
        {isToggleField ? (
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
