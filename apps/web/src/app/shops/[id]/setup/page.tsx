'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { OPENAI_FEED_SPEC, CATEGORY_CONFIG, REQUIRED_FIELDS, LOCKED_FIELD_MAPPINGS, OpenAIFieldCategory } from '@productsynch/shared';
import { ProductSelector } from '@/components/setup/ProductSelector';
import { ShopProfileBanner } from '@/components/shops/ShopProfileBanner';
import { FieldMappingTable, FieldMappingTableSkeleton } from '@/components/setup/FieldMappingTable';
import { useFieldMappingsQuery, useUpdateFieldMappingsMutation } from '@/hooks/useFieldMappingsQuery';
import { useWooFieldsQuery, useWooProductDataQuery } from '@/hooks/useWooFieldsQuery';
import { useProductsQuery } from '@/hooks/useProductsQuery';
import { useCurrentShop } from '@/hooks/useCurrentShop';

export default function SetupPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  // Note: hydrate() is called by AppLayout, no need to call it here
  const { user, hydrated } = useAuth();

  // Get current shop for banner
  const { currentShop } = useCurrentShop();

  // Local UI state
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Propagation modal state
  const [showPropagationModal, setShowPropagationModal] = useState(false);
  const [skipPropagationModal, setSkipPropagationModal] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ attribute: string; newValue: string | null } | null>(null);

  // React Query hooks - these replace all manual data fetching
  const {
    data: mappingsData,
    isLoading: loading,
    error: loadError,
  } = useFieldMappingsQuery(params?.id);

  const mappings = mappingsData?.mappings ?? {};
  const userMappings = mappingsData?.userMappings ?? {};

  const {
    data: productsData,
    isLoading: productsLoading,
    error: productsQueryError,
  } = useProductsQuery(params?.id, { limit: 100 });

  const products = productsData?.products ?? [];
  const productsError = productsQueryError?.message ?? null;

  const { data: wooFields = [], isLoading: wooFieldsLoading } = useWooFieldsQuery(params?.id);

  const {
    data: previewData,
    isLoading: loadingPreview,
  } = useWooProductDataQuery(params?.id, selectedProductId);

  const previewProductJson = previewData?.wooData ?? null;
  const previewShopData = previewData?.shopData ?? null;

  // Mutation for updating field mappings
  const updateMappingsMutation = useUpdateFieldMappingsMutation(params?.id);
  const saving = updateMappingsMutation.isPending;

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

  // Auto-select first product when products load
  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  // Save mapping with propagation mode using mutation
  function saveMappingChange(
    attribute: string,
    wooField: string | null,
    propagationMode: 'apply_all' | 'preserve_overrides'
  ) {
    // Clear any previous errors
    setSaveError(null);

    // Build new mappings with the update
    const newMappings = { ...mappings, [attribute]: wooField };

    // Use mutation (includes optimistic update and rollback)
    updateMappingsMutation.mutate(
      { mappings: newMappings, propagationMode },
      {
        onError: (err) => {
          const errorMessage = err instanceof Error ? err.message : 'Failed to save field mapping';
          setSaveError(errorMessage);

          // Auto-clear error after 5 seconds
          if (saveErrorTimeoutRef.current) {
            clearTimeout(saveErrorTimeoutRef.current);
          }
          saveErrorTimeoutRef.current = setTimeout(() => setSaveError(null), 5000);
        },
      }
    );
  }

  // Handle mapping change - show propagation modal or save directly
  function handleMappingChange(attribute: string, wooField: string | null) {
    if (LOCKED_FIELD_MAPPINGS[attribute]) {
      return;
    }

    // If user chose to skip the modal, save with preserve_overrides
    if (skipPropagationModal) {
      saveMappingChange(attribute, wooField, 'preserve_overrides');
      return;
    }

    // Show the propagation modal
    setPendingChange({ attribute, newValue: wooField });
    setShowPropagationModal(true);
  }

  // Handle propagation modal choice
  function handlePropagationChoice(mode: 'apply_all' | 'preserve_overrides', dontAskAgain: boolean) {
    if (dontAskAgain) {
      setSkipPropagationModal(true);
    }
    setShowPropagationModal(false);

    if (pendingChange) {
      saveMappingChange(pendingChange.attribute, pendingChange.newValue, mode);
      setPendingChange(null);
    }
  }

  // Cancel propagation modal
  function handlePropagationCancel() {
    setShowPropagationModal(false);
    setPendingChange(null);
  }

  // Filter fields based on search - now includes example
  const filteredSpecs = searchQuery
    ? OPENAI_FEED_SPEC.filter(
        (spec) =>
          spec.attribute.toLowerCase().includes(searchQuery.toLowerCase()) ||
          spec.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (spec.example && spec.example.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : OPENAI_FEED_SPEC;

  // Calculate required fields mapping statistics
  const requiredFieldsMapped = REQUIRED_FIELDS.filter(
    (spec) => mappings[spec.attribute] != null && mappings[spec.attribute] !== ''
  ).length;
  const totalRequiredFields = REQUIRED_FIELDS.length;
  const allRequiredFieldsMapped = requiredFieldsMapped === totalRequiredFields;

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

  // Loading state with skeleton
  if (loading || wooFieldsLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <div className="p-4">
          <div className="w-full">
            {/* Shop Profile Banner skeleton */}
            <div className="animate-pulse mb-6">
              <div className="h-16 bg-gray-200 rounded-lg" />
            </div>

            {/* Header skeleton */}
            <div className="mb-6 animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-96 mb-4" />

              {/* Status badges skeleton */}
              <div className="flex gap-4 mt-4">
                <div className="h-8 bg-gray-200 rounded w-44" />
                <div className="h-8 bg-gray-200 rounded w-40" />
              </div>
            </div>

            {/* Search and selector row skeleton */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6 animate-pulse">
              <div className="flex-1 h-12 bg-gray-200 rounded-lg" />
              <div className="sm:w-72 space-y-1">
                <div className="h-4 bg-gray-200 rounded w-20" />
                <div className="h-10 bg-gray-200 rounded-lg" />
              </div>
            </div>

            {/* Table skeleton */}
            <FieldMappingTableSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F9FAFB]">
        <div className="text-center">
          <div className="text-red-600 mb-4">{loadError.message || 'Failed to load field mappings. Please refresh the page.'}</div>
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
          {/* Shop Profile Banner - at very top */}
          {currentShop && (
            <ShopProfileBanner shop={currentShop} currentPath="setup" />
          )}

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Field Mapping Setup</h1>
            <p className="text-gray-600">
              Map OpenAI feed attributes to your WooCommerce product fields. Changes save automatically.
            </p>
            {saving && (
              <div className="mt-2 text-sm text-[#FA7315]">
                Saving changes...
              </div>
            )}
            {saveError && (
              <div className="mt-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-red-600 text-lg">!</span>
                  <div>
                    <div className="text-sm font-medium text-red-700">Failed to save changes</div>
                    <div className="text-xs text-red-600 mt-0.5">{saveError}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Status Badges Row */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                  allRequiredFieldsMapped
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <span className={allRequiredFieldsMapped ? 'text-green-700' : 'text-amber-700'}>
                  {allRequiredFieldsMapped ? '✓' : '⚠️'} Required Fields:{' '}
                  <span className="font-medium">{requiredFieldsMapped}</span>
                  <span className="opacity-60"> / {totalRequiredFields}</span>
                </span>
                {!allRequiredFieldsMapped && (
                  <span className="text-xs text-amber-600">
                    ({totalRequiredFields - requiredFieldsMapped} missing)
                  </span>
                )}
              </div>
              {previewProductJson && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-green-700">✓ Preview data loaded</span>
                </div>
              )}
              {loadingPreview && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-gray-500">Loading preview...</span>
                </div>
              )}
            </div>
          </div>

          {/* Search and Product Selector Row */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fields..."
                className="w-64 pl-9 pr-4 py-2 bg-white text-gray-900 text-sm rounded-lg border border-gray-300 focus:outline-none focus:border-[#FA7315] placeholder-gray-400"
              />
            </div>
            <div className="sm:w-72">
              <label className="block text-xs text-gray-500 mb-1">
                Preview Data <span className="text-gray-400">(Excludes custom product matching)</span>
              </label>
              {productsError ? (
                <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {productsError}
                </div>
              ) : productsLoading ? (
                <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-500">
                  Loading products...
                </div>
              ) : (
                <ProductSelector
                  products={products}
                  value={selectedProductId}
                  onChange={setSelectedProductId}
                />
              )}
            </div>
          </div>

          {/* Field Mapping Table */}
          {categories.length > 0 ? (
            <FieldMappingTable
              categories={categories}
              mappings={mappings}
              userMappings={userMappings}
              onMappingChange={handleMappingChange}
              previewProductJson={previewProductJson}
              previewShopData={previewShopData}
              wooFields={wooFields}
              wooFieldsLoading={wooFieldsLoading}
            />
          ) : (
            <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
              No fields match your search.
            </div>
          )}
        </div>
      </div>

      {/* Propagation Modal */}
      {showPropagationModal && (
        <PropagationModal
          attribute={pendingChange?.attribute || ''}
          onChoice={handlePropagationChoice}
          onCancel={handlePropagationCancel}
        />
      )}
    </div>
  );
}

// Propagation Modal Component
function PropagationModal({
  attribute,
  onChoice,
  onCancel,
}: {
  attribute: string;
  onChoice: (mode: 'apply_all' | 'preserve_overrides', dontAskAgain: boolean) => void;
  onCancel: () => void;
}) {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Apply Mapping Change
        </h3>
        <p className="text-gray-600 text-sm mb-6">
          You're changing the mapping for <span className="text-[#FA7315] font-medium">{attribute}</span>.
          Some products may have custom overrides for this field.
        </p>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => onChoice('apply_all', dontAskAgain)}
            className="w-full px-4 py-3 bg-[#FA7315]/10 hover:bg-[#FA7315]/20 border border-[#FA7315]/30 rounded-lg text-left transition-colors"
          >
            <div className="text-[#FA7315] font-medium">Apply to All Products</div>
            <div className="text-gray-500 text-sm mt-1">
              Reset any custom overrides and use this new mapping for all products.
            </div>
          </button>

          <button
            onClick={() => onChoice('preserve_overrides', dontAskAgain)}
            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-left transition-colors"
          >
            <div className="text-gray-900 font-medium">Preserve Custom Overrides</div>
            <div className="text-gray-500 text-sm mt-1">
              Keep existing product-level overrides. Only update products using shop defaults.
            </div>
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 bg-white text-[#FA7315] focus:ring-[#FA7315]/50"
            />
            <span className="text-gray-600 text-sm">Don't ask again this session</span>
          </label>

          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-900 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
