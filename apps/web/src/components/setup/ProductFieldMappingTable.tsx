'use client';

import { Fragment, ReactNode } from 'react';
import { OpenAIFieldSpec, CATEGORY_CONFIG, OpenAIFieldCategory, ProductFieldOverrides } from '@productsynch/shared';
import { ProductFieldMappingRow } from './ProductFieldMappingRow';
import { WooCommerceField } from '@/lib/wooCommerceFields';

interface CategoryGroup {
  id: OpenAIFieldCategory;
  label: string;
  order: number;
  fields: OpenAIFieldSpec[];
}

interface ProductFieldMappingTableProps {
  categories: CategoryGroup[];
  shopMappings: Record<string, string | null>;
  productOverrides: ProductFieldOverrides;
  resolvedValues: Record<string, any>;
  onOverrideChange: (attribute: string, override: any) => void;
  onEnableSearchChange: (enableSearch: boolean) => void;
  previewProductJson: any | null;
  previewShopData: any | null;
  wooFields: WooCommerceField[];
  wooFieldsLoading: boolean;
  feedEnableSearch?: boolean;
  shopDefaultEnableSearch?: boolean;
  validationErrors?: Record<string, string[]>;
  searchElement?: ReactNode;
  emptyMessage?: ReactNode;
}

export function ProductFieldMappingTable({
  categories,
  shopMappings,
  productOverrides,
  resolvedValues,
  onOverrideChange,
  onEnableSearchChange,
  previewProductJson,
  previewShopData,
  wooFields,
  wooFieldsLoading,
  feedEnableSearch,
  shopDefaultEnableSearch,
  validationErrors,
  searchElement,
  emptyMessage,
}: ProductFieldMappingTableProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-auto max-h-[calc(100vh-280px)]">
        <table className="w-full field-mapping-table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            {searchElement && (
              <tr className="toolbar-row">
                <th
                  colSpan={4}
                  className="text-left py-3 px-4 border-b border-gray-200 font-normal sticky top-0 z-30 bg-white"
                >
                  {searchElement}
                </th>
              </tr>
            )}
            <tr className="column-headers">
              <th
                className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide w-[30%] min-w-[250px] sticky z-20 bg-gray-50 border-b border-gray-200"
                style={{ top: searchElement ? '49px' : '0px' }}
              >
                OpenAI Field
              </th>
              <th
                className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide w-[120px] min-w-[120px] sticky z-20 bg-gray-50 border-b border-gray-200"
                style={{ top: searchElement ? '49px' : '0px' }}
              >
                Status
              </th>
              <th
                className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide w-[280px] min-w-[280px] sticky z-20 bg-gray-50 border-b border-gray-200"
                style={{ top: searchElement ? '49px' : '0px' }}
              >
                Mapping Source
              </th>
              <th
                className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide w-[265px] min-w-[265px] sticky z-20 bg-gray-50 border-b border-gray-200"
                style={{ top: searchElement ? '49px' : '0px' }}
              >
                Preview Value
              </th>
            </tr>
          </thead>

          <tbody>
            {categories.length > 0 ? (
              categories.map((category) => (
                <Fragment key={category.id}>
                  <tr className="section-header">
                    <td
                      colSpan={4}
                      className="py-2 px-4 bg-gray-100 border-b border-gray-200 sticky z-10"
                      style={{ top: searchElement ? '90px' : '41px' }}
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
                  {category.fields.map((spec) => (
                    <ProductFieldMappingRow
                      key={spec.attribute}
                      spec={spec}
                      shopMapping={shopMappings[spec.attribute] || null}
                      productOverride={productOverrides[spec.attribute] || null}
                      onOverrideChange={onOverrideChange}
                      previewProductJson={previewProductJson}
                      previewShopData={previewShopData}
                      previewValue={resolvedValues[spec.attribute]}
                      wooFields={wooFields}
                      wooFieldsLoading={wooFieldsLoading}
                      serverValidationErrors={validationErrors?.[spec.attribute] || null}
                      feedEnableSearch={feedEnableSearch}
                      onEnableSearchChange={onEnableSearchChange}
                      shopDefaultEnableSearch={shopDefaultEnableSearch}
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

export function ProductFieldMappingTableSkeleton() {
  const skeletonRows = 8;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="animate-pulse">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
        </div>
        <div className="h-12 bg-gray-50 border-b border-gray-200 flex items-center px-4 gap-4">
          <div className="h-3 bg-gray-200 rounded w-[30%] min-w-[200px]" />
          <div className="h-3 bg-gray-200 rounded w-[120px]" />
          <div className="h-3 bg-gray-200 rounded w-[280px]" />
          <div className="h-3 bg-gray-200 rounded w-[265px]" />
        </div>
        <div className="h-10 bg-gray-100 border-b border-gray-200 flex items-center px-4">
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
        {[...Array(skeletonRows)].map((_, i) => (
          <div key={i} className="h-24 border-b border-gray-200 p-4 flex gap-4 items-start">
            <div className="w-[30%] min-w-[200px] space-y-2">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
            <div className="w-[120px]">
              <div className="h-6 bg-gray-200 rounded w-20" />
            </div>
            <div className="w-[280px]">
              <div className="h-10 bg-gray-200 rounded w-full" />
            </div>
            <div className="w-[265px]">
              <div className="h-10 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
