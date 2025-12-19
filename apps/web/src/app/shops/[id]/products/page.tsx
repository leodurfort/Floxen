'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { listProducts, getShop, triggerProductSync } from '@/lib/api';
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
  const [syncing, setSyncing] = useState(false);

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

  // Determine if field mappings were updated after last sync
  const needsResync = shop?.fieldMappingsUpdatedAt && (
    !shop.lastSyncAt ||
    new Date(shop.fieldMappingsUpdatedAt) > new Date(shop.lastSyncAt)
  );

  const handleResync = async () => {
    if (!accessToken || !params?.id || syncing) return;
    setSyncing(true);
    try {
      await triggerProductSync(params.id, accessToken, true);
      // Refresh shop data to update the banner status
      const shopRes = await getShop(params.id, accessToken);
      setShop(shopRes.shop);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (!hydrated) {
    return <main className="shell"><div className="subtle">Loading session...</div></main>;
  }
  if (!accessToken) return null;

  return (
    <main className="shell space-y-4">
      {needsResync && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-amber-200 font-medium text-sm">Field mappings updated</p>
              <p className="text-amber-200/70 text-xs">Your catalog data may be stale. Resync to apply the new mappings.</p>
            </div>
          </div>
          <button
            onClick={handleResync}
            disabled={syncing}
            className="px-4 py-1.5 text-sm font-medium rounded-lg bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {syncing ? 'Syncing...' : 'Resync Now'}
          </button>
        </div>
      )}
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
                      <div className="font-semibold">{p.wooTitle}</div>
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
