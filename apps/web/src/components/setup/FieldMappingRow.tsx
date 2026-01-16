'use client';

import { LOCKED_FIELD_MAPPINGS, OpenAIFieldSpec } from '@productsynch/shared';
import { WooCommerceFieldSelector } from './WooCommerceFieldSelector';
import { extractTransformedPreviewValue, formatFieldValue, WooCommerceField } from '@/lib/wooCommerceFields';
import { Tooltip, StatusBadge } from '@/components/ui/Tooltip';
import { DescriptionPopover } from '@/components/ui/DescriptionPopover';

interface Props {
  spec: OpenAIFieldSpec;
  currentMapping: string | null;
  isUserSelected: boolean;
  onMappingChange: (attribute: string, wooField: string | null) => void;
  previewProductJson: any | null;
  previewShopData?: any | null;
  wooFields: WooCommerceField[];
  wooFieldsLoading: boolean;
}

const DIMENSION_WEIGHT_FIELDS = ['dimensions', 'length', 'width', 'height', 'weight'];

export function FieldMappingRow({ spec, currentMapping, isUserSelected, onMappingChange, previewProductJson, previewShopData, wooFields, wooFieldsLoading }: Props) {
  const isEnableSearchField = spec.attribute === 'enable_search';
  const isEnableCheckoutField = spec.attribute === 'enable_checkout';
  const isDimensionOrWeightField = DIMENSION_WEIGHT_FIELDS.includes(spec.attribute);
  const lockedMappingValue = LOCKED_FIELD_MAPPINGS[spec.attribute];
  const isLockedField = Boolean(lockedMappingValue);
  const isNonEditableField = spec.isAutoPopulated || spec.isShopManaged || isLockedField || isEnableSearchField || isEnableCheckoutField;

  const defaultMapping = spec.wooCommerceMapping?.field || spec.wooCommerceMapping?.shopField || null;
  const effectiveMapping = (isLockedField ? lockedMappingValue : currentMapping || (spec.isAutoPopulated ? defaultMapping : null)) || null;

  const shouldShowPreview = isUserSelected || isLockedField || isNonEditableField || Boolean(effectiveMapping);
  const previewValue = shouldShowPreview && effectiveMapping && !isEnableSearchField && !isEnableCheckoutField
    ? extractTransformedPreviewValue(spec, effectiveMapping, previewProductJson, previewShopData || undefined)
    : null;
  const formattedValue = formatFieldValue(previewValue);

  let previewDisplay = formattedValue;
  let previewStyle = 'text-gray-700';

  if (isEnableSearchField) {
    previewDisplay = 'true';
    previewStyle = 'text-[#FA7315]';
  } else if (isEnableCheckoutField) {
    previewDisplay = 'false';
    previewStyle = 'text-gray-400';
  } else if (!effectiveMapping) {
    previewDisplay = '-';
    previewStyle = 'text-gray-400';
  } else if (!previewProductJson) {
    previewDisplay = 'Select an item to preview...';
    previewStyle = 'text-gray-400 italic';
  }

  const getLockedFieldDisplay = () => {
    if (isEnableSearchField) return 'Enabled';
    if (isEnableCheckoutField) return 'Disabled';
    if (spec.isAutoPopulated) return 'Auto-populated';
    if (isLockedField) return effectiveMapping || 'Locked';
    if (spec.isShopManaged && defaultMapping) return defaultMapping;
    return 'Managed in Stores page';
  };

  const getLockedFieldTooltip = () => {
    if (isEnableSearchField) {
      return (
        <div>
          <div className="font-semibold mb-1">Customize per item</div>
          <div>All items are searchable by default. You can disable search for specific items in the Catalog page.</div>
        </div>
      );
    }
    if (isEnableCheckoutField) {
      return (
        <div>
          <div className="font-semibold mb-1">Feature coming soon</div>
          <div>Direct checkout inside ChatGPT will be available in a future update.</div>
        </div>
      );
    }
    if (spec.isAutoPopulated) {
      return (
        <div>
          <div className="font-semibold mb-1">Auto-populated field</div>
          <div>This value is computed automatically from other item data.</div>
        </div>
      );
    }
    if (isLockedField) {
      return (
        <div>
          <div className="font-semibold mb-1">Managed automatically</div>
          <div>This mapping is predefined and cannot be edited.</div>
        </div>
      );
    }
    return (
      <div>
        <div className="font-semibold mb-1">Update in Shops page</div>
        <div>Edit this value from the Shops page to change the feed output.</div>
      </div>
    );
  };

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50 align-middle">
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
        <StatusBadge status={spec.requirement} />
      </td>

      <td className="py-4 px-4">
        {isNonEditableField ? (
          <Tooltip content={getLockedFieldTooltip()} side="top">
            <div className="w-full px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-2 cursor-help">
              <span className="text-gray-900 text-sm font-medium truncate">
                {getLockedFieldDisplay()}
              </span>
              <span className="text-[#FA7315] text-sm font-medium">i</span>
            </div>
          </Tooltip>
        ) : (
          <WooCommerceFieldSelector
            value={currentMapping}
            onChange={(wooField) => onMappingChange(spec.attribute, wooField)}
            requirement={spec.requirement}
            fields={wooFields}
            loading={wooFieldsLoading}
          />
        )}
      </td>

      <td className="py-4 px-4 w-[265px] max-w-[265px]">
        <Tooltip
          content={previewDisplay !== '-' && previewDisplay.length > 25 ? previewDisplay : null}
          side="top"
          maxWidth={400}
        >
          <div
            className={`px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200 text-sm ${previewStyle} truncate cursor-default max-w-full overflow-hidden`}
          >
            {previewDisplay}
          </div>
        </Tooltip>
      </td>
    </tr>
  );
}
