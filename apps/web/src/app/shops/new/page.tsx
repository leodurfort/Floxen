'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { useCreateShopMutation } from '@/hooks/useShopsQuery';

export default function NewShopPage() {
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
    <main className="p-4">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-w-xl space-y-4">
        <p className="uppercase tracking-[0.18em] text-xs text-gray-500">Connect</p>
        <h1 className="text-2xl font-bold text-gray-900">Connect WooCommerce store</h1>
        <p className="text-gray-600 text-sm">Enter your store URL to generate the OAuth authorization link.</p>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2">
            <span className="text-gray-600 text-sm">Store URL</span>
            <input
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              placeholder="https://mystore.com"
              required
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#FA7315] focus:outline-none focus:ring-2 focus:ring-[#FA7315]/10"
            />
          </label>
          {createShopMutation.error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{createShopMutation.error.message}</div>
          )}
          <button className="btn btn--primary" type="submit" disabled={createShopMutation.isPending || !user}>
            {createShopMutation.isPending ? 'Generating...' : 'Generate auth URL'}
          </button>
        </form>
        {authUrl && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-600 text-sm mb-2">Authorization URL</p>
            <a className="text-[#FA7315] hover:text-[#E5650F] underline break-all" href={authUrl} target="_blank" rel="noreferrer">
              {authUrl}
            </a>
          </div>
        )}
        <Link className="btn inline-block" href="/dashboard">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
