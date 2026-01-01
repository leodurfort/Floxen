'use client';

import { Fragment, ReactNode } from 'react';
import { OpenAIFieldSpec, CATEGORY_CONFIG, OpenAIFieldCategory } from '@productsynch/shared';
import { FieldMappingRow } from './FieldMappingRow';
import { WooCommerceField } from '@/lib/wooCommerceFields';

interface CategoryGroup {
  id: OpenAIFieldCategory;
  label: string;
  order: number;
  fields: OpenAIFieldSpec[];
}

interface FieldMappingTableProps {
  categories: CategoryGroup[];
  mappings: Record<string, string | null>;
  userMappings: Record<string, string | null>;
  onMappingChange: (attribute: string, wooField: string | null) => void;
  previewProductJson: any | null;
  previewShopData: any | null;
  wooFields: WooCommerceField[];
  wooFieldsLoading: boolean;
  // Toolbar elements
  searchElement?: ReactNode;
  productSelectorElement?: ReactNode;
  // Empty state
  emptyMessage?: ReactNode;
}

export function FieldMappingTable({
  categories,
  mappings,
  userMappings,
  onMappingChange,
  previewProductJson,
  previewShopData,
  wooFields,
  wooFieldsLoading,
  searchElement,
  productSelectorElement,
  emptyMessage,
}: FieldMappingTableProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Scrollable table container - both horizontal and vertical */}
      <div className="overflow-auto max-h-[calc(100vh-180px)]">
        <table className="w-full field-mapping-table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          {/* Toolbar Row + Column Headers - both in thead for perfect alignment */}
          <thead>
            {/* Toolbar Row - sticky at top */}
            {(searchElement || productSelectorElement) && (
              <tr className="toolbar-row">
                <th className="text-left py-3 px-4 w-[30%] min-w-[250px] border-b border-gray-200 font-normal sticky top-0 z-30 bg-white">
                  {searchElement}
                </th>
                <th className="py-3 px-4 w-[55px] min-w-[55px] border-b border-gray-200 sticky top-0 z-30 bg-white" />
                <th className="py-3 px-4 w-[145px] min-w-[145px] border-b border-gray-200 sticky top-0 z-30 bg-white" />
                <th className="text-left py-3 px-4 w-[265px] min-w-[265px] border-b border-gray-200 font-normal sticky top-0 z-30 bg-white">
                  {productSelectorElement}
                </th>
              </tr>
            )}
            {/* Column Headers - sticky below toolbar */}
            <tr className="column-headers">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide w-[30%] min-w-[250px] sticky z-20 bg-gray-50 border-b border-gray-200" style={{ top: '49px' }}>
                OpenAI Field
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide w-[55px] min-w-[55px] sticky z-20 bg-gray-50 border-b border-gray-200" style={{ top: '49px' }}>
                Status
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide w-[145px] min-w-[145px] sticky z-20 bg-gray-50 border-b border-gray-200" style={{ top: '49px' }}>
                WooCommerce Mapping
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide w-[265px] min-w-[265px] sticky z-20 bg-gray-50 border-b border-gray-200" style={{ top: '49px' }}>
                Preview Value <span className="font-normal opacity-60 normal-case">(excludes product overrides)</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {categories.length > 0 ? (
              categories.map((category) => (
                <Fragment key={category.id}>
                  {/* Section Header Row - Sticky below toolbar + column headers */}
                  <tr className="section-header">
                    <td
                      colSpan={4}
                      className="py-2 px-4 bg-gray-100 border-b border-gray-200 sticky z-10"
                      style={{ top: '90px' }}
                    >
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {category.label}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {category.fields.length} fields
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Field Rows */}
                  {category.fields.map((spec) => (
                    <FieldMappingRow
                      key={spec.attribute}
                      spec={spec}
                      currentMapping={mappings[spec.attribute] || null}
                      isUserSelected={spec.attribute in userMappings}
                      onMappingChange={onMappingChange}
                      previewProductJson={previewProductJson}
                      previewShopData={previewShopData}
                      wooFields={wooFields}
                      wooFieldsLoading={wooFieldsLoading}
                    />
                  ))}
                </Fragment>
              ))
            ) : emptyMessage ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Loading skeleton for the table
export function FieldMappingTableSkeleton() {
  const skeletonRows = 8;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="h-12 bg-gray-50 border-b border-gray-200 flex items-center px-4 gap-4">
          <div className="h-3 bg-gray-200 rounded w-[30%]" />
          <div className="h-3 bg-gray-200 rounded w-[55px]" />
          <div className="h-3 bg-gray-200 rounded w-[145px]" />
          <div className="h-3 bg-gray-200 rounded w-[265px]" />
        </div>

        {/* Section header skeleton */}
        <div className="h-10 bg-gray-100 border-b border-gray-200 flex items-center px-4">
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>

        {/* Row skeletons */}
        {[...Array(skeletonRows)].map((_, i) => (
          <div
            key={i}
            className="h-24 border-b border-gray-200 p-4 flex gap-4 items-start"
          >
            {/* OpenAI Field column */}
            <div className="w-[30%] min-w-[250px] space-y-2">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>

            {/* Status column */}
            <div className="w-[55px] min-w-[55px]">
              <div className="h-6 bg-gray-200 rounded w-14" />
            </div>

            {/* WooCommerce Mapping column */}
            <div className="w-[145px] min-w-[145px]">
              <div className="h-10 bg-gray-200 rounded w-full" />
            </div>

            {/* Preview Value column */}
            <div className="w-[265px] min-w-[265px]">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
