'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { listProducts, getShop } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Product, Shop } from '@productsynch/shared';

export default function ShopProductsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, hydrate, hydrated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!hydrated) {
    return <main className="shell"><div className="subtle">Loading session...</div></main>;
  }
  if (!accessToken) return null;

  return (
    <main className="shell space-y-4">
      <div className="panel space-y-2">
        <p className="uppercase tracking-[0.18em] text-xs text-white/60">Products</p>
        <h1 className="section-title">Catalog</h1>
        {error && <div className="text-sm text-red-300">{error}</div>}
        {loading && <div className="subtle">Loading products...</div>}
        {!loading && !products.length && <div className="subtle">No products found.</div>}
        {!loading && products.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>WooCommerce Last Modified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{p.wooTitle}</span>
                        {p.isValid === false && (
                          <div className="relative group">
                            <span className="text-amber-400 cursor-help">⚠️</span>
                            <div className="absolute left-0 top-6 hidden group-hover:block z-20 w-80 p-3 bg-gray-900 border border-amber-500/30 rounded-lg shadow-xl text-xs">
                              <div className="font-semibold text-amber-400 mb-2">
                                {p.validationErrors
                                  ? `${Object.keys(p.validationErrors).length} validation issue(s)`
                                  : 'Validation issues detected'}
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
                        )}
                      </div>
                      <div className="subtle text-sm">SKU {p.wooSku || '—'}</div>
                    </td>
                    <td>{p.wooPrice ? `$${p.wooPrice}` : '—'}</td>
                    <td className="subtle text-sm">{p.syncStatus}</td>
                    <td className="subtle text-sm">
                      {p.wooDateModified ? new Date(p.wooDateModified).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      }) : '—'}
                    </td>
                    <td>
                      <Link
                        href={`/shops/${params.id}/products/${p.id}/mapping`}
                        className="text-[#5df0c0] hover:text-[#5df0c0]/80 text-sm font-medium"
                      >
                        Customize Mappings
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
