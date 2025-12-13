'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createShop } from '@/lib/api';
import { useAuth } from '@/store/auth';

export default function NewShopPage() {
  const { accessToken, hydrate, hydrated } = useAuth();
  const router = useRouter();
  const [storeUrl, setStoreUrl] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopCurrency, setShopCurrency] = useState('USD');
  const [authUrl, setAuthUrl] = useState<string | null>(null);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const result = await createShop({ storeUrl, shopName, shopCurrency }, accessToken);
      setAuthUrl(result.authUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell space-y-4">
      <div className="panel space-y-3 max-w-xl">
        <p className="uppercase tracking-[0.18em] text-xs text-white/60">Connect</p>
        <h1 className="section-title">Connect WooCommerce store</h1>
        <p className="subtle">Enter your store URL to generate the OAuth authorization link.</p>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2">
            <span className="subtle text-sm">Store URL</span>
            <input value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} placeholder="https://mystore.com" required />
          </label>
          <label className="flex flex-col gap-2">
            <span className="subtle text-sm">Shop name</span>
            <input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="My Store" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="subtle text-sm">Currency</span>
            <input value={shopCurrency} onChange={(e) => setShopCurrency(e.target.value)} placeholder="USD" />
          </label>
          {error && <div className="text-sm text-red-300">{error}</div>}
          <button className="btn btn--primary" type="submit" disabled={loading || !accessToken}>
            {loading ? 'Generating...' : 'Generate auth URL'}
          </button>
        </form>
        {authUrl && (
          <div className="stat-card">
            <p className="subtle text-sm">Authorization URL</p>
            <a className="text-white underline break-all" href={authUrl} target="_blank" rel="noreferrer">
              {authUrl}
            </a>
          </div>
        )}
        <Link className="btn" href="/dashboard">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
