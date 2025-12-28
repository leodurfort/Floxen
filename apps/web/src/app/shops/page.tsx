'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/store/auth';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { Toast } from '@/components/catalog/Toast';
import { CompleteShopSetupModal } from '@/components/shops/CompleteShopSetupModal';
import type { Shop } from '@productsynch/shared';
import {
  useShopsQuery,
  useShopsSyncPolling,
  useCreateShopMutation,
  useDeleteShopMutation,
  useToggleSyncMutation,
  useTriggerSyncMutation,
  useUpdateShopMutation,
} from '@/hooks/useShopsQuery';

// Helper to check if shop profile is complete
function isProfileComplete(shop: Shop): boolean {
  return Boolean(shop.sellerName && shop.returnPolicy && shop.returnWindow);
}

// Validate URL
function isValidUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    new URL(value.trim());
    return true;
  } catch {
    return false;
  }
}

export default function ShopsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, hydrated } = useAuth();

  // React Query hooks
  const { data: shops = [], isLoading: loading } = useShopsQuery();

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modal state
  const [modalShop, setModalShop] = useState<Shop | null>(null);

  // Advanced settings expansion state (per shop)
  const [expandedAdvanced, setExpandedAdvanced] = useState<Record<string, boolean>>({});

  // Track previous sync statuses to detect completion
  const prevSyncStatusesRef = useRef<Record<string, string>>({});

  // Handle OAuth redirect: /shops?shop=abc123&connected=true
  const shopIdFromUrl = searchParams.get('shop');
  const isOAuthRedirect = searchParams.get('connected') === 'true';

  useEffect(() => {
    if (isOAuthRedirect && shopIdFromUrl) {
      router.replace('/shops', { scroll: false });
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
      if (
        (prevStatus === 'PENDING' || prevStatus === 'SYNCING') &&
        shop.syncStatus === 'COMPLETED'
      ) {
        syncCompleted = true;
        break;
      }
    }

    const newStatuses: Record<string, string> = {};
    for (const shop of shops) {
      newStatuses[shop.id] = shop.syncStatus;
    }
    prevSyncStatusesRef.current = newStatuses;

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

  // For advanced settings inline editing (debounced)
  const [savingAdvanced, setSavingAdvanced] = useState<string | null>(null);
  const advancedSaveTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    if (hydrated && !user) router.push('/login');
  }, [hydrated, user, router]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(advancedSaveTimeouts.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

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
    if (!user || !confirm('Are you sure you want to delete this shop? This action cannot be undone.')) return;
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
        setToast({ message: 'Sync triggered successfully', type: 'success' });
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

  // Modal save handler
  async function handleModalSave(data: { sellerName: string | null; returnPolicy: string | null; returnWindow: number | null }) {
    if (!modalShop) return;

    return new Promise<void>((resolve, reject) => {
      updateShopMutation.mutate(
        { shopId: modalShop.id, data },
        {
          onSuccess: () => {
            setModalShop(null);
            setToast({ message: 'Shop profile saved successfully!', type: 'success' });
            resolve();
          },
          onError: (err) => {
            setError(err.message);
            reject(err);
          },
        }
      );
    });
  }

  // Advanced settings field change handler (debounced)
  const handleAdvancedFieldChange = useCallback((
    shopId: string,
    field: 'sellerPrivacyPolicy' | 'sellerTos',
    value: string
  ) => {
    if (!user) return;

    // Clear existing timeout
    if (advancedSaveTimeouts.current[shopId]) {
      clearTimeout(advancedSaveTimeouts.current[shopId]);
    }

    // Optimistic update
    queryClient.setQueryData(queryKeys.shops.all, (oldShops: Shop[] | undefined) =>
      oldShops?.map((shop) => {
        if (shop.id !== shopId) return shop;
        return { ...shop, [field]: value };
      }) ?? []
    );

    // Debounced save
    advancedSaveTimeouts.current[shopId] = setTimeout(() => {
      // Validate URL
      if (value.trim() && !isValidUrl(value)) {
        return;
      }

      setSavingAdvanced(shopId);
      setError(null);

      const updateData: { sellerPrivacyPolicy?: string | null; sellerTos?: string | null } = {};
      updateData[field] = value.trim() || null;

      updateShopMutation.mutate(
        { shopId, data: updateData },
        {
          onSuccess: () => {
            setSavingAdvanced(null);
          },
          onError: (err) => {
            setError(err.message);
            setSavingAdvanced(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.shops.all });
          },
        }
      );
    }, 1000);
  }, [user, queryClient, updateShopMutation]);

  function toggleAdvanced(shopId: string) {
    setExpandedAdvanced(prev => ({ ...prev, [shopId]: !prev[shopId] }));
  }

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
            Manage your WooCommerce shop connections
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
              {shops.map((shop) => {
                const profileComplete = isProfileComplete(shop);
                const isAdvancedExpanded = expandedAdvanced[shop.id] ?? false;

                return (
                  <div key={shop.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    {/* Header Section */}
                    <div className="p-5 border-b border-gray-200">
                      <p className="text-lg font-semibold text-gray-900 mb-2">{shop.wooStoreUrl}</p>
                      <div className="flex items-center flex-wrap gap-2 text-sm">
                        <span className="text-gray-600">Currency: {shop.shopCurrency || 'N/A'}</span>
                        <span className="text-gray-300">•</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            shop.isConnected
                              ? 'bg-green-50 text-green-700'
                              : 'bg-yellow-50 text-yellow-700'
                          }`}
                        >
                          {shop.isConnected ? 'Connected' : 'Pending'}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className={`text-xs ${
                          shop.syncStatus === 'COMPLETED' ? 'text-green-600' :
                          shop.syncStatus === 'FAILED' ? 'text-red-600' :
                          'text-yellow-600'
                        }`}>
                          Sync: {shop.syncStatus.toLowerCase()}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className={`text-xs ${
                          shop.feedStatus === 'COMPLETED' ? 'text-blue-600' :
                          shop.feedStatus === 'FAILED' ? 'text-red-600' :
                          'text-yellow-600'
                        }`}>
                          Feed: {shop.feedStatus?.toLowerCase() || 'pending'}
                        </span>
                      </div>
                      {shop.lastSyncAt && (
                        <p className="text-xs text-gray-500 mt-2">
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
                    </div>

                    {/* Shop Profile Section */}
                    {shop.isConnected && (
                      <div className="p-4">
                        <div className={`rounded-lg p-5 ${
                          profileComplete
                            ? 'bg-gray-50 border border-gray-200'
                            : 'bg-amber-50 border border-amber-400'
                        }`}>
                          {/* Warning message - only when incomplete */}
                          {!profileComplete && (
                            <div className="flex items-center gap-2 mb-4 text-amber-800">
                              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <span className="font-medium">Complete your shop profile to publish to ChatGPT</span>
                            </div>
                          )}

                          {/* Fields - stacked vertically */}
                          <div className="space-y-4">
                            <div>
                              <div className="text-sm text-gray-500 mb-1">Store name</div>
                              <div className={shop.sellerName ? 'text-gray-900' : 'text-gray-400'}>
                                {shop.sellerName || 'Not set'}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-500 mb-1">Return policy</div>
                              {shop.returnPolicy ? (
                                <a
                                  href={shop.returnPolicy}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#FA7315] hover:text-[#E5650F] underline break-all"
                                >
                                  {shop.returnPolicy}
                                </a>
                              ) : (
                                <div className="text-gray-400">Not set</div>
                              )}
                            </div>
                            <div>
                              <div className="text-sm text-gray-500 mb-1">Return window</div>
                              <div className={shop.returnWindow ? 'text-gray-900' : 'text-gray-400'}>
                                {shop.returnWindow ? `${shop.returnWindow} days` : 'Not set'}
                              </div>
                            </div>
                          </div>

                          {/* Button */}
                          {profileComplete ? (
                            <div className="mt-4 flex justify-end">
                              <button
                                onClick={() => setModalShop(shop)}
                                className="text-[#FA7315] hover:text-[#E5650F] font-medium text-sm"
                              >
                                Edit
                              </button>
                            </div>
                          ) : (
                            <div className="mt-6 flex justify-center">
                              <button
                                onClick={() => setModalShop(shop)}
                                className="bg-[#FA7315] hover:bg-[#E5650F] text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
                              >
                                Complete Shop Setup
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions Section */}
                    {shop.isConnected && (
                      <div className="px-5 py-4 border-t border-gray-200 flex items-center gap-3">
                        <Link
                          href={`/shops/${shop.id}/setup`}
                          className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                        >
                          Check Field Mapping
                        </Link>
                        <button
                          onClick={() => handleSync(shop.id)}
                          disabled={triggerSyncMutation.isPending}
                          className="px-4 py-2 text-sm font-medium bg-[#FA7315] text-white rounded-lg hover:bg-[#E5650F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Sync
                        </button>
                      </div>
                    )}

                    {/* Advanced Settings (Collapsible) */}
                    {shop.isConnected && (
                      <div className="border-t border-gray-200">
                        <button
                          onClick={() => toggleAdvanced(shop.id)}
                          className="w-full px-5 py-4 flex items-center justify-between text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <span className="font-medium text-sm">Advanced settings</span>
                          <svg
                            className={`w-5 h-5 transition-transform ${isAdvancedExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {isAdvancedExpanded && (
                          <div className="px-5 pb-5 space-y-4">
                            {/* Privacy Policy */}
                            <div>
                              <label className="block text-sm text-gray-500 mb-1">Privacy Policy URL</label>
                              <input
                                type="url"
                                value={shop.sellerPrivacyPolicy || ''}
                                onChange={(e) => handleAdvancedFieldChange(shop.id, 'sellerPrivacyPolicy', e.target.value)}
                                placeholder="https://..."
                                className="w-full max-w-md px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:border-[#FA7315] focus:outline-none focus:ring-1 focus:ring-[#FA7315]/20"
                              />
                            </div>

                            {/* Terms of Service */}
                            <div>
                              <label className="block text-sm text-gray-500 mb-1">Terms of Service URL</label>
                              <input
                                type="url"
                                value={shop.sellerTos || ''}
                                onChange={(e) => handleAdvancedFieldChange(shop.id, 'sellerTos', e.target.value)}
                                placeholder="https://..."
                                className="w-full max-w-md px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:border-[#FA7315] focus:outline-none focus:ring-1 focus:ring-[#FA7315]/20"
                              />
                            </div>

                            {/* Auto-sync toggle */}
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-700">Auto-sync:</span>
                              <button
                                onClick={() => handleToggleSync(shop.id, shop.syncEnabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  shop.syncEnabled ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                                title={shop.syncEnabled ? 'Auto-sync enabled (every 15 min)' : 'Auto-sync disabled'}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    shop.syncEnabled ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                              <span className="text-sm text-gray-500">
                                {shop.syncEnabled ? 'Enabled (every 15 min)' : 'Disabled'}
                              </span>
                            </div>

                            {savingAdvanced === shop.id && (
                              <p className="text-xs text-gray-500 italic">Saving...</p>
                            )}

                            {/* Delete Shop */}
                            <div className="pt-4 mt-4 border-t border-gray-200">
                              <button
                                onClick={() => handleDeleteShop(shop.id)}
                                disabled={deleteShopMutation.isPending}
                                className="text-red-500 hover:text-red-700 font-medium text-sm transition-colors"
                              >
                                Delete Shop
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* For non-connected shops, show delete option */}
                    {!shop.isConnected && (
                      <div className="px-5 py-4 border-t border-gray-200">
                        <button
                          onClick={() => handleDeleteShop(shop.id)}
                          disabled={deleteShopMutation.isPending}
                          className="text-sm text-red-500 hover:text-red-700 transition-colors"
                        >
                          Delete Shop
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalShop && (
        <CompleteShopSetupModal
          isOpen={true}
          onClose={() => setModalShop(null)}
          shop={modalShop}
          onSave={handleModalSave}
          isSaving={updateShopMutation.isPending}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
