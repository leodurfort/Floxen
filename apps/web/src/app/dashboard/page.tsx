'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useShopsQuery } from '@/hooks/useShopsQuery';

export default function DashboardPage() {
  const router = useRouter();
  // Note: hydrate() is called by AppLayout, no need to call it here
  const { user, hydrated } = useAuth();
  const { data: shops = [], isLoading: loading } = useShopsQuery();

  useEffect(() => {
    if (hydrated && !user) {
      router.push('/login');
    }
  }, [hydrated, user, router]);

  if (!hydrated) {
    return (
      <div className="p-8">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const connectedShops = shops.filter((s) => s.isConnected);
  const totalProducts = 0; // TODO: Fetch total products count from API

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wider text-white/40 mb-1">WELCOME</p>
          <h1 className="text-3xl font-bold text-white mb-2">Hi {user.name || user.email}</h1>
          <p className="text-white/60">
            Manage your WooCommerce shops and sync products to OpenAI feeds with AI enrichment.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1a1d29] border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-2xl">🏪</span>
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider">Connected Shops</p>
                <p className="text-3xl font-bold text-white">{connectedShops.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1d29] border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-2xl">📦</span>
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider">Total Products</p>
                <p className="text-3xl font-bold text-white">{totalProducts}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1d29] border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span className="text-2xl">✨</span>
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider">Subscription</p>
                <p className="text-2xl font-bold text-white">{user.subscriptionTier || 'FREE'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-[#1a1d29] border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/shops"
              className="flex items-center gap-4 p-4 bg-[#252936] hover:bg-[#2d3142] rounded-lg transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                <span className="text-xl">🏪</span>
              </div>
              <div>
                <h3 className="text-white font-medium">Manage Shops</h3>
                <p className="text-sm text-white/40">Connect and manage your WooCommerce stores</p>
              </div>
            </Link>

            {connectedShops.length > 0 && (
              <Link
                href={`/shops/${connectedShops[0].id}/products`}
                className="flex items-center gap-4 p-4 bg-[#252936] hover:bg-[#2d3142] rounded-lg transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                  <span className="text-xl">📦</span>
                </div>
                <div>
                  <h3 className="text-white font-medium">View Products</h3>
                  <p className="text-sm text-white/40">Browse and enrich your product catalog</p>
                </div>
              </Link>
            )}

            <Link
              href="/settings"
              className="flex items-center gap-4 p-4 bg-[#252936] hover:bg-[#2d3142] rounded-lg transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                <span className="text-xl">⚙️</span>
              </div>
              <div>
                <h3 className="text-white font-medium">Settings</h3>
                <p className="text-sm text-white/40">Configure your account and preferences</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Empty State */}
        {!loading && connectedShops.length === 0 && (
          <div className="mt-8 bg-[#1a1d29] border border-white/10 rounded-xl p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🏪</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No shops connected yet</h3>
            <p className="text-white/60 mb-6">
              Connect your first WooCommerce store to start syncing products to OpenAI feeds
            </p>
            <Link href="/shops" className="btn btn--primary">
              Connect your first shop
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
