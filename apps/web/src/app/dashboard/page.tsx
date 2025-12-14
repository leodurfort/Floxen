'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { latestFeed, listProducts, listShops } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Product, Shop } from '@productsynch/shared';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const { user, accessToken, hydrate, clear, hydrated } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedInfo, setFeedInfo] = useState<{ feedUrl: string; completedAt: string; totalProducts: number } | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const shopsRes = await listShops(accessToken);
        setShops(shopsRes.shops);
        if (shopsRes.shops.length) {
          const first = shopsRes.shops[0];
          const prodRes = await listProducts(first.id, accessToken);
          setProducts(prodRes.products);
          latestFeed(first.id, accessToken)
            .then((info) => setFeedInfo(info))
            .catch(() => setFeedInfo(null));
        } else {
          setProducts([]);
          setFeedInfo(null);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  const firstShop = useMemo(() => shops[0], [shops]);

  useEffect(() => {
    if (hydrated && (!accessToken || !user)) {
      router.push('/login');
    }
  }, [hydrated, accessToken, user, router]);

  if (!hydrated) {
    return <main className="shell"><div className="subtle">Loading session...</div></main>;
  }

  if (!accessToken || !user) return null;

  return (
    <main className="shell space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="uppercase tracking-[0.18em] text-xs text-white/60">Welcome</p>
          <h1 className="section-title">Hi {user.name || user.email}</h1>
          <p className="subtle">Manage your shops and sync products to ChatGPT.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={() => clear()}>
            Sign out
          </button>
          <Link className="btn btn--primary" href="/shops/new">
            Connect shop
          </Link>
        </div>
      </div>

      <div className="panel space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="uppercase tracking-[0.18em] text-xs text-white/60">Shops</p>
            <h2 className="section-title">Connections</h2>
          </div>
          <span className="pill">{shops.length} connected</span>
        </div>
        {error && <div className="text-sm text-red-300">{error}</div>}
        {!shops.length && !loading && <div className="subtle">No shops yet. Connect one to start syncing.</div>}
        {shops.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {shops.map((shop) => (
              <div key={shop.id} className="stat-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold">{shop.shopName}</p>
                    <p className="subtle text-sm">{shop.wooStoreUrl}</p>
                  </div>
                  <span className="badge badge--success">{shop.syncStatus.toLowerCase()}</span>
                </div>
                <p className="subtle text-sm mt-1">Currency: {shop.shopCurrency}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="uppercase tracking-[0.18em] text-xs text-white/60">Products</p>
            <h2 className="section-title">Catalog</h2>
          </div>
          {firstShop && (
            <Link className="btn" href={`/shops/${firstShop.id}/products`}>
              View all
            </Link>
          )}
        </div>
        {feedInfo && (
          <div className="stat-card">
            <p className="subtle text-sm">Latest feed</p>
            <p className="text-sm text-white underline">
              <a href={feedInfo.feedUrl} target="_blank" rel="noreferrer">
                {feedInfo.feedUrl}
              </a>
            </p>
            <p className="subtle text-sm">Updated {new Date(feedInfo.completedAt).toLocaleString()}</p>
          </div>
        )}
        {loading && <div className="subtle">Loading products...</div>}
        {!loading && !products.length && <div className="subtle">No products found.</div>}
        {products.length > 0 && (
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
                {products.slice(0, 8).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/shops/${firstShop?.id}/products/${p.id}`} className="font-semibold underline">
                        {p.wooTitle}
                      </Link>
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
