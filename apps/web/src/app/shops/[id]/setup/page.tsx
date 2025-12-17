'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { OPENAI_FEED_SPEC, CATEGORY_CONFIG, Product } from '@productsynch/shared';
import { FieldMappingRow } from '@/components/setup/FieldMappingRow';
import { ProductSelector } from '@/components/setup/ProductSelector';

export default function SetupPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, hydrate, hydrated } = useAuth();

  const [mappings, setMappings] = useState<Record<string, string | null>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [previewProductJson, setPreviewProductJson] = useState<any | null>(null);
  const [previewShopData, setPreviewShopData] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  // Load mappings and products on mount
  useEffect(() => {
    if (!accessToken || !params.id) return;
    loadMappings();
    loadProducts();
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
      console.log('[Setup] Loaded field mappings:', {
        totalMappings: Object.keys(data.mappings || {}).length,
        mappings: data.mappings,
        sampleMappings: Object.entries(data.mappings || {}).slice(0, 10),
      });

      // Initialize enable_search to ENABLED by default if not set
      const loadedMappings = data.mappings || {};
      if (!loadedMappings.enable_search) {
        loadedMappings.enable_search = 'ENABLED';
      }

      setMappings(loadedMappings);
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

  async function loadProductWooData(productId: string) {
    if (!accessToken) return;
    setLoadingPreview(true);

    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/shops/${params.id}/products/${productId}/woo-data`;
    console.log('[Setup] Loading product WooCommerce data:', {
      url,
      productId,
      shopId: params.id,
    });

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      console.log('[Setup] Response status:', res.status, res.statusText);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Setup] API error response:', errorText);
        throw new Error(`Failed to load product WooCommerce data: ${res.status} ${errorText}`);
      }

      const data = await res.json();
      console.log('[Setup] Received WooCommerce data:', {
        hasWooData: !!data.wooData,
        hasShopData: !!data.shopData,
        wooDataKeys: data.wooData ? Object.keys(data.wooData).slice(0, 10) : [],
        shopDataKeys: data.shopData ? Object.keys(data.shopData) : [],
        shopDataValues: data.shopData,
        sampleData: data.wooData ? {
          id: data.wooData.id,
          name: data.wooData.name,
          price: data.wooData.price,
        } : null,
      });

      console.log('[Setup] Setting preview shop data:', data.shopData);
      setPreviewProductJson(data.wooData);
      setPreviewShopData(data.shopData);
    } catch (err) {
      console.error('[Setup] Failed to load product WooCommerce data:', {
        error: err,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
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

  // Debug: Log when preview data changes
  useEffect(() => {
    console.log('[Setup] Preview data state changed:', {
      hasData: !!previewProductJson,
      dataKeys: previewProductJson ? Object.keys(previewProductJson).slice(0, 15) : [],
      selectedProductId,
    });
  }, [previewProductJson, selectedProductId]);

  async function handleMappingChange(attribute: string, wooField: string | null) {
    // Save old value for rollback
    const oldValue = mappings[attribute];

    // Clear any previous errors
    setSaveError(null);

    // Optimistic update
    const newMappings = { ...mappings, [attribute]: wooField };
    setMappings(newMappings);

    // Auto-save to API
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/shops/${params.id}/field-mappings`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mappings: newMappings }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to save mapping: ${errorText}`);
      }
    } catch (err) {
      console.error('[Setup] Failed to save mapping', err);

      // Revert optimistic update
      setMappings({ ...mappings, [attribute]: oldValue });

      // Show error message
      const errorMessage = err instanceof Error ? err.message : 'Failed to save field mapping';
      setSaveError(errorMessage);

      // Auto-clear error after 5 seconds
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setSaving(false);
    }
  }

  // Filter fields based on search
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
            {/* Mapping Statistics */}
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                <span className="text-white/60">Mapped Fields: </span>
                <span className="text-white font-medium">{Object.keys(mappings).length}</span>
                <span className="text-white/40"> / {OPENAI_FEED_SPEC.length}</span>
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
                      onMappingChange={handleMappingChange}
                      previewProductJson={previewProductJson}
                      previewShopData={previewShopData}
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
