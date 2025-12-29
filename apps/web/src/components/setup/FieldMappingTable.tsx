'use client';

import { Fragment } from 'react';
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
}: FieldMappingTableProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Scrollable table container - both horizontal and vertical */}
      <div className="overflow-auto max-h-[calc(100vh-280px)]">
        <table className="w-full field-mapping-table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          {/* Column Headers - Sticky */}
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide w-[30%] min-w-[250px] sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
                OpenAI Field
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide w-[100px] min-w-[100px] sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
                Status
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide w-[200px] min-w-[200px] sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
                WooCommerce Mapping
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide w-[180px] min-w-[180px] sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
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
                    className="py-3 px-4 bg-gray-100 border-b border-gray-200 sticky z-10 bg-gray-100"
                    style={{ top: '45px' }}
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
          <div className="h-3 bg-gray-200 rounded w-[100px]" />
          <div className="h-3 bg-gray-200 rounded w-[200px]" />
          <div className="h-3 bg-gray-200 rounded w-[180px]" />
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
            <div className="w-[100px] min-w-[100px]">
              <div className="h-6 bg-gray-200 rounded w-20" />
            </div>

            {/* WooCommerce Mapping column */}
            <div className="w-[200px] min-w-[200px]">
              <div className="h-10 bg-gray-200 rounded w-full" />
            </div>

            {/* Preview Value column */}
            <div className="w-[180px] min-w-[180px]">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
