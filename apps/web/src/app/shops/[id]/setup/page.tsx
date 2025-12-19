'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { OPENAI_FEED_SPEC, CATEGORY_CONFIG, Product, REQUIRED_FIELDS, LOCKED_FIELD_MAPPINGS } from '@productsynch/shared';
import { FieldMappingRow } from '@/components/setup/FieldMappingRow';
import { ProductSelector } from '@/components/setup/ProductSelector';
import { WooCommerceField } from '@/lib/wooCommerceFields';

export default function SetupPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, hydrate, hydrated } = useAuth();

  const [mappings, setMappings] = useState<Record<string, string | null>>({});
  const [userMappings, setUserMappings] = useState<Record<string, string | null>>({});
  const [specDefaults, setSpecDefaults] = useState<Record<string, string | null>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [previewProductJson, setPreviewProductJson] = useState<any | null>(null);
  const [previewShopData, setPreviewShopData] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [wooFields, setWooFields] = useState<WooCommerceField[]>([]);
  const [wooFieldsLoading, setWooFieldsLoading] = useState(true);

  // Propagation modal state
  const [showPropagationModal, setShowPropagationModal] = useState(false);
  const [skipPropagationModal, setSkipPropagationModal] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ attribute: string; newValue: string | null } | null>(null);

  // Hydrate auth
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Redirect if not logged in
  useEffect(() => {
    if (hydrated && !accessToken) {
      router.push('/login');
    }
  }, [hydrated, accessToken, router]);

  // Load mappings, products, and woo fields on mount
  useEffect(() => {
    if (!accessToken || !params.id) return;
    loadMappings();
    loadProducts();
    loadWooFields();
  }, [accessToken, params.id]);

  async function loadMappings() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/shops/${params.id}/field-mappings`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to load mappings');
      const data = await res.json();

      // Initialize enable_search to ENABLED by default if not set
      const loadedMappings = { ...(data.mappings || {}) };
      Object.entries(LOCKED_FIELD_MAPPINGS).forEach(([attribute, lockedValue]) => {
        loadedMappings[attribute] = lockedValue;
      });
      if (!loadedMappings.enable_search) {
        loadedMappings.enable_search = 'ENABLED';
      }

      setMappings(loadedMappings);
      setUserMappings(data.userMappings || {});
      setSpecDefaults(data.specDefaults || {});
    } catch (err) {
      console.error('[Setup] Failed to load mappings', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    if (!accessToken) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/shops/${params.id}/products`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      setProducts(data.products || []);
      // Auto-select first product if available
      if (data.products && data.products.length > 0) {
        setSelectedProductId(data.products[0].id);
      }
    } catch (err) {
      console.error('[Setup] Failed to load products', err);
    }
  }

  async function loadWooFields() {
    if (!accessToken) return;
    setWooFieldsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/shops/${params.id}/woo-fields`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to load WooCommerce fields');
      const data = await res.json();
      setWooFields(data.fields || []);
    } catch (err) {
      console.error('[Setup] Failed to load WooCommerce fields', err);
    } finally {
      setWooFieldsLoading(false);
    }
  }

  async function loadProductWooData(productId: string) {
    if (!accessToken) return;
    setLoadingPreview(true);

    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/shops/${params.id}/products/${productId}/woo-data`;

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to load product WooCommerce data: ${res.status} ${errorText}`);
      }

      const data = await res.json();
      setPreviewProductJson(data.wooData);
      setPreviewShopData(data.shopData);
    } catch (err) {
      console.error('[Setup] Failed to load product WooCommerce data:', err);
      setPreviewProductJson(null);
    } finally {
      setLoadingPreview(false);
    }
  }

  // Load WooCommerce data when selected product changes
  useEffect(() => {
    if (selectedProductId && accessToken) {
      loadProductWooData(selectedProductId);
    } else {
      setPreviewProductJson(null);
      setPreviewShopData(null);
    }
  }, [selectedProductId, accessToken]);

  // Save mapping with propagation mode
  async function saveMappingChange(
    attribute: string,
    wooField: string | null,
    propagationMode: 'apply_all' | 'preserve_overrides'
  ) {
    // Save old values for rollback
    const oldValue = mappings[attribute];
    const oldUserValue = userMappings[attribute];

    // Clear any previous errors
    setSaveError(null);

    // Optimistic update
    const newMappings = { ...mappings, [attribute]: wooField };
    const newUserMappings = { ...userMappings, [attribute]: wooField };
    setMappings(newMappings);
    setUserMappings(newUserMappings);

    // Auto-save to API
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/shops/${params.id}/field-mappings`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mappings: newMappings, propagationMode }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to save mapping: ${errorText}`);
      }
    } catch (err) {
      console.error('[Setup] Failed to save mapping', err);

      // Revert optimistic update
      setMappings({ ...mappings, [attribute]: oldValue });
      setUserMappings({ ...userMappings, [attribute]: oldUserValue });

      // Show error message
      const errorMessage = err instanceof Error ? err.message : 'Failed to save field mapping';
      setSaveError(errorMessage);

      // Auto-clear error after 5 seconds
      setTimeout(() => setSaveError(null), 5000);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white">Loading mappings...</div>
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
              <ProductSelector
                products={products}
                value={selectedProductId}
                onChange={setSelectedProductId}
              />
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
