'use client';

import { LOCKED_FIELD_MAPPINGS, OpenAIFieldSpec } from '@productsynch/shared';
import { WooCommerceFieldSelector } from './WooCommerceFieldSelector';
import { extractTransformedPreviewValue, formatFieldValue, WooCommerceField } from '@/lib/wooCommerceFields';
import { Tooltip } from '@/components/ui/Tooltip';
import { DescriptionPopover } from '@/components/ui/DescriptionPopover';

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

// Status badge component
function StatusBadge({ status }: { status: 'Required' | 'Recommended' | 'Optional' | 'Conditional' }) {
  const styles = {
    Required: 'bg-red-100 text-red-700 border-red-300',
    Recommended: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    Optional: 'bg-blue-100 text-blue-700 border-blue-300',
    Conditional: 'bg-purple-100 text-purple-700 border-purple-300',
  };

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${styles[status]}`}>
      {status}
    </span>
  );
}

export function FieldMappingRow({ spec, currentMapping, isUserSelected, onMappingChange, previewProductJson, previewShopData, wooFields, wooFieldsLoading }: Props) {
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
    previewDisplay = '-';
    previewStyle = 'text-gray-400';
  } else if (!previewProductJson) {
    previewDisplay = 'Select a product to preview...';
    previewStyle = 'text-gray-400 italic';
  }

  // Get the locked/non-editable field display text
  const getLockedFieldDisplay = () => {
    if (isEnableSearchField) return 'Enabled';
    if (isEnableCheckoutField) return 'Disabled';
    if (spec.isAutoPopulated) return 'Auto-populated';
    if (isLockedField) return effectiveMapping || 'Locked';
    return 'Managed in Shops page';
  };

  // Get tooltip content for locked/non-editable fields
  const getLockedFieldTooltip = () => {
    if (isEnableSearchField) {
      return (
        <div>
          <div className="font-semibold mb-1">Customize per product</div>
          <div>All products are searchable by default. You can disable search for specific products in the Products page.</div>
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
          <div>This value is computed automatically from other product data.</div>
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
      {/* Column 1: OpenAI Field Info */}
      <td className="py-4 px-4">
        <div className="flex flex-col gap-1">
          {/* Field name with optional info icons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-900 font-medium">{spec.attribute}</span>

            {/* Dimension/Weight unit info */}
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

            {/* Conditional field info */}
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

          {/* Description with show more */}
          <DescriptionPopover
            description={spec.description}
            example={spec.example || null}
            values={spec.supportedValues || null}
          />
        </div>
      </td>

      {/* Column 2: Status Badge */}
      <td className="py-4 px-4">
        <StatusBadge status={spec.requirement} />
      </td>

      {/* Column 3: WooCommerce Field Selector or Locked Display */}
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
            openaiAttribute={spec.attribute}
            requirement={spec.requirement}
            fields={wooFields}
            loading={wooFieldsLoading}
          />
        )}
      </td>

      {/* Column 4: Preview Value - Fixed width */}
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
