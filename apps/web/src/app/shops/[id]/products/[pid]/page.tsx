'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { listProducts, requestProduct } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Product } from '@productsynch/shared';

export default function ProductDetailPage() {
  const params = useParams<{ id: string; pid: string }>();
  const router = useRouter();
  const { accessToken, hydrate, hydrated } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !accessToken) router.push('/login');
  }, [hydrated, accessToken, router]);

  useEffect(() => {
    if (!accessToken || !params?.id || !params?.pid) return;
    setLoading(true);
    setError(null);
    requestProduct(params.id, params.pid, accessToken)
      .then((res) => setProduct(res.product))
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, params?.id, params?.pid]);

  if (!hydrated) return <main className="shell"><div className="subtle">Loading session...</div></main>;
  if (!accessToken) return null;

  return (
    <main className="shell space-y-4">
      <div className="panel space-y-2">
        <p className="uppercase tracking-[0.18em] text-xs text-white/60">Product</p>
        <h1 className="section-title">{product?.wooTitle || 'Product detail'}</h1>
        {error && <div className="text-sm text-red-300">{error}</div>}
        {loading && <div className="subtle">Loading product...</div>}
        {product && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="stat-card">
              <p className="subtle text-sm">SKU</p>
              <p className="text-lg font-semibold">{product.wooSku || '—'}</p>
            </div>
            <div className="stat-card">
              <p className="subtle text-sm">Price</p>
              <p className="text-lg font-semibold">{product.wooPrice ? `$${product.wooPrice}` : '—'}</p>
            </div>
            <div className="stat-card">
              <p className="subtle text-sm">Sync status</p>
              <p className="text-lg font-semibold">{product.syncStatus}</p>
            </div>
            <div className="stat-card">
              <p className="subtle text-sm">AI enriched</p>
              <p className="text-lg font-semibold">{product.aiEnriched ? 'Yes' : 'No'}</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
