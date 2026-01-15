'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useShopsQuery } from '@/hooks/useShopsQuery';
import { useCurrentShop } from '@/hooks/useCurrentShop';
import { FeedHealthCard } from '@/components/dashboard/FeedHealthCard';

export default function DashboardPage() {
  const router = useRouter();
  const { user, hydrated } = useAuth();
  const { data: shops = [], isLoading: loading } = useShopsQuery();
  const { currentShop } = useCurrentShop();

  useEffect(() => {
    if (hydrated && !user) {
      router.push('/login');
    }
  }, [hydrated, user, router]);

  if (!hydrated) {
    return (
      <div className="p-4">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const connectedShops = shops.filter((s) => s.isConnected);
  const totalProducts = 0; // TODO: Fetch total products count from API

  return (
    <div className="p-4">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">WELCOME</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Hi {user.firstName || user.email}</h1>
          <p className="text-gray-600">
            Manage your WooCommerce stores and sync products to OpenAI feeds with AI enrichment.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <span className="text-2xl">🏪</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Connected Stores</p>
                <p className="text-3xl font-bold text-gray-900">{connectedShops.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <span className="text-2xl">📦</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Total Products</p>
                <p className="text-3xl font-bold text-gray-900">{totalProducts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
                <span className="text-2xl">✨</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Subscription</p>
                <p className="text-2xl font-bold text-gray-900">{user.subscriptionTier || 'FREE'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feed Health - shown when a store is selected */}
        {currentShop && (
          <div className="mb-8">
            <FeedHealthCard />
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/shops"
              className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <span className="text-xl">🏪</span>
              </div>
              <div>
                <h3 className="text-gray-900 font-medium">Manage Stores</h3>
                <p className="text-sm text-gray-500">Connect and manage your WooCommerce stores</p>
              </div>
            </Link>

            {connectedShops.length > 0 && (
              <Link
                href={`/shops/${connectedShops[0].id}/products`}
                className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                  <span className="text-xl">📦</span>
                </div>
                <div>
                  <h3 className="text-gray-900 font-medium">View Products</h3>
                  <p className="text-sm text-gray-500">Browse and enrich your product catalog</p>
                </div>
              </Link>
            )}

            {connectedShops.length > 0 && (
              <Link
                href={`/shops/${connectedShops[0].id}/setup`}
                className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                  <span className="text-xl">⚙️</span>
                </div>
                <div>
                  <h3 className="text-gray-900 font-medium">Field Mapping</h3>
                  <p className="text-sm text-gray-500">Configure WooCommerce to OpenAI field mappings</p>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Empty State */}
        {!loading && connectedShops.length === 0 && (
          <div className="mt-8 bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🏪</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No stores connected yet</h3>
            <p className="text-gray-600 mb-6">
              Connect your first WooCommerce store to start syncing products to OpenAI feeds
            </p>
            <Link href="/shops" className="btn btn--primary">
              Connect your first store
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
