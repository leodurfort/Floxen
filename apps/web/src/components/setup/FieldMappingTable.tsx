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
}: FieldMappingTableProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Toolbar Row - inside container for perfect alignment */}
      {(searchElement || productSelectorElement) && (
        <div
          className="grid items-center py-3 border-b border-gray-200 bg-white"
          style={{ gridTemplateColumns: 'minmax(250px, 30%) 55px 145px 265px' }}
        >
          {/* Column 1: Search bar */}
          <div className="px-4">{searchElement}</div>
          {/* Column 2: Empty (Status) */}
          <div />
          {/* Column 3: Empty (WooCommerce Mapping) */}
          <div />
          {/* Column 4: Product Selector */}
          <div className="px-4">{productSelectorElement}</div>
        </div>
      )}
      {/* Scrollable table container - both horizontal and vertical */}
      <div className="overflow-auto max-h-[calc(100vh-280px)]">
        <table className="w-full field-mapping-table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          {/* Column Headers - Sticky */}
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide w-[30%] min-w-[250px] sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
                OpenAI Field
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide w-[55px] min-w-[55px] sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
                Status
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide w-[145px] min-w-[145px] sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
                WooCommerce Mapping
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide w-[265px] min-w-[265px] sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
                Preview Value
              </th>
            </tr>
          </thead>

          <tbody>
            {categories.map((category) => (
              <Fragment key={category.id}>
                {/* Section Header Row - Sticky below column headers */}
                <tr className="section-header">
                  <td
                    colSpan={4}
                    className="py-2 px-4 bg-gray-100 border-b border-gray-200 sticky z-10"
                    style={{ top: '41px' }}
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
            ))}
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
