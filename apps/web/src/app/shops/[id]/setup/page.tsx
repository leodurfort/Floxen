'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { OPENAI_FEED_SPEC, CATEGORY_CONFIG, Product, REQUIRED_FIELDS, LOCKED_FIELD_MAPPINGS } from '@productsynch/shared';
import { FieldMappingRow } from '@/components/setup/FieldMappingRow';
import { ProductSelector } from '@/components/setup/ProductSelector';
import { WooCommerceField } from '@/lib/wooCommerceFields';
import { getFieldMappings, getWooFields, updateFieldMappings, listProducts, API_URL } from '@/lib/api';

export default function SetupPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  // Note: hydrate() is called by AppLayout, no need to call it here
  const { accessToken, hydrated } = useAuth();

  const [mappings, setMappings] = useState<Record<string, string | null>>({});
  const [userMappings, setUserMappings] = useState<Record<string, string | null>>({});

  // Refs to track current state - prevents stale closure issues in async operations
  const mappingsRef = useRef<Record<string, string | null>>({});
  const userMappingsRef = useRef<Record<string, string | null>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [previewProductJson, setPreviewProductJson] = useState<Record<string, unknown> | null>(null);
  const [previewShopData, setPreviewShopData] = useState<Record<string, unknown> | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [wooFields, setWooFields] = useState<WooCommerceField[]>([]);
  const [wooFieldsLoading, setWooFieldsLoading] = useState(true);

  // Refs for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const saveErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Propagation modal state
  const [showPropagationModal, setShowPropagationModal] = useState(false);
  const [skipPropagationModal, setSkipPropagationModal] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ attribute: string; newValue: string | null } | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveErrorTimeoutRef.current) {
        clearTimeout(saveErrorTimeoutRef.current);
      }
    };
  }, []);

  // Keep refs in sync with state to avoid stale closures
  useEffect(() => {
    mappingsRef.current = mappings;
  }, [mappings]);

  useEffect(() => {
    userMappingsRef.current = userMappings;
  }, [userMappings]);

  // Redirect if not logged in
  useEffect(() => {
    if (hydrated && !accessToken) {
      router.push('/login');
    }
  }, [hydrated, accessToken, router]);

  // Load mappings, products, and woo fields on mount
  // Wait for hydration to complete to ensure accessToken is properly loaded from localStorage
  useEffect(() => {
    if (!hydrated || !accessToken || !params.id) return;
    loadMappings();
    loadProducts();
    loadWooFields();
  }, [hydrated, accessToken, params.id]);

  async function loadMappings() {
    if (!accessToken || !params.id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getFieldMappings(params.id, accessToken);

      // Initialize enable_search to ENABLED by default if not set
      const loadedMappings = { ...(data.mappings || {}) };
      Object.entries(LOCKED_FIELD_MAPPINGS).forEach(([attribute, lockedValue]) => {
        loadedMappings[attribute] = lockedValue;
      });
      if (!loadedMappings.enable_search) {
        loadedMappings.enable_search = 'ENABLED';
      }

      // Update both state and refs
      mappingsRef.current = loadedMappings;
      userMappingsRef.current = data.userMappings || {};
      setMappings(loadedMappings);
      setUserMappings(data.userMappings || {});
    } catch {
      setLoadError('Failed to load field mappings. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    if (!accessToken || !params.id) return;
    setProductsLoading(true);
    setProductsError(null);
    try {
      const data = await listProducts(params.id, accessToken);
      setProducts(data.products || []);
      // Auto-select first product if available
      if (data.products && data.products.length > 0) {
        setSelectedProductId(data.products[0].id);
      }
    } catch {
      setProductsError('Failed to load products for preview.');
    } finally {
      setProductsLoading(false);
    }
  }

  async function loadWooFields() {
    if (!accessToken || !params.id) return;
    setWooFieldsLoading(true);
    try {
      const data = await getWooFields(params.id, accessToken);
      setWooFields(data.fields || []);
    } catch (error) {
      console.error('Failed to load WooCommerce fields:', error);
    } finally {
      setWooFieldsLoading(false);
    }
  }

  // Load WooCommerce data when selected product changes
  useEffect(() => {
    if (!selectedProductId || !accessToken) {
      setPreviewProductJson(null);
      setPreviewShopData(null);
      return;
    }

    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    async function fetchPreview() {
      setLoadingPreview(true);
      const url = `${API_URL}/api/v1/shops/${params.id}/products/${selectedProductId}/woo-data`;

      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Failed to load product WooCommerce data: ${res.status} ${errorText}`);
        }

        const data = await res.json();
        setPreviewProductJson(data.wooData);
        setPreviewShopData(data.shopData);
      } catch (err) {
        // Don't update state if request was aborted
        if (err instanceof Error && err.name === 'AbortError') return;
        setPreviewProductJson(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoadingPreview(false);
        }
      }
    }

    fetchPreview();

    return () => {
      controller.abort();
    };
  }, [selectedProductId, accessToken, params.id]);

  // Save mapping with propagation mode
  async function saveMappingChange(
    attribute: string,
    wooField: string | null,
    propagationMode: 'apply_all' | 'preserve_overrides'
  ) {
    // Use refs to get current state (avoids stale closure issues)
    const currentMappings = mappingsRef.current;
    const currentUserMappings = userMappingsRef.current;

    // Save old values for rollback
    const oldValue = currentMappings[attribute] ?? null;
    const oldUserValue = currentUserMappings[attribute] ?? null;

    // Clear any previous errors
    setSaveError(null);

    // Build new mappings with the update
    const newMappings = { ...currentMappings, [attribute]: wooField };
    const newUserMappings = { ...currentUserMappings, [attribute]: wooField };

    // Optimistic update - also update refs immediately for any concurrent operations
    mappingsRef.current = newMappings;
    userMappingsRef.current = newUserMappings;
    setMappings(newMappings);
    setUserMappings(newUserMappings);

    // Auto-save to API (uses request helper with automatic token refresh)
    setSaving(true);
    try {
      if (!params.id) throw new Error('Shop ID is required');
      await updateFieldMappings(params.id, newMappings, propagationMode, accessToken!);
    } catch (err) {
      // Revert optimistic update using functional form for safety
      setMappings(prev => ({ ...prev, [attribute]: oldValue }));
      setUserMappings(prev => ({ ...prev, [attribute]: oldUserValue }));
      // Also revert refs
      mappingsRef.current = { ...mappingsRef.current, [attribute]: oldValue };
      userMappingsRef.current = { ...userMappingsRef.current, [attribute]: oldUserValue };

      // Show error message
      const errorMessage = err instanceof Error ? err.message : 'Failed to save field mapping';
      setSaveError(errorMessage);

      // Auto-clear error after 5 seconds (with cleanup)
      if (saveErrorTimeoutRef.current) {
        clearTimeout(saveErrorTimeoutRef.current);
      }
      saveErrorTimeoutRef.current = setTimeout(() => setSaveError(null), 5000);
    } finally {
      setSaving(false);
    }
  }

  // Handle mapping change - show propagation modal or save directly
  async function handleMappingChange(attribute: string, wooField: string | null) {
    if (LOCKED_FIELD_MAPPINGS[attribute]) {
      return;
    }

    // If user chose to skip the modal, save with preserve_overrides
    if (skipPropagationModal) {
      await saveMappingChange(attribute, wooField, 'preserve_overrides');
      return;
    }

    // Show the propagation modal
    setPendingChange({ attribute, newValue: wooField });
    setShowPropagationModal(true);
  }

  // Handle propagation modal choice
  async function handlePropagationChoice(mode: 'apply_all' | 'preserve_overrides', dontAskAgain: boolean) {
    if (dontAskAgain) {
      setSkipPropagationModal(true);
    }
    setShowPropagationModal(false);

    if (pendingChange) {
      await saveMappingChange(pendingChange.attribute, pendingChange.newValue, mode);
      setPendingChange(null);
    }
  }

  // Cancel propagation modal
  function handlePropagationCancel() {
    setShowPropagationModal(false);
    setPendingChange(null);
  }

  // Filter fields based on search
  const filteredSpecs = searchQuery
    ? OPENAI_FEED_SPEC.filter(
        (spec) =>
          spec.attribute.toLowerCase().includes(searchQuery.toLowerCase()) ||
          spec.description.toLowerCase().includes(searchQuery.toLowerCase())
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
      id: id as any,
      label: config.label,
      order: config.order,
      fields: filteredSpecs.filter((spec) => spec.category === id),
    }))
    .filter((cat) => cat.fields.length > 0)
    .sort((a, b) => a.order - b.order);

  if (loading || wooFieldsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white">Loading field mappings...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-red-400 mb-4">{loadError}</div>
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
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Field Mapping Setup</h1>
            <p className="text-white/60">
              Map OpenAI feed attributes to your WooCommerce product fields. Changes save automatically.
            </p>
            {saving && (
              <div className="mt-2 text-sm text-[#5df0c0]">
                Saving changes...
              </div>
            )}
            {saveError && (
              <div className="mt-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-red-400 text-lg">⚠️</span>
                  <div>
                    <div className="text-sm font-medium text-red-400">Failed to save changes</div>
                    <div className="text-xs text-red-400/80 mt-0.5">{saveError}</div>
                  </div>
                </div>
              </div>
            )}
            {/* Required Fields Counter */}
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div
                className={`px-3 py-1.5 rounded-lg border ${
                  allRequiredFieldsMapped
                    ? 'bg-[#5df0c0]/10 border-[#5df0c0]/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}
              >
                <span className={allRequiredFieldsMapped ? 'text-[#5df0c0]/80' : 'text-amber-400'}>
                  {allRequiredFieldsMapped ? '✓' : '⚠️'} Required Fields: {' '}
                  <span className="font-medium">{requiredFieldsMapped}</span>
                  <span className="opacity-60"> / {totalRequiredFields}</span>
                </span>
                {!allRequiredFieldsMapped && (
                  <span className="ml-2 text-xs text-amber-400/80">
                    ({totalRequiredFields - requiredFieldsMapped} missing)
                  </span>
                )}
              </div>
              {previewProductJson && (
                <div className="px-3 py-1.5 bg-[#5df0c0]/10 rounded-lg border border-[#5df0c0]/30">
                  <span className="text-[#5df0c0]/80">✓ Preview data loaded</span>
                </div>
              )}
            </div>
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
            <div className="text-sm font-semibold text-white/80">
              OpenAI Attribute
            </div>
            <div className="text-sm font-semibold text-white/80">
              WooCommerce Field
            </div>
            <div className="text-sm font-semibold text-white/80">
              <div className="mb-2 flex items-center gap-2">
                Preview Data
                <span className="text-xs font-normal text-white/50">(Excludes custom product matching)</span>
                {loadingPreview && (
                  <span className="text-xs text-[#5df0c0]">Loading...</span>
                )}
              </div>
              {productsError ? (
                <div className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                  {productsError}
                </div>
              ) : productsLoading ? (
                <div className="px-4 py-2 bg-[#252936] rounded-lg border border-white/10 text-sm text-white/50">
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

          {/* Field Mappings - One Continuous List */}
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
                    <FieldMappingRow
                      key={spec.attribute}
                      spec={spec}
                      currentMapping={mappings[spec.attribute] || null}
                      isUserSelected={spec.attribute in userMappings}
                      onMappingChange={handleMappingChange}
                      previewProductJson={previewProductJson}
                      previewShopData={previewShopData}
                      wooFields={wooFields}
                      wooFieldsLoading={wooFieldsLoading}
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#1a1d29] rounded-xl border border-white/10 p-6 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-xl font-semibold text-white mb-2">
          Apply Mapping Change
        </h3>
        <p className="text-white/60 text-sm mb-6">
          You're changing the mapping for <span className="text-[#5df0c0] font-medium">{attribute}</span>.
          Some products may have custom overrides for this field.
        </p>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => onChoice('apply_all', dontAskAgain)}
            className="w-full px-4 py-3 bg-[#5df0c0]/10 hover:bg-[#5df0c0]/20 border border-[#5df0c0]/30 rounded-lg text-left transition-colors"
          >
            <div className="text-[#5df0c0] font-medium">Apply to All Products</div>
            <div className="text-white/50 text-sm mt-1">
              Reset any custom overrides and use this new mapping for all products.
            </div>
          </button>

          <button
            onClick={() => onChoice('preserve_overrides', dontAskAgain)}
            className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-left transition-colors"
          >
            <div className="text-white font-medium">Preserve Custom Overrides</div>
            <div className="text-white/50 text-sm mt-1">
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
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#5df0c0] focus:ring-[#5df0c0]/50"
            />
            <span className="text-white/60 text-sm">Don't ask again this session</span>
          </label>

          <button
            onClick={onCancel}
            className="text-white/50 hover:text-white text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
