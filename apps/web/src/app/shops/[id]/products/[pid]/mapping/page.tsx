'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/store/auth';
import {
  OPENAI_FEED_SPEC,
  CATEGORY_CONFIG,
  ProductFieldOverride,
  ProductFieldOverrides,
  OpenAIFieldCategory,
} from '@productsynch/shared';
import { ProductFieldMappingTable, ProductFieldMappingTableSkeleton } from '@/components/setup/ProductFieldMappingTable';
import { useFieldMappingsQuery, useProductOverridesQuery, useUpdateProductOverridesMutation, useUpdateFeedEnableSearchMutation } from '@/hooks/useFieldMappingsQuery';
import { useWooFieldsQuery, useWooProductDataQuery } from '@/hooks/useWooFieldsQuery';

export default function ProductMappingPage() {
  const params = useParams<{ id: string; pid: string }>();
  const router = useRouter();
  // Note: hydrate() is called by AppLayout, no need to call it here
  const { user, hydrated } = useAuth();

  // Local UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // React Query hooks
  const {
    data: overridesData,
    isLoading: loading,
    error: loadError,
  } = useProductOverridesQuery(params?.id, params?.pid);

  // Shop-level field mappings (single source of truth, auto-invalidates when shop mappings change)
  const {
    data: shopMappingsData,
    isLoading: shopMappingsLoading,
  } = useFieldMappingsQuery(params?.id);

  const shopMappings = shopMappingsData?.userMappings ?? {};
  const productOverrides: ProductFieldOverrides = overridesData?.overrides ?? {};
  const resolvedValues = overridesData?.resolvedValues ?? {};

  const {
    data: previewData,
  } = useWooProductDataQuery(params?.id, params?.pid);

  const previewProductJson = previewData?.wooData ?? null;
  const previewShopData = previewData?.shopData ?? null;

  const { data: wooFields = [], isLoading: wooFieldsLoading } = useWooFieldsQuery(params?.id);

  // Mutation for updating product overrides
  const updateOverridesMutation = useUpdateProductOverridesMutation(params?.id, params?.pid);

  // Mutation for updating feedEnableSearch (enable_search uses column, not overrides)
  const updateEnableSearchMutation = useUpdateFeedEnableSearchMutation(params?.id, params?.pid);

  const saving = updateOverridesMutation.isPending || updateEnableSearchMutation.isPending;

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveErrorTimeoutRef.current) {
        clearTimeout(saveErrorTimeoutRef.current);
      }
    };
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (hydrated && !user) {
      router.push('/login');
    }
  }, [hydrated, user, router]);

  // Handle override change using mutation
  const handleOverrideChange = useCallback(
    (attribute: string, override: ProductFieldOverride | null) => {
      setSaveError(null);

      // Build new overrides
      const newOverrides = { ...productOverrides };
      if (override) {
        newOverrides[attribute] = override;
      } else {
        delete newOverrides[attribute];
      }

      // Use mutation (includes optimistic update and rollback)
      updateOverridesMutation.mutate(newOverrides, {
        onError: (err) => {
          const errorMessage = err instanceof Error ? err.message : 'Failed to save override';
          setSaveError(errorMessage);
          // Auto-clear error after 5 seconds
          if (saveErrorTimeoutRef.current) {
            clearTimeout(saveErrorTimeoutRef.current);
          }
          saveErrorTimeoutRef.current = setTimeout(() => setSaveError(null), 5000);
        },
      });
    },
    [productOverrides, updateOverridesMutation]
  );

  // Handle enable_search change - uses feedEnableSearch column, not overrides
  const handleEnableSearchChange = useCallback(
    (enableSearch: boolean) => {
      setSaveError(null);

      updateEnableSearchMutation.mutate(enableSearch, {
        onError: (err) => {
          const errorMessage = err instanceof Error ? err.message : 'Failed to update enable_search';
          setSaveError(errorMessage);
          if (saveErrorTimeoutRef.current) {
            clearTimeout(saveErrorTimeoutRef.current);
          }
          saveErrorTimeoutRef.current = setTimeout(() => setSaveError(null), 5000);
        },
      });
    },
    [updateEnableSearchMutation]
  );

  // Filter specs based on search (includes example field)
  const filteredSpecs = searchQuery
    ? OPENAI_FEED_SPEC.filter(
        (spec) =>
          spec.attribute.toLowerCase().includes(searchQuery.toLowerCase()) ||
          spec.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (spec.example && spec.example.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : OPENAI_FEED_SPEC;

  // Group by category
  const categories = Object.entries(CATEGORY_CONFIG)
    .map(([id, config]) => ({
      id: id as OpenAIFieldCategory,
      label: config.label,
      order: config.order,
      fields: filteredSpecs.filter((spec) => spec.category === id),
    }))
    .filter((cat) => cat.fields.length > 0)
    .sort((a, b) => a.order - b.order);

  // Count overrides
  const overrideCount = Object.keys(productOverrides).length;

  if (loading || shopMappingsLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <div className="p-4">
          <div className="w-full">
            {/* Breadcrumb skeleton */}
            <div className="mb-4">
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
            </div>

            {/* Header skeleton */}
            <div className="mb-8">
              <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-96 animate-pulse" />
            </div>

            {/* Table skeleton */}
            <ProductFieldMappingTableSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F9FAFB]">
        <div className="text-center">
          <div className="text-red-600 mb-4">{loadError.message || 'Failed to load product data. Please refresh the page.'}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#FA7315] text-white rounded-lg hover:bg-[#E5650F]"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="p-4">
        <div className="w-full">
          {/* Breadcrumb */}
          <div className="mb-4">
            <Link
              href={`/shops/${params.id}/products`}
              className="text-gray-500 hover:text-gray-900 text-sm flex items-center gap-2"
            >
              <span>&larr;</span>
              <span>Back to Products</span>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {(typeof resolvedValues['title'] === 'string' && resolvedValues['title']) || 'Untitled Product'}
              </h1>
              {overrideCount > 0 && (
                <span className="text-xs px-2 py-1 rounded bg-[#FA7315]/10 text-[#FA7315] border border-[#FA7315]/30">
                  {overrideCount} custom override{overrideCount !== 1 ? 's' : ''}
                </span>
              )}
              {overridesData?.isValid === false && (
                <span className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  ⚠️ {overridesData.validationErrors ? Object.keys(overridesData.validationErrors).length : 0} validation issue{overridesData.validationErrors && Object.keys(overridesData.validationErrors).length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-gray-600">
              Customize field mappings for this specific product. Overrides take priority over shop-level mappings.
            </p>

            {/* Validation Errors Banner */}
            {overridesData?.isValid === false && overridesData?.validationErrors && Object.keys(overridesData.validationErrors).length > 0 && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-amber-600 text-lg">⚠️</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-amber-700 mb-2">
                      Validation Issues Detected
                    </div>
                    <ul className="space-y-1 text-xs text-amber-600">
                      {Object.entries(overridesData.validationErrors).map(([field, errors]) => (
                        <li key={field}>
                          <span className="font-medium text-amber-700">{field}:</span>{' '}
                          {Array.isArray(errors) ? errors.join(', ') : String(errors)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {saving && (
              <div className="mt-2 text-sm text-[#FA7315]">Saving changes...</div>
            )}
            {saveError && (
              <div className="mt-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-red-600 text-lg">!</span>
                  <div>
                    <div className="text-sm font-medium text-red-700">Failed to save</div>
                    <div className="text-xs text-red-600 mt-0.5">{saveError}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Field Mappings Table */}
          <ProductFieldMappingTable
            categories={categories}
            shopMappings={shopMappings}
            productOverrides={productOverrides}
            resolvedValues={resolvedValues}
            onOverrideChange={handleOverrideChange}
            onEnableSearchChange={handleEnableSearchChange}
            previewProductJson={previewProductJson}
            previewShopData={previewShopData}
            wooFields={wooFields}
            wooFieldsLoading={wooFieldsLoading}
            feedEnableSearch={overridesData?.feedEnableSearch}
            shopDefaultEnableSearch={overridesData?.shopDefaultEnableSearch}
            validationErrors={overridesData?.validationErrors ?? undefined}
            emptyMessage="No fields match your search."
            searchElement={
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fields by name, description, or example..."
                className="w-full max-w-md px-4 py-2 bg-gray-50 text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:border-[#FA7315] focus:ring-2 focus:ring-[#FA7315]/10 text-sm"
              />
            }
          />
        </div>
      </div>
    </div>
  );
}
