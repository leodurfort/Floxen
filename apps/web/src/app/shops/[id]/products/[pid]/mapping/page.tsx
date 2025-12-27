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
} from '@productsynch/shared';
import { ProductFieldMappingRow } from '@/components/setup/ProductFieldMappingRow';
import { useProductOverridesQuery, useUpdateProductOverridesMutation } from '@/hooks/useFieldMappingsQuery';
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

  const product = overridesData?.product ?? null;
  const shopMappings = overridesData?.shopMappings ?? {};
  const productOverrides: ProductFieldOverrides = overridesData?.productOverrides ?? {};
  const resolvedValues = overridesData?.resolvedValues ?? {};

  const {
    data: previewData,
  } = useWooProductDataQuery(params?.id, params?.pid);

  const previewProductJson = previewData?.wooData ?? null;
  const previewShopData = previewData?.shopData ?? null;

  const { data: wooFields = [], isLoading: wooFieldsLoading } = useWooFieldsQuery(params?.id);

  // Mutation for updating product overrides
  const updateOverridesMutation = useUpdateProductOverridesMutation(params?.id, params?.pid);
  const saving = updateOverridesMutation.isPending;

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

  // Filter specs based on search
  const filteredSpecs = searchQuery
    ? OPENAI_FEED_SPEC.filter(
        (spec) =>
          spec.attribute.toLowerCase().includes(searchQuery.toLowerCase()) ||
          spec.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : OPENAI_FEED_SPEC;

  // Group by category
  const categories = Object.entries(CATEGORY_CONFIG)
    .map(([id, config]) => ({
      id: id as any,
      label: config.label,
      order: config.order,
      fields: filteredSpecs.filter((spec) => spec.category === id),
    }))
    .filter((cat) => cat.fields.length > 0)
    .sort((a, b) => a.order - b.order);

  // Count overrides
  const overrideCount = Object.keys(productOverrides).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white">Loading product mappings...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-red-400 mb-4">{loadError.message || 'Failed to load product data. Please refresh the page.'}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#5df0c0]/10 text-[#5df0c0] rounded-lg border border-[#5df0c0]/30 hover:bg-[#5df0c0]/20"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1021] pl-64">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-4">
            <Link
              href={`/shops/${params.id}/products`}
              className="text-white/60 hover:text-white text-sm flex items-center gap-2"
            >
              <span>&larr;</span>
              <span>Back to Products</span>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-3xl font-bold text-white">
                {product?.wooTitle || 'Product Field Mappings'}
              </h1>
              {overrideCount > 0 && (
                <span className="text-xs px-2 py-1 rounded bg-[#5df0c0]/20 text-[#5df0c0] border border-[#5df0c0]/30">
                  {overrideCount} custom override{overrideCount !== 1 ? 's' : ''}
                </span>
              )}
              {product?.isValid === false && (
                <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  ⚠️ {product.validationErrors ? Object.keys(product.validationErrors).length : 0} validation issue{product.validationErrors && Object.keys(product.validationErrors).length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-white/60">
              Customize field mappings for this specific product. Overrides take priority over shop-level mappings.
            </p>

            {/* Validation Errors Banner */}
            {product?.isValid === false && product?.validationErrors && Object.keys(product.validationErrors).length > 0 && (
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-amber-400 text-lg">⚠️</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-amber-400 mb-2">
                      Validation Issues Detected
                    </div>
                    <ul className="space-y-1 text-xs text-amber-400/80">
                      {Object.entries(product.validationErrors).map(([field, errors]) => (
                        <li key={field}>
                          <span className="font-medium text-amber-400">{field}:</span>{' '}
                          {Array.isArray(errors) ? errors.join(', ') : String(errors)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {saving && (
              <div className="mt-2 text-sm text-[#5df0c0]">Saving changes...</div>
            )}
            {saveError && (
              <div className="mt-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-red-400 text-lg">!</span>
                  <div>
                    <div className="text-sm font-medium text-red-400">Failed to save</div>
                    <div className="text-xs text-red-400/80 mt-0.5">{saveError}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fields by name or description..."
              className="w-full px-4 py-3 bg-[#1a1d29] text-white rounded-lg border border-white/10 focus:outline-none focus:border-[#5df0c0]"
            />
          </div>

          {/* Column Headers */}
          <div className="grid grid-cols-[1fr_280px_1fr] gap-6 mb-6 pb-4 border-b border-white/20">
            <div className="text-sm font-semibold text-white/80">OpenAI Attribute</div>
            <div className="text-sm font-semibold text-white/80">Mapping Source</div>
            <div className="text-sm font-semibold text-white/80">Resolved Value</div>
          </div>

          {/* Field Mappings */}
          <div>
            {categories.map((category) => (
              <div key={category.id} className="mb-8">
                {/* Category Header */}
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-white">{category.label}</h2>
                  <p className="text-sm text-white/40 mt-1">{category.fields.length} fields</p>
                </div>

                {/* Field Rows */}
                <div>
                  {category.fields.map((spec) => (
                    <ProductFieldMappingRow
                      key={spec.attribute}
                      spec={spec}
                      shopMapping={shopMappings[spec.attribute] || null}
                      productOverride={productOverrides[spec.attribute] || null}
                      onOverrideChange={handleOverrideChange}
                      previewProductJson={previewProductJson}
                      previewShopData={previewShopData}
                      previewValue={resolvedValues[spec.attribute]}
                      wooFields={wooFields}
                      wooFieldsLoading={wooFieldsLoading}
                      serverValidationErrors={product?.validationErrors?.[spec.attribute] || null}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {filteredSpecs.length === 0 && (
            <div className="text-center py-12 text-white/40">
              No fields match your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
