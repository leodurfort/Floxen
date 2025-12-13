'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { listProducts } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Product } from '@productsynch/shared';

export default function ShopProductsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, hydrate, hydrated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
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
    listProducts(params.id, accessToken)
      .then((res) => setProducts(res.products))
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
                  <th>AI</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <a className="font-semibold underline" href={`/shops/${params.id}/products/${p.id}`}>
                        {p.wooTitle}
                      </a>
                      <div className="subtle text-sm">SKU {p.wooSku || '—'}</div>
                    </td>
                    <td>{p.wooPrice ? `$${p.wooPrice}` : '—'}</td>
                    <td>{p.aiEnriched ? <span className="badge badge--success">Enriched</span> : <span className="badge badge--warn">Pending</span>}</td>
                    <td className="subtle text-sm">{p.syncStatus}</td>
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
