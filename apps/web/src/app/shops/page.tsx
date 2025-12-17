'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listShops, deleteShop, createShop, triggerProductSync, toggleShopSync, updateShop } from '@/lib/api';
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
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    sellerPrivacyPolicy: string;
    sellerTos: string;
    returnPolicy: string;
    returnWindow: string;
  }>({
    sellerPrivacyPolicy: '',
    sellerTos: '',
    returnPolicy: '',
    returnWindow: '',
  });

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

  function startEditing(shop: Shop) {
    setEditingShopId(shop.id);
    setEditValues({
      sellerPrivacyPolicy: shop.sellerPrivacyPolicy || '',
      sellerTos: shop.sellerTos || '',
      returnPolicy: shop.returnPolicy || '',
      returnWindow: shop.returnWindow?.toString() || '',
    });
  }

  function cancelEditing() {
    setEditingShopId(null);
    setEditValues({
      sellerPrivacyPolicy: '',
      sellerTos: '',
      returnPolicy: '',
      returnWindow: '',
    });
  }

  async function saveShopFields(shopId: string) {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const updateData: {
        sellerPrivacyPolicy?: string | null;
        sellerTos?: string | null;
        returnPolicy?: string | null;
        returnWindow?: number | null;
      } = {};

      // Allow setting to empty string to clear the field
      updateData.sellerPrivacyPolicy = editValues.sellerPrivacyPolicy.trim() || null;
      updateData.sellerTos = editValues.sellerTos.trim() || null;
      updateData.returnPolicy = editValues.returnPolicy.trim() || null;
      
      if (editValues.returnWindow.trim()) {
        const returnWindow = parseInt(editValues.returnWindow.trim(), 10);
        if (!isNaN(returnWindow) && returnWindow > 0) {
          updateData.returnWindow = returnWindow;
        } else {
          updateData.returnWindow = null;
        }
      } else {
        updateData.returnWindow = null;
      }

      await updateShop(shopId, updateData, accessToken);
      await loadShops();
      setEditingShopId(null);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="space-y-3">
                              <div>
                                <span className="text-white/60">sellerName:</span>
                                <span className="text-white ml-2">{shop.sellerName || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-white/60">sellerUrl:</span>
                                {shop.sellerUrl ? (
                                  <a href={shop.sellerUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 ml-2 underline">
                                    {shop.sellerUrl}
                                  </a>
                                ) : (
                                  <span className="text-white/40 ml-2">N/A</span>
                                )}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <span className="text-white/60">returnPolicy:</span>
                                {editingShopId === shop.id ? (
                                  <input
                                    type="text"
                                    value={editValues.returnPolicy}
                                    onChange={(e) => setEditValues({ ...editValues, returnPolicy: e.target.value })}
                                    className="ml-2 px-2 py-1 bg-black/30 border border-white/10 rounded text-white text-sm w-full max-w-xs"
                                    placeholder="Enter return policy"
                                  />
                                ) : (
                                  <span className="text-white ml-2">{shop.returnPolicy || 'N/A'}</span>
                                )}
                              </div>
                              <div>
                                <span className="text-white/60">returnWindow:</span>
                                {editingShopId === shop.id ? (
                                  <input
                                    type="number"
                                    value={editValues.returnWindow}
                                    onChange={(e) => setEditValues({ ...editValues, returnWindow: e.target.value })}
                                    className="ml-2 px-2 py-1 bg-black/30 border border-white/10 rounded text-white text-sm w-full max-w-xs"
                                    placeholder="Days"
                                    min="1"
                                  />
                                ) : (
                                  <span className="text-white ml-2">
                                    {shop.returnWindow !== null && shop.returnWindow !== undefined ? `${shop.returnWindow} days` : 'N/A'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <span className="text-white/60">sellerPrivacyPolicy:</span>
                                {editingShopId === shop.id ? (
                                  <input
                                    type="url"
                                    value={editValues.sellerPrivacyPolicy}
                                    onChange={(e) => setEditValues({ ...editValues, sellerPrivacyPolicy: e.target.value })}
                                    className="ml-2 px-2 py-1 bg-black/30 border border-white/10 rounded text-white text-sm w-full max-w-xs"
                                    placeholder="https://..."
                                  />
                                ) : shop.sellerPrivacyPolicy ? (
                                  <a href={shop.sellerPrivacyPolicy} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 ml-2 underline">
                                    {shop.sellerPrivacyPolicy}
                                  </a>
                                ) : (
                                  <span className="text-white/40 ml-2">N/A</span>
                                )}
                              </div>
                              <div>
                                <span className="text-white/60">sellerTos:</span>
                                {editingShopId === shop.id ? (
                                  <input
                                    type="url"
                                    value={editValues.sellerTos}
                                    onChange={(e) => setEditValues({ ...editValues, sellerTos: e.target.value })}
                                    className="ml-2 px-2 py-1 bg-black/30 border border-white/10 rounded text-white text-sm w-full max-w-xs"
                                    placeholder="https://..."
                                  />
                                ) : shop.sellerTos ? (
                                  <a href={shop.sellerTos} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 ml-2 underline">
                                    {shop.sellerTos}
                                  </a>
                                ) : (
                                  <span className="text-white/40 ml-2">N/A</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {editingShopId === shop.id ? (
                            <div className="mt-4 flex gap-2">
                              <button
                                onClick={() => saveShopFields(shop.id)}
                                disabled={loading}
                                className="btn btn--sm btn--primary"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditing}
                                disabled={loading}
                                className="btn btn--sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="mt-4">
                              <button
                                onClick={() => startEditing(shop)}
                                className="btn btn--sm"
                              >
                                Edit Fields
                              </button>
                            </div>
                          )}
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
