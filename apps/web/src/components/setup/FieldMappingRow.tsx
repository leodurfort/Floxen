'use client';

import { OpenAIFieldSpec } from '@productsynch/shared';
import { WooCommerceFieldSelector } from './WooCommerceFieldSelector';
import { extractFieldValue, formatFieldValue } from '@/lib/wooCommerceFields';

interface Props {
  spec: OpenAIFieldSpec;
  currentMapping: string | null;
  onMappingChange: (attribute: string, wooField: string) => void;
  previewProductJson: any | null;  // WooCommerce raw JSON for selected product
}

export function FieldMappingRow({ spec, currentMapping, onMappingChange, previewProductJson }: Props) {
  const requirementColors = {
    Required: 'bg-red-500/20 text-red-300 border-red-500/30',
    Recommended: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    Optional: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    Conditional: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };

  // Extract and format preview value
  const previewValue = currentMapping && previewProductJson
    ? extractFieldValue(previewProductJson, currentMapping)
    : null;
  const formattedValue = formatFieldValue(previewValue);

  // Debug logging for first row only to avoid spam
  if (spec.attribute === 'id') {
    console.log('[FieldMappingRow] Debug info:', {
      attribute: spec.attribute,
      currentMapping,
      hasPreviewData: !!previewProductJson,
      previewValue,
      formattedValue,
      previewDataSample: previewProductJson ? {
        id: previewProductJson.id,
        name: previewProductJson.name,
      } : null,
    });
  }

  return (
    <div className="grid grid-cols-3 gap-6 py-4 border-b border-white/5 hover:bg-white/[0.02]">
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

      {/* Column 2: WooCommerce Field Selector */}
      <div className="flex items-center">
        <WooCommerceFieldSelector
          value={currentMapping}
          onChange={(wooField) => onMappingChange(spec.attribute, wooField)}
          openaiAttribute={spec.attribute}
        />
      </div>

      {/* Column 3: Preview Data */}
      <div className="flex items-center">
        <div className="w-full px-4 py-2 bg-[#1a1d29] rounded-lg border border-white/10">
          <pre className="text-xs text-white/80 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
            {formattedValue}
          </pre>
        </div>
      </div>
    </div>
  );
}
