'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { OPENAI_FEED_SPEC, CATEGORY_CONFIG, REQUIRED_FIELDS, LOCKED_FIELD_MAPPINGS, OpenAIFieldCategory } from '@floxen/shared';
import { ProductSelector } from '@/components/setup/ProductSelector';
import { ShopProfileBanner } from '@/components/shops/ShopProfileBanner';
import { SyncStatusBanner } from '@/components/shops/SyncStatusBanner';
import { FieldMappingTable, FieldMappingTableSkeleton } from '@/components/setup/FieldMappingTable';
import { useFieldMappingsQuery, useUpdateFieldMappingsMutation } from '@/hooks/useFieldMappingsQuery';
import { useWooFieldsQuery, useWooProductDataQuery } from '@/hooks/useWooFieldsQuery';
import { useProductsQuery } from '@/hooks/useProductsQuery';
import { useCurrentShop } from '@/hooks/useCurrentShop';
import { PageHeader, Button, Tooltip } from '@/components/ui';

export default function SetupPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, hydrated } = useAuth();
  const { currentShop } = useCurrentShop();

  // UI state
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const hasUserSelectedProductRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showPropagationModal, setShowPropagationModal] = useState(false);
  const [skipPropagationModal, setSkipPropagationModal] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ attribute: string; newValue: string | null; overrideCount: number } | null>(null);

  const {
    data: mappingsData,
    isLoading: loading,
    error: loadError,
  } = useFieldMappingsQuery(params?.id);

  const mappings = mappingsData?.mappings ?? {};
  const userMappings = mappingsData?.userMappings ?? {};
  const overrideCounts = mappingsData?.overrideCounts ?? {};

  const {
    data: productsData,
    isLoading: productsLoading,
    error: productsQueryError,
  } = useProductsQuery(params?.id, { limit: 100, sortBy: 'title', sortOrder: 'asc' });

  const products = productsData?.products ?? [];
  const productsError = productsQueryError?.message ?? null;

  const { data: wooFields = [], isLoading: wooFieldsLoading } = useWooFieldsQuery(params?.id);

  const {
    data: previewData,
    isLoading: loadingPreview,
  } = useWooProductDataQuery(params?.id, selectedProductId);

  const previewProductJson = previewData?.wooData ?? null;
  const previewShopData = previewData?.shopData ?? null;

  const updateMappingsMutation = useUpdateFieldMappingsMutation(params?.id);
  const saving = updateMappingsMutation.isPending;

  useEffect(() => {
    return () => {
      if (saveErrorTimeoutRef.current) {
        clearTimeout(saveErrorTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (hydrated && !user) {
      router.push('/login');
    }
  }, [hydrated, user, router]);

  // Auto-select first product only if user hasn't manually selected one
  useEffect(() => {
    if (products.length > 0 && !selectedProductId && !hasUserSelectedProductRef.current) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  // Clear stale selection when selected product no longer exists in the list
  useEffect(() => {
    if (selectedProductId && products.length > 0) {
      const productExists = products.some((p) => p.id === selectedProductId);
      if (!productExists) {
        setSelectedProductId(null);
        hasUserSelectedProductRef.current = false;
      }
    }
  }, [products, selectedProductId]);

  function saveMappingChange(
    attribute: string,
    wooField: string | null,
    propagationMode: 'apply_all' | 'preserve_overrides'
  ) {
    setSaveError(null);
    const newMappings = { ...mappings, [attribute]: wooField };

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

  function handleMappingChange(attribute: string, wooField: string | null) {
    if (LOCKED_FIELD_MAPPINGS[attribute]) {
      return;
    }

    const overrideCount = overrideCounts[attribute] || 0;

    if (overrideCount === 0) {
      saveMappingChange(attribute, wooField, 'apply_all');
      return;
    }

    if (skipPropagationModal) {
      saveMappingChange(attribute, wooField, 'preserve_overrides');
      return;
    }

    setPendingChange({ attribute, newValue: wooField, overrideCount });
    setShowPropagationModal(true);
  }

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

  function handlePropagationCancel() {
    setShowPropagationModal(false);
    setPendingChange(null);
  }

  const filteredSpecs = searchQuery
    ? OPENAI_FEED_SPEC.filter(
        (spec) =>
          spec.attribute.toLowerCase().includes(searchQuery.toLowerCase()) ||
          spec.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (spec.example && spec.example.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : OPENAI_FEED_SPEC;

  const requiredFieldsMapped = REQUIRED_FIELDS.filter(
    (spec) => mappings[spec.attribute] != null && mappings[spec.attribute] !== ''
  ).length;
  const totalRequiredFields = REQUIRED_FIELDS.length;
  const allRequiredFieldsMapped = requiredFieldsMapped === totalRequiredFields;

  const categories = Object.entries(CATEGORY_CONFIG)
    .map(([id, config]) => ({
      id: id as OpenAIFieldCategory,
      label: config.label,
      order: config.order,
      fields: filteredSpecs.filter((spec) => spec.category === id),
    }))
    .filter((cat) => cat.fields.length > 0)
    .sort((a, b) => a.order - b.order);

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

          {/* Sync Status Banner - during first sync */}
          {currentShop && (
            <SyncStatusBanner shop={currentShop} />
          )}

          {/* Header */}
          <PageHeader
            title="Field Mapping Setup"
            subtitle="Map OpenAI feed attributes to your WooCommerce product fields. Changes save automatically."
            actions={
              <Tooltip
                content={!allRequiredFieldsMapped ? 'Complete all required fields first' : undefined}
                side="bottom"
              >
                <Button
                  variant={allRequiredFieldsMapped ? 'primary' : 'outline'}
                  disabled={!allRequiredFieldsMapped}
                  onClick={() => router.push(`/shops/${params?.id}/products`)}
                >
                  View Products
                </Button>
              </Tooltip>
            }
          />

          {/* Transient status indicators */}
          <div className="-mt-4 mb-6">
            {saving && (
              <div className="text-sm text-[#FA7315]">
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
              {loadingPreview && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-gray-500">Loading preview...</span>
                </div>
              )}
            </div>
          </div>

          {/* Field Mapping Table with integrated toolbar */}
          <FieldMappingTable
            categories={categories}
            mappings={mappings}
            userMappings={userMappings}
            onMappingChange={handleMappingChange}
            previewProductJson={previewProductJson}
            previewShopData={previewShopData}
            wooFields={wooFields}
            wooFieldsLoading={wooFieldsLoading}
            emptyMessage="No fields match your search."
            searchElement={
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
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
                  className="w-64 pl-9 pr-4 py-2 bg-gray-50 text-gray-900 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-[#FA7315] placeholder-gray-400"
                />
              </div>
            }
            productSelectorElement={
              productsError ? (
                <div className="w-full px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {productsError}
                </div>
              ) : productsLoading ? (
                <div className="w-full px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-500">
                  Loading items...
                </div>
              ) : products.length === 0 ? (
                <div className="w-full px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  No products available. Products will appear after your first sync.
                </div>
              ) : (
                <ProductSelector
                  products={products}
                  value={selectedProductId}
                  onChange={(productId) => {
                    hasUserSelectedProductRef.current = true;
                    setSelectedProductId(productId);
                  }}
                />
              )
            }
          />
        </div>
      </div>

      {/* Propagation Modal */}
      {showPropagationModal && pendingChange && (
        <PropagationModal
          attribute={pendingChange.attribute}
          overrideCount={pendingChange.overrideCount}
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
  overrideCount,
  onChoice,
  onCancel,
}: {
  attribute: string;
  overrideCount: number;
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
          {' '}<span className="font-medium">{overrideCount} item{overrideCount !== 1 ? 's have' : ' has'}</span> custom values for this field.
        </p>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => onChoice('apply_all', dontAskAgain)}
            className="w-full px-4 py-3 bg-[#FA7315]/10 hover:bg-[#FA7315]/20 border border-[#FA7315]/30 rounded-lg text-left transition-colors"
          >
            <div className="text-[#FA7315] font-medium">Apply to All Items</div>
            <div className="text-gray-500 text-sm mt-1">
              Reset any custom values and use this new mapping for all items.
            </div>
          </button>

          <button
            onClick={() => onChoice('preserve_overrides', dontAskAgain)}
            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-left transition-colors"
          >
            <div className="text-gray-900 font-medium">Preserve Custom Values</div>
            <div className="text-gray-500 text-sm mt-1">
              Keep existing item-level custom values. Only update items using shop defaults.
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
