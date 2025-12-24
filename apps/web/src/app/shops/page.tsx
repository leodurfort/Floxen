'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { deleteShop, createShop, triggerProductSync, toggleShopSync, updateShop } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useShops } from '@/store/shops';

const SYNC_POLL_INTERVAL = 5000; // 5 seconds

export default function ShopsPage() {
  const router = useRouter();
  const { accessToken, hydrate, hydrated } = useAuth();
  const { shops, loading, loadShops, removeShop, updateShop: updateShopInStore } = useShops();
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savingShopId, setSavingShopId] = useState<string | null>(null);
  const [isSyncPolling, setIsSyncPolling] = useState(false);
  const saveTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !accessToken) router.push('/login');
  }, [hydrated, accessToken, router]);

  useEffect(() => {
    if (accessToken) loadShops(accessToken);
  }, [accessToken, loadShops]);

  // Poll for sync status when any shop is syncing
  useEffect(() => {
    const hasSyncingShops = shops.some(
      (shop) => shop.syncStatus === 'PENDING' || shop.syncStatus === 'SYNCING'
    );

    if (hasSyncingShops && accessToken) {
      setIsSyncPolling(true);

      // Clear any existing interval
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      // Start polling
      pollIntervalRef.current = setInterval(() => {
        loadShops(accessToken);
      }, SYNC_POLL_INTERVAL);
    } else {
      // Stop polling when no shops are syncing
      setIsSyncPolling(false);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [shops, accessToken, loadShops]);

  const [connecting, setConnecting] = useState(false);

  async function handleConnectShop() {
    if (!accessToken || !storeUrl.trim()) return;
    setConnecting(true);
    setError(null);
    try {
      const data = await createShop(
        { storeUrl: storeUrl.trim() },
        accessToken
      );
      window.location.href = data.authUrl;
    } catch (err: any) {
      setError(err.message);
      setConnecting(false);
    }
  }

  async function handleDeleteShop(shopId: string) {
    if (!accessToken || !confirm('Are you sure you want to delete this shop?')) return;
    try {
      await deleteShop(shopId, accessToken);
      removeShop(shopId); // Immediately update store (sidebar updates)
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleSync(shopId: string) {
    if (!accessToken) return;
    try {
      await triggerProductSync(shopId, accessToken);
      setError(null);
      alert('Sync triggered successfully');
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleToggleSync(shopId: string, currentValue: boolean) {
    if (!accessToken) return;
    try {
      await toggleShopSync(shopId, !currentValue, accessToken);
      updateShopInStore(shopId, { syncEnabled: !currentValue }); // Immediate UI update
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }

  // Validate URL
  function isValidUrl(value: string): boolean {
    if (!value.trim()) return true; // Empty is valid (will be cleared)
    try {
      new URL(value.trim());
      return true;
    } catch {
      return false;
    }
  }

  // Validate integer
  function isValidInteger(value: string): boolean {
    if (!value.trim()) return true; // Empty is valid (will be cleared)
    const num = parseInt(value.trim(), 10);
    return !isNaN(num) && num > 0 && Number.isInteger(num);
  }

  // Auto-save function with debouncing
  const handleFieldChange = useCallback(async (
    shopId: string,
    field: 'sellerName' | 'sellerPrivacyPolicy' | 'sellerTos' | 'returnPolicy' | 'returnWindow',
    value: string
  ) => {
    if (!accessToken) return;

    // Clear existing timeout for this shop
    if (saveTimeouts.current[shopId]) {
      clearTimeout(saveTimeouts.current[shopId]);
    }

    // Update store immediately for better UX (don't trim yet - allow spaces while typing)
    if (field === 'returnWindow') {
      const numValue = value.trim() ? parseInt(value.trim(), 10) : null;
      updateShopInStore(shopId, { [field]: isNaN(numValue as number) ? null : numValue });
    } else {
      updateShopInStore(shopId, { [field]: value });
    }

    // Debounce the save
    saveTimeouts.current[shopId] = setTimeout(async () => {
      // Validate before saving
      if (field === 'returnWindow') {
        if (value.trim() && !isValidInteger(value)) {
          return; // Don't save invalid integer
        }
      } else if (field === 'sellerName') {
        // sellerName is a text field, no URL validation
      } else {
        // URL fields - must be valid URL if not empty
        if (value.trim() && !isValidUrl(value)) {
          return; // Don't save invalid URL
        }
      }

      setSavingShopId(shopId);
      setError(null);
      try {
        const updateData: {
          sellerName?: string | null;
          sellerPrivacyPolicy?: string | null;
          sellerTos?: string | null;
          returnPolicy?: string | null;
          returnWindow?: number | null;
        } = {};

        if (field === 'returnWindow') {
          if (value.trim()) {
            const returnWindow = parseInt(value.trim(), 10);
            if (!isNaN(returnWindow) && returnWindow > 0 && Number.isInteger(returnWindow)) {
              updateData.returnWindow = returnWindow;
            } else {
              updateData.returnWindow = null;
            }
          } else {
            updateData.returnWindow = null;
          }
        } else if (field === 'sellerName') {
          // sellerName is a text field
          updateData.sellerName = value.trim() || null;
        } else {
          // URL fields - only save if valid URL or empty
          if (value.trim()) {
            if (isValidUrl(value)) {
              updateData[field] = value.trim();
            } else {
              // Invalid URL, don't save
              return;
            }
          } else {
            updateData[field] = null;
          }
        }

        await updateShop(shopId, updateData, accessToken);
        // No need to reload - store is already updated optimistically
        setError(null);
      } catch (err: any) {
        setError(err.message);
        // Reload on error to revert optimistic update
        await loadShops(accessToken);
      } finally {
        setSavingShopId(null);
      }
    }, 1000); // 1 second debounce
  }, [accessToken, loadShops, updateShopInStore]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimeouts.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

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

        {isSyncPolling && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Syncing products... will refresh automatically
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
                disabled={connecting || !storeUrl.trim()}
                className="btn btn--primary"
              >
                {connecting ? 'Connecting...' : 'Connect'}
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
                                <input
                                  type="text"
                                  value={shop.sellerName || ''}
                                  onChange={(e) => handleFieldChange(shop.id, 'sellerName', e.target.value)}
                                  className="ml-2 px-2 py-1 bg-black/30 border border-white/10 rounded text-white text-sm w-full max-w-xs focus:border-white/30 focus:outline-none"
                                  placeholder="Your store name"
                                />
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
                                <input
                                  type="url"
                                  value={shop.returnPolicy || ''}
                                  onChange={(e) => handleFieldChange(shop.id, 'returnPolicy', e.target.value)}
                                  onBlur={(e) => {
                                    // Validate on blur and show error
                                    if (e.target.value.trim() && !isValidUrl(e.target.value)) {
                                      setError('returnPolicy must be a valid URL');
                                    }
                                  }}
                                  className="ml-2 px-2 py-1 bg-black/30 border border-white/10 rounded text-white text-sm w-full max-w-xs focus:border-white/30 focus:outline-none"
                                  placeholder="https://..."
                                />
                              </div>
                              <div>
                                <span className="text-white/60">returnWindow:</span>
                                <input
                                  type="number"
                                  value={shop.returnWindow?.toString() || ''}
                                  onChange={(e) => handleFieldChange(shop.id, 'returnWindow', e.target.value)}
                                  onBlur={(e) => {
                                    // Validate on blur and show error
                                    if (e.target.value.trim() && !isValidInteger(e.target.value)) {
                                      setError('returnWindow must be a positive integer');
                                    }
                                  }}
                                  className="ml-2 px-2 py-1 bg-black/30 border border-white/10 rounded text-white text-sm w-full max-w-xs focus:border-white/30 focus:outline-none"
                                  placeholder="Days"
                                  min="1"
                                />
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <span className="text-white/60">sellerPrivacyPolicy:</span>
                                <input
                                  type="url"
                                  value={shop.sellerPrivacyPolicy || ''}
                                  onChange={(e) => handleFieldChange(shop.id, 'sellerPrivacyPolicy', e.target.value)}
                                  onBlur={(e) => {
                                    // Validate on blur and show error
                                    if (e.target.value.trim() && !isValidUrl(e.target.value)) {
                                      setError('sellerPrivacyPolicy must be a valid URL');
                                    }
                                  }}
                                  className="ml-2 px-2 py-1 bg-black/30 border border-white/10 rounded text-white text-sm w-full max-w-xs focus:border-white/30 focus:outline-none"
                                  placeholder="https://..."
                                />
                              </div>
                              <div>
                                <span className="text-white/60">sellerTos:</span>
                                <input
                                  type="url"
                                  value={shop.sellerTos || ''}
                                  onChange={(e) => handleFieldChange(shop.id, 'sellerTos', e.target.value)}
                                  onBlur={(e) => {
                                    // Validate on blur and show error
                                    if (e.target.value.trim() && !isValidUrl(e.target.value)) {
                                      setError('sellerTos must be a valid URL');
                                    }
                                  }}
                                  className="ml-2 px-2 py-1 bg-black/30 border border-white/10 rounded text-white text-sm w-full max-w-xs focus:border-white/30 focus:outline-none"
                                  placeholder="https://..."
                                />
                              </div>
                            </div>
                          </div>
                          {savingShopId === shop.id && (
                            <div className="mt-2 text-xs text-white/40 italic">
                              Saving...
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
                        onClick={() => handleSync(shop.id)}
                        disabled={!shop.isConnected}
                        className="btn btn--sm btn--primary"
                        title="Sync all products from WooCommerce"
                      >
                        Sync
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
