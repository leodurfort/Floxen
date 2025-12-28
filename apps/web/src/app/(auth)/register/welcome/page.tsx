'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import * as api from '@/lib/api';

export default function RegisterWelcomePage() {
  const router = useRouter();
  const { user, hydrate, hydrated } = useAuth();
  const [storeUrl, setStoreUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !user) {
      router.push('/register');
    }
  }, [hydrated, user, router]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!storeUrl.trim()) {
      setError('Please enter your WooCommerce store URL');
      return;
    }

    setIsLoading(true);

    try {
      const result = await api.createShop({ storeUrl: storeUrl.trim() });
      // Redirect to WooCommerce OAuth
      if (result.authUrl) {
        window.location.href = result.authUrl;
      } else {
        // If no authUrl, shop was created without OAuth (shouldn't happen normally)
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect store');
      setIsLoading(false);
    }
  }

  function handleSkip() {
    router.push('/dashboard');
  }

  if (!hydrated || !user) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F9FAFB]">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="uppercase tracking-[0.15em] text-xs text-gray-500 mb-2">ProductSynch</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {user.firstName || 'there'}!
          </h1>
          <p className="text-gray-600">
            Connect your WooCommerce store to start syncing products
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Left: WooCommerce Connection */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.29 6.14C1.13 7.74.45 9.62.06 11.78c0 .11.04.2.1.27l3.15 3.15c.08.08.2.1.3.06a9.28 9.28 0 0 1 3.62-.64c.17 0 .29-.12.29-.29V6.35c0-.17-.12-.29-.29-.29H2.66c-.17 0-.3.08-.37.23zM23.9 11.78c-.4-2.16-1.08-4.04-2.24-5.64-.07-.15-.2-.23-.37-.23h-4.57c-.17 0-.29.12-.29.29v7.98c0 .17.12.29.29.29 1.3 0 2.51.23 3.62.64.1.04.22.02.3-.06l3.15-3.15c.07-.07.11-.16.11-.27zM12 6.06c-.17 0-.29.12-.29.29v7.98c0 .17.12.29.29.29.17 0 .29-.12.29-.29V6.35c0-.17-.12-.29-.29-.29zM8.42 16.67c-1.44 0-2.79.31-4.04.93-.1.05-.16.16-.14.27.31 1.8.91 3.39 1.96 4.75.07.1.18.15.29.15h7.02c.11 0 .22-.05.29-.15 1.05-1.36 1.65-2.95 1.96-4.75.02-.11-.04-.22-.14-.27-1.25-.62-2.6-.93-4.04-.93h-3.16z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Connect WooCommerce</h2>
                <p className="text-sm text-gray-600">Securely link your store</p>
              </div>
            </div>

            <form onSubmit={handleConnect} className="space-y-4">
              <label className="flex flex-col gap-2">
                <span className="text-gray-600 text-sm">Store URL</span>
                <input
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  type="url"
                  placeholder="https://your-store.com"
                  required
                  className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#FA7315] focus:outline-none focus:ring-2 focus:ring-[#FA7315]/10 transition-colors"
                />
                <span className="text-xs text-gray-500">
                  Enter the URL of your WooCommerce store
                </span>
              </label>

              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <button
                className="btn btn--primary w-full py-3"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Connecting...' : 'Connect Store'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={handleSkip}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Skip for now - I&apos;ll connect later
              </button>
            </div>
          </div>

          {/* Right: Product Demo */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#FA7315]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">What ProductSynch Does</h2>
                <p className="text-sm text-gray-600">Sync products to ChatGPT</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#FA7315]/10 flex items-center justify-center text-[#FA7315] font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Import Products</h3>
                  <p className="text-sm text-gray-600">
                    Automatically sync all your WooCommerce products with their details, images, and pricing.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#FA7315]/10 flex items-center justify-center text-[#FA7315] font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Map Fields</h3>
                  <p className="text-sm text-gray-600">
                    Configure how your product data maps to OpenAI&apos;s feed format for optimal discovery.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#FA7315]/10 flex items-center justify-center text-[#FA7315] font-bold text-sm">
                  3
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Go Live on ChatGPT</h3>
                  <p className="text-sm text-gray-600">
                    Your products become discoverable when users search for items in ChatGPT.
                  </p>
                </div>
              </div>
            </div>

            {/* Demo Preview */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded bg-[#10a37f] flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729z" />
                  </svg>
                </div>
                <span className="text-xs text-gray-500">ChatGPT Preview</span>
              </div>
              <div className="text-sm text-gray-600 italic">
                &quot;Looking for a blue running shoe under $100? I found these options from your store...&quot;
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
