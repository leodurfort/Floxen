'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { listProducts, getShop, refreshFeed } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Product, Shop } from '@productsynch/shared';

// Helper to truncate text
function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return '—';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Helper to get image from WooCommerce raw JSON
function getProductImage(wooRawJson: any): string | null {
  if (!wooRawJson) return null;
  const images = wooRawJson.images;
  if (Array.isArray(images) && images.length > 0 && images[0].src) {
    return images[0].src;
  }
  return null;
}

// Helper to get permalink from WooCommerce raw JSON
function getProductUrl(wooRawJson: any): string | null {
  if (!wooRawJson) return null;
  return wooRawJson.permalink || null;
}

export default function ShopProductsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, hydrate, hydrated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedRefreshing, setFeedRefreshing] = useState(false);
  const [feedSuccess, setFeedSuccess] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.push('/login');
    }
  }, [hydrated, accessToken, router]);

  useEffect(() => {
    if (!accessToken || !params?.id) return;
    setLoading(true);
    setError(null);
    Promise.all([
      listProducts(params.id, accessToken),
      getShop(params.id, accessToken),
    ])
      .then(([productsRes, shopRes]) => {
        setProducts(productsRes.products);
        setShop(shopRes.shop);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, params?.id]);

  // Navigate to product mapping page
  const handleRowClick = (productId: string) => {
    router.push(`/shops/${params.id}/products/${productId}/mapping`);
  };

  // Refresh OpenAI feed
  const handleRefreshFeed = async () => {
    if (!accessToken || !params?.id) return;
    setFeedRefreshing(true);
    setFeedSuccess(null);
    setError(null);
    try {
      await refreshFeed(params.id, accessToken);
      setFeedSuccess('Feed refreshed successfully!');
      // Clear success message after 3 seconds
      setTimeout(() => setFeedSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh feed');
    } finally {
      setFeedRefreshing(false);
    }
  };

  if (!hydrated) {
    return <main className="shell"><div className="subtle">Loading session...</div></main>;
  }
  if (!accessToken) return null;

  return (
    <main className="shell space-y-4">
      <div className="panel space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="uppercase tracking-[0.18em] text-xs text-white/60">Products</p>
            <h1 className="section-title">Catalog</h1>
          </div>
          <div className="flex items-center gap-3">
            {feedSuccess && (
              <span className="text-sm text-[#5df0c0]">{feedSuccess}</span>
            )}
            <button
              onClick={handleRefreshFeed}
              disabled={feedRefreshing}
              className="px-4 py-2 bg-[#5df0c0] text-black font-medium rounded-lg hover:bg-[#5df0c0]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
            >
              {feedRefreshing ? 'Refreshing...' : 'Refresh Feed'}
            </button>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'https://api-production-6a74.up.railway.app'}/api/v1/feed/${params.id}/view`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-white/20 text-white/80 font-medium rounded-lg hover:bg-white/5 transition-all text-sm"
            >
              View Feed
            </a>
          </div>
        </div>
        {error && <div className="text-sm text-red-300">{error}</div>}
        {loading && <div className="subtle">Loading products...</div>}
        {!loading && !products.length && <div className="subtle">No products found.</div>}
        {!loading && products.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-16">ID</th>
                  <th className="w-16">Image</th>
                  <th>Name</th>
                  <th>URL</th>
                  <th className="w-24">Price</th>
                  <th className="w-24">Status</th>
                  <th className="w-24">Overrides</th>
                  <th className="w-20">Valid</th>
                  <th>Last Modified</th>
                  <th className="w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const imageUrl = getProductImage(p.wooRawJson);
                  const productUrl = getProductUrl(p.wooRawJson);
                  const validationCount = p.validationErrors ? Object.keys(p.validationErrors).length : 0;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleRowClick(p.id)}
                      className="cursor-pointer hover:bg-white/5 transition-colors"
                    >
                      {/* ID */}
                      <td className="font-mono text-sm">{p.wooProductId}</td>

                      {/* Image */}
                      <td>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={p.wooTitle || 'Product'}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center text-white/30 text-xs">
                            —
                          </div>
                        )}
                      </td>

                      {/* Name */}
                      <td className="text-sm text-white/80 max-w-[200px]">
                        {truncate(p.wooTitle, 60)}
                      </td>

                      {/* URL */}
                      <td className="text-sm max-w-[180px]">
                        {productUrl ? (
                          <a
                            href={productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[#5df0c0] hover:text-[#5df0c0]/80 truncate block"
                            title={productUrl}
                          >
                            {truncate(productUrl, 30)}
                          </a>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </td>

                      {/* Price */}
                      <td>{p.wooPrice ? `$${p.wooPrice}` : '—'}</td>

                      {/* Status */}
                      <td className="subtle text-sm">{p.syncStatus}</td>

                      {/* Overrides */}
                      <td className="text-sm text-center">
                        {p.productFieldOverrides && Object.keys(p.productFieldOverrides).length > 0 ? (
                          <span className="text-[#5df0c0]">{Object.keys(p.productFieldOverrides).length}</span>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </td>

                      {/* Validation */}
                      <td>
                        {p.isValid === false ? (
                          <div className="relative group">
                            <span className="text-amber-400 cursor-help">⚠️ {validationCount}</span>
                            <div className="absolute left-0 top-6 hidden group-hover:block z-20 w-80 p-3 bg-gray-900 border border-amber-500/30 rounded-lg shadow-xl text-xs">
                              <div className="font-semibold text-amber-400 mb-2">
                                {validationCount} validation issue{validationCount !== 1 ? 's' : ''}
                              </div>
                              {p.validationErrors && (
                                <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                                  {Object.entries(p.validationErrors).map(([field, errors]) => (
                                    <li key={field} className="text-white/80">
                                      <span className="text-white font-medium">{field}:</span>{' '}
                                      {Array.isArray(errors) ? errors.join(', ') : String(errors)}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#5df0c0]">✓</span>
                        )}
                      </td>

                      {/* Last Modified */}
                      <td className="subtle text-sm whitespace-nowrap">
                        {p.wooDateModified ? new Date(p.wooDateModified).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }) : '—'}
                      </td>

                      {/* Actions */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleRowClick(p.id)}
                          className="text-[#5df0c0] hover:text-[#5df0c0]/80 text-sm font-medium"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
