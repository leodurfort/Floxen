'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listShops, deleteShop, createShop, triggerProductSync, toggleShopSync } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Shop } from '@productsynch/shared';

export default function ShopsPage() {
  const router = useRouter();
  const { accessToken, hydrate, hydrated } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !accessToken) router.push('/login');
  }, [hydrated, accessToken, router]);

  useEffect(() => {
    if (accessToken) loadShops();
  }, [accessToken]);

  async function loadShops() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await listShops(accessToken);
      setShops(data.shops);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnectShop() {
    if (!accessToken || !storeUrl.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await createShop(
        { storeUrl: storeUrl.trim() },
        accessToken
      );
      window.location.href = data.authUrl;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function handleDeleteShop(shopId: string) {
    if (!accessToken || !confirm('Are you sure you want to delete this shop?')) return;
    try {
      await deleteShop(shopId, accessToken);
      await loadShops();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleSync(shopId: string, forceFull: boolean = false) {
    if (!accessToken) return;
    try {
      await triggerProductSync(shopId, accessToken, forceFull);
      setError(null);
      alert(forceFull ? 'Force full sync triggered successfully' : 'Sync triggered successfully');
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleToggleSync(shopId: string, currentValue: boolean) {
    if (!accessToken) return;
    try {
      await toggleShopSync(shopId, !currentValue, accessToken);
      await loadShops(); // Reload to show updated state
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (!hydrated || !accessToken) return null;

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/40 mb-1">SHOPS</p>
              <h1 className="text-3xl font-bold text-white">Connections</h1>
            </div>
            <button
              onClick={() => setShowConnectForm(!showConnectForm)}
              className="btn btn--primary"
            >
              {showConnectForm ? 'Cancel' : 'Connect shop'}
            </button>
          </div>
          <p className="text-white/60 text-sm">
            Manage your WooCommerce shop connections and sync products
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Connect Form */}
        {showConnectForm && (
          <div className="panel mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Connect WooCommerce Store</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Store URL *</label>
                <input
                  type="url"
                  placeholder="https://your-store.com"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-white/30 focus:outline-none"
                />
              </div>
              <button
                onClick={handleConnectShop}
                disabled={loading || !storeUrl.trim()}
                className="btn btn--primary"
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        )}

        {/* Shops List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              {shops.length} {shops.length === 1 ? 'connection' : 'connections'}
            </h2>
          </div>

          {loading && shops.length === 0 ? (
            <div className="panel">
              <div className="text-center text-white/40">Loading shops...</div>
            </div>
          ) : shops.length === 0 ? (
            <div className="panel">
              <div className="text-center">
                <p className="text-white/60 mb-4">No shops yet. Connect one to start syncing.</p>
                <button
                  onClick={() => setShowConnectForm(true)}
                  className="btn btn--primary"
                >
                  Connect shop
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {shops.map((shop) => (
                <div key={shop.id} className="panel">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white mb-1">{shop.shopName}</h3>
                      <p className="text-sm text-white/40 mb-2">{shop.wooStoreUrl}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-white/60">Currency: {shop.shopCurrency}</span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            shop.isConnected
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {shop.isConnected ? 'Connected' : 'Pending'}
                        </span>
                        <span className={`text-xs ${
                          shop.syncStatus === 'COMPLETED' ? 'text-green-400' :
                          shop.syncStatus === 'FAILED' ? 'text-red-400' :
                          'text-yellow-400'
                        }`}>
                          Sync: {shop.syncStatus.toLowerCase()}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/60">Auto-sync:</span>
                          <button
                            onClick={() => handleToggleSync(shop.id, shop.syncEnabled)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              shop.syncEnabled ? 'bg-green-500' : 'bg-gray-600'
                            }`}
                            title={shop.syncEnabled ? 'Auto-sync enabled (every 15 min)' : 'Auto-sync disabled'}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                shop.syncEnabled ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                      {shop.lastSyncAt && (
                        <p className="text-xs text-white/40 mt-2">
                          Last synced: {new Date(shop.lastSyncAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                      )}
                      {shop.isConnected && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {shop.sellerName && (
                              <div>
                                <span className="text-white/60">sellerName:</span>
                                <span className="text-white ml-2">{shop.sellerName}</span>
                              </div>
                            )}
                            {shop.sellerUrl && (
                              <div>
                                <span className="text-white/60">sellerUrl:</span>
                                <a href={shop.sellerUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 ml-2 underline">
                                  {shop.sellerUrl}
                                </a>
                              </div>
                            )}
                            {shop.sellerPrivacyPolicy && (
                              <div>
                                <span className="text-white/60">sellerPrivacyPolicy:</span>
                                <a href={shop.sellerPrivacyPolicy} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 ml-2 underline">
                                  {shop.sellerPrivacyPolicy}
                                </a>
                              </div>
                            )}
                            {shop.sellerTos && (
                              <div>
                                <span className="text-white/60">sellerTos:</span>
                                <a href={shop.sellerTos} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 ml-2 underline">
                                  {shop.sellerTos}
                                </a>
                              </div>
                            )}
                            {shop.returnPolicy && (
                              <div>
                                <span className="text-white/60">returnPolicy:</span>
                                <span className="text-white ml-2">{shop.returnPolicy}</span>
                              </div>
                            )}
                            {shop.returnWindow !== null && shop.returnWindow !== undefined && (
                              <div>
                                <span className="text-white/60">returnWindow:</span>
                                <span className="text-white ml-2">{shop.returnWindow} days</span>
                              </div>
                            )}
                            {shop.shopCurrency && (
                              <div>
                                <span className="text-white/60">shopCurrency:</span>
                                <span className="text-white ml-2">{shop.shopCurrency}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/shops/${shop.id}/products`)}
                        className="btn btn--sm"
                      >
                        View Products
                      </button>
                      <button
                        onClick={() => handleSync(shop.id, false)}
                        disabled={!shop.isConnected}
                        className="btn btn--sm btn--primary"
                        title="Incremental sync (only changed products)"
                      >
                        Sync
                      </button>
                      <button
                        onClick={() => handleSync(shop.id, true)}
                        disabled={!shop.isConnected}
                        className="btn btn--sm"
                        title="Force full sync (all products, ignores date_modified)"
                      >
                        Force Full Sync
                      </button>
                      <button
                        onClick={() => handleDeleteShop(shop.id)}
                        className="text-white/40 hover:text-red-400 transition-colors"
                        title="Delete shop"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
