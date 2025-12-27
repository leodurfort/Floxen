'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { useCreateShopMutation } from '@/hooks/useShopsQuery';

export default function NewShopPage() {
  // Note: hydrate() is called by AppLayout, no need to call it here
  const { user, hydrated } = useAuth();
  const router = useRouter();
  const [storeUrl, setStoreUrl] = useState('');
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  const createShopMutation = useCreateShopMutation();

  useEffect(() => {
    if (hydrated && !user) {
      router.push('/login');
    }
  }, [hydrated, user, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    createShopMutation.mutate(
      { storeUrl },
      {
        onSuccess: (result) => {
          setAuthUrl(result.authUrl);
        },
      }
    );
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
          {createShopMutation.error && (
            <div className="text-sm text-red-300">{createShopMutation.error.message}</div>
          )}
          <button className="btn btn--primary" type="submit" disabled={createShopMutation.isPending || !user}>
            {createShopMutation.isPending ? 'Generating...' : 'Generate auth URL'}
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
