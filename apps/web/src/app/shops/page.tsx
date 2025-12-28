'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { Toast } from '@/components/catalog/Toast';
import {
  useShopsQuery,
  useShopsSyncPolling,
  useCreateShopMutation,
  useDeleteShopMutation,
  useToggleSyncMutation,
  useTriggerSyncMutation,
  useUpdateShopMutation,
} from '@/hooks/useShopsQuery';

export default function ShopsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  // Note: hydrate() is called by AppLayout, no need to call it here
  const { user, hydrated } = useAuth();

  // React Query hooks
  const { data: shops = [], isLoading: loading } = useShopsQuery();

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Track previous sync statuses to detect completion
  const prevSyncStatusesRef = useRef<Record<string, string>>({});

  // Handle OAuth redirect: /shops?shop=abc123&connected=true
  // Just clean up the URL params, don't redirect
  const shopIdFromUrl = searchParams.get('shop');
  const isOAuthRedirect = searchParams.get('connected') === 'true';

  useEffect(() => {
    if (isOAuthRedirect && shopIdFromUrl) {
      // Clean up URL params without redirecting
      router.replace('/shops', { scroll: false });
      // Show success toast
      setToast({ message: 'Shop connected successfully! Syncing products...', type: 'success' });
    }
  }, [isOAuthRedirect, shopIdFromUrl, router]);

  // Determine if we need polling
  const hasSyncingShops = shops.some(
    (shop) => shop.syncStatus === 'PENDING' || shop.syncStatus === 'SYNCING'
  );
  useShopsSyncPolling(hasSyncingShops);

  // Detect sync completion and show toast
  useEffect(() => {
    if (shops.length === 0) return;

    const prevStatuses = prevSyncStatusesRef.current;
    let syncCompleted = false;

    for (const shop of shops) {
      const prevStatus = prevStatuses[shop.id];
      // If shop was syncing and is now completed
      if (
        (prevStatus === 'PENDING' || prevStatus === 'SYNCING') &&
        shop.syncStatus === 'COMPLETED'
      ) {
        syncCompleted = true;
        break;
      }
    }

    // Update stored statuses
    const newStatuses: Record<string, string> = {};
    for (const shop of shops) {
      newStatuses[shop.id] = shop.syncStatus;
    }
    prevSyncStatusesRef.current = newStatuses;

    // Show toast if sync completed
    if (syncCompleted) {
      setToast({ message: 'Sync completed successfully!', type: 'success' });
    }
  }, [shops]);

  // Mutations
  const createShopMutation = useCreateShopMutation();
  const deleteShopMutation = useDeleteShopMutation();
  const toggleSyncMutation = useToggleSyncMutation();
  const triggerSyncMutation = useTriggerSyncMutation();
  const updateShopMutation = useUpdateShopMutation();

  // Local state
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savingShopId, setSavingShopId] = useState<string | null>(null);
  const saveTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    if (hydrated && !user) router.push('/login');
  }, [hydrated, user, router]);

  function handleConnectShop() {
    if (!user || !storeUrl.trim()) return;
    setError(null);
    createShopMutation.mutate(
      { storeUrl: storeUrl.trim() },
      {
        onSuccess: (data) => {
          window.location.href = data.authUrl;
        },
        onError: (err) => {
          setError(err.message);
        },
      }
    );
  }

  function handleDeleteShop(shopId: string) {
    if (!user || !confirm('Are you sure you want to delete this shop?')) return;
    deleteShopMutation.mutate(shopId, {
      onError: (err) => {
        setError(err.message);
      },
    });
  }

  function handleSync(shopId: string) {
    if (!user) return;
    triggerSyncMutation.mutate(shopId, {
      onSuccess: () => {
        setError(null);
        alert('Sync triggered successfully');
      },
      onError: (err) => {
        setError(err.message);
      },
    });
  }

  function handleToggleSync(shopId: string, currentValue: boolean) {
    if (!user) return;
    toggleSyncMutation.mutate(
      { shopId, syncEnabled: !currentValue },
      {
        onSuccess: () => {
          setError(null);
        },
        onError: (err) => {
          setError(err.message);
        },
      }
    );
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
  const handleFieldChange = useCallback((
    shopId: string,
    field: 'sellerName' | 'sellerPrivacyPolicy' | 'sellerTos' | 'returnPolicy' | 'returnWindow',
    value: string
  ) => {
    if (!user) return;

    // Clear existing timeout for this shop
    if (saveTimeouts.current[shopId]) {
      clearTimeout(saveTimeouts.current[shopId]);
    }

    // Optimistic update in the cache for better UX
    queryClient.setQueryData(queryKeys.shops.all, (oldShops: typeof shops | undefined) =>
      oldShops?.map((shop) => {
        if (shop.id !== shopId) return shop;
        if (field === 'returnWindow') {
          const numValue = value.trim() ? parseInt(value.trim(), 10) : null;
          return { ...shop, [field]: isNaN(numValue as number) ? null : numValue };
        }
        return { ...shop, [field]: value };
      }) ?? []
    );

    // Debounce the save
    saveTimeouts.current[shopId] = setTimeout(() => {
      // Validate before saving
      if (field === 'returnWindow') {
        if (value.trim() && !isValidInteger(value)) {
          return; // Don't save invalid integer
        }
      } else if (field !== 'sellerName') {
        // URL fields - must be valid URL if not empty
        if (value.trim() && !isValidUrl(value)) {
          return; // Don't save invalid URL
        }
      }

      setSavingShopId(shopId);
      setError(null);

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
        // Plain string field - save trimmed value or null
        updateData.sellerName = value.trim() || null;
      } else {
        // URL fields - only save if valid URL or empty
        if (value.trim()) {
          if (isValidUrl(value)) {
            updateData[field] = value.trim();
          } else {
            setSavingShopId(null);
            return;
          }
        } else {
          updateData[field] = null;
        }
      }

      updateShopMutation.mutate(
        { shopId, data: updateData },
        {
          onSuccess: () => {
            setError(null);
            setSavingShopId(null);
          },
          onError: (err) => {
            setError(err.message);
            setSavingShopId(null);
            // Invalidate to refetch and revert optimistic update
            queryClient.invalidateQueries({ queryKey: queryKeys.shops.all });
          },
        }
      );
    }, 1000); // 1 second debounce
  }, [user, queryClient, updateShopMutation]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimeouts.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  if (!hydrated || !user) return null;

  return (
    <div className="p-4">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">SHOPS</p>
              <h1 className="text-3xl font-bold text-gray-900">Connections</h1>
            </div>
            <button
              onClick={() => setShowConnectForm(!showConnectForm)}
              className="btn btn--primary"
            >
              {showConnectForm ? 'Cancel' : 'Connect shop'}
            </button>
          </div>
          <p className="text-gray-600 text-sm">
            Manage your WooCommerce shop connections and sync products
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {hasSyncingShops && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Syncing products... will refresh automatically
          </div>
        )}

        {/* Connect Form */}
        {showConnectForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Connect WooCommerce Store</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Store URL *</label>
                <input
                  type="url"
                  placeholder="https://your-store.com"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-[#FA7315] focus:outline-none focus:ring-2 focus:ring-[#FA7315]/10"
                />
              </div>
              <button
                onClick={handleConnectShop}
                disabled={createShopMutation.isPending || !storeUrl.trim()}
                className="btn btn--primary"
              >
                {createShopMutation.isPending ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        )}

        {/* Shops List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {shops.length} {shops.length === 1 ? 'connection' : 'connections'}
            </h2>
          </div>

          {loading && shops.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="text-center text-gray-500">Loading shops...</div>
            </div>
          ) : shops.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="text-center">
                <p className="text-gray-600 mb-4">No shops yet. Connect one to start syncing.</p>
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
                <div key={shop.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{shop.shopName}</h3>
                      <p className="text-sm text-gray-500 mb-2">{shop.wooStoreUrl}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600">Currency: {shop.shopCurrency}</span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            shop.isConnected
                              ? 'bg-green-50 text-green-700'
                              : 'bg-yellow-50 text-yellow-700'
                          }`}
                        >
                          {shop.isConnected ? 'Connected' : 'Pending'}
                        </span>
                        <span className={`text-xs ${
                          shop.syncStatus === 'COMPLETED' ? 'text-green-600' :
                          shop.syncStatus === 'FAILED' ? 'text-red-600' :
                          'text-yellow-600'
                        }`}>
                          Sync: {shop.syncStatus.toLowerCase()}
                        </span>
                        <span className={`text-xs ${
                          shop.feedStatus === 'COMPLETED' ? 'text-blue-600' :
                          shop.feedStatus === 'FAILED' ? 'text-red-600' :
                          'text-yellow-600'
                        }`}>
                          Feed: {shop.feedStatus?.toLowerCase() || 'pending'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600">Auto-sync:</span>
                          <button
                            onClick={() => handleToggleSync(shop.id, shop.syncEnabled)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              shop.syncEnabled ? 'bg-green-500' : 'bg-gray-300'
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
                      <div className="text-xs text-gray-500 mt-2 space-y-1">
                        {shop.lastSyncAt && (
                          <p>
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
                        {shop.lastFeedGeneratedAt && (
                          <p>
                            Last feed: {new Date(shop.lastFeedGeneratedAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </p>
                        )}
                      </div>
                      {shop.isConnected && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="space-y-3">
                              <div>
                                <span className="text-gray-600">sellerName:</span>
                                <input
                                  type="text"
                                  value={shop.sellerName || ''}
                                  onChange={(e) => handleFieldChange(shop.id, 'sellerName', e.target.value)}
                                  className="ml-2 px-2 py-1 bg-white border border-gray-300 rounded text-gray-900 text-sm w-full max-w-xs focus:border-[#FA7315] focus:outline-none focus:ring-2 focus:ring-[#FA7315]/10"
                                  placeholder="Your store name"
                                />
                              </div>
                              <div>
                                <span className="text-gray-600">sellerUrl:</span>
                                {shop.sellerUrl ? (
                                  <a href={shop.sellerUrl} target="_blank" rel="noopener noreferrer" className="text-[#FA7315] hover:text-[#E5650F] ml-2 underline">
                                    {shop.sellerUrl}
                                  </a>
                                ) : (
                                  <span className="text-gray-400 ml-2">N/A</span>
                                )}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <span className="text-gray-600">returnPolicy:</span>
                                <input
                                  type="url"
                                  value={shop.returnPolicy || ''}
                                  onChange={(e) => handleFieldChange(shop.id, 'returnPolicy', e.target.value)}
                                  onBlur={(e) => {
                                    if (e.target.value.trim() && !isValidUrl(e.target.value)) {
                                      setError('returnPolicy must be a valid URL');
                                    }
                                  }}
                                  className="ml-2 px-2 py-1 bg-white border border-gray-300 rounded text-gray-900 text-sm w-full max-w-xs focus:border-[#FA7315] focus:outline-none focus:ring-2 focus:ring-[#FA7315]/10"
                                  placeholder="https://..."
                                />
                              </div>
                              <div>
                                <span className="text-gray-600">returnWindow:</span>
                                <input
                                  type="number"
                                  value={shop.returnWindow?.toString() || ''}
                                  onChange={(e) => handleFieldChange(shop.id, 'returnWindow', e.target.value)}
                                  onBlur={(e) => {
                                    if (e.target.value.trim() && !isValidInteger(e.target.value)) {
                                      setError('returnWindow must be a positive integer');
                                    }
                                  }}
                                  className="ml-2 px-2 py-1 bg-white border border-gray-300 rounded text-gray-900 text-sm w-full max-w-xs focus:border-[#FA7315] focus:outline-none focus:ring-2 focus:ring-[#FA7315]/10"
                                  placeholder="Days"
                                  min="1"
                                />
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <span className="text-gray-600">sellerPrivacyPolicy:</span>
                                <input
                                  type="url"
                                  value={shop.sellerPrivacyPolicy || ''}
                                  onChange={(e) => handleFieldChange(shop.id, 'sellerPrivacyPolicy', e.target.value)}
                                  onBlur={(e) => {
                                    if (e.target.value.trim() && !isValidUrl(e.target.value)) {
                                      setError('sellerPrivacyPolicy must be a valid URL');
                                    }
                                  }}
                                  className="ml-2 px-2 py-1 bg-white border border-gray-300 rounded text-gray-900 text-sm w-full max-w-xs focus:border-[#FA7315] focus:outline-none focus:ring-2 focus:ring-[#FA7315]/10"
                                  placeholder="https://..."
                                />
                              </div>
                              <div>
                                <span className="text-gray-600">sellerTos:</span>
                                <input
                                  type="url"
                                  value={shop.sellerTos || ''}
                                  onChange={(e) => handleFieldChange(shop.id, 'sellerTos', e.target.value)}
                                  onBlur={(e) => {
                                    if (e.target.value.trim() && !isValidUrl(e.target.value)) {
                                      setError('sellerTos must be a valid URL');
                                    }
                                  }}
                                  className="ml-2 px-2 py-1 bg-white border border-gray-300 rounded text-gray-900 text-sm w-full max-w-xs focus:border-[#FA7315] focus:outline-none focus:ring-2 focus:ring-[#FA7315]/10"
                                  placeholder="https://..."
                                />
                              </div>
                            </div>
                          </div>
                          {savingShopId === shop.id && (
                            <div className="mt-2 text-xs text-gray-500 italic">
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
                        disabled={!shop.isConnected || triggerSyncMutation.isPending}
                        className="btn btn--sm btn--primary"
                        title="Sync all products from WooCommerce"
                      >
                        Sync
                      </button>
                      <button
                        onClick={() => handleDeleteShop(shop.id)}
                        disabled={deleteShopMutation.isPending}
                        className="text-gray-400 hover:text-red-500 transition-colors"
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

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
