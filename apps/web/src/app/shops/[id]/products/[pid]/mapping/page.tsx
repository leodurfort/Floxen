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
import { WooCommerceField } from '@/lib/wooCommerceFields';

interface ProductInfo {
  id: string;
  wooTitle: string;
  feedEnableSearch: boolean;
  feedEnableCheckout: boolean;
  isValid?: boolean;
  validationErrors?: Record<string, string[]> | null;
}

export default function ProductMappingPage() {
  const params = useParams<{ id: string; pid: string }>();
  const router = useRouter();
  const { accessToken, hydrate, hydrated } = useAuth();

  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [shopMappings, setShopMappings] = useState<Record<string, string | null>>({});
  const [productOverrides, setProductOverrides] = useState<ProductFieldOverrides>({});
  const [resolvedValues, setResolvedValues] = useState<Record<string, any>>({});
  const [previewProductJson, setPreviewProductJson] = useState<any | null>(null);
  const [previewShopData, setPreviewShopData] = useState<any | null>(null);
  const [wooFields, setWooFields] = useState<WooCommerceField[]>([]);
  const [wooFieldsLoading, setWooFieldsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Ref for cleanup
  const saveErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hydrate auth
  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
    if (hydrated && !accessToken) {
      router.push('/login');
    }
  }, [hydrated, accessToken, router]);

  // Load all data on mount
  // Wait for hydration to complete to ensure accessToken is properly loaded from localStorage
  useEffect(() => {
    if (!hydrated || !accessToken || !params.id || !params.pid) return;
    loadProductOverrides();
    loadProductWooData();
    loadWooFields();
  }, [hydrated, accessToken, params.id, params.pid]);

  async function loadProductOverrides() {
    if (!accessToken) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/shops/${params.id}/products/${params.pid}/field-overrides`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error('Failed to load product overrides');
      const data = await res.json();

      setProduct({
        id: data.productId,
        wooTitle: data.productTitle,
        feedEnableSearch: data.feedEnableSearch,
        feedEnableCheckout: data.feedEnableCheckout,
        isValid: data.isValid,
        validationErrors: data.validationErrors,
      });
      setShopMappings(data.shopMappings || {});
      setProductOverrides(data.overrides || {});
      setResolvedValues(data.resolvedValues || {});
    } catch {
      setLoadError('Failed to load product data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }

  async function loadProductWooData() {
    if (!accessToken) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/shops/${params.id}/products/${params.pid}/woo-data`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error('Failed to load WooCommerce data');
      const data = await res.json();
      setPreviewProductJson(data.wooData);
      setPreviewShopData(data.shopData);
    } catch {
      // WooCommerce data load failed silently
    }
  }

  async function loadWooFields() {
    if (!accessToken) return;
    setWooFieldsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/shops/${params.id}/woo-fields`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error('Failed to load WooCommerce fields');
      const data = await res.json();
      setWooFields(data.fields || []);
    } catch {
      // WooCommerce fields load failed silently
    } finally {
      setWooFieldsLoading(false);
    }
  }

  // Debounced save function
  const handleOverrideChange = useCallback(
    async (attribute: string, override: ProductFieldOverride | null) => {
      setSaveError(null);

      // Optimistic update
      const newOverrides = { ...productOverrides };
      if (override) {
        newOverrides[attribute] = override;
      } else {
        delete newOverrides[attribute];
      }
      setProductOverrides(newOverrides);

      // Save to API
      setSaving(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/shops/${params.id}/products/${params.pid}/field-overrides`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ overrides: newOverrides }),
          }
        );

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to save override');
        }

        const data = await res.json();
        // Update with server response
        setProductOverrides(data.overrides || {});
        setResolvedValues(data.resolvedValues || {});
        // Update validation status
        if (product) {
          setProduct({
            ...product,
            isValid: data.isValid,
            validationErrors: data.validationErrors,
          });
        }
      } catch (err) {
        // Revert optimistic update
        setProductOverrides(productOverrides);
        const errorMessage = err instanceof Error ? err.message : 'Failed to save override';
        setSaveError(errorMessage);
        // Auto-clear error after 5 seconds (with cleanup)
        if (saveErrorTimeoutRef.current) {
          clearTimeout(saveErrorTimeoutRef.current);
        }
        saveErrorTimeoutRef.current = setTimeout(() => setSaveError(null), 5000);
      } finally {
        setSaving(false);
      }
    },
    [accessToken, params.id, params.pid, productOverrides]
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
