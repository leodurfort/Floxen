'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/store/auth';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { Toast } from '@/components/catalog/Toast';
import { CompleteShopSetupModal } from '@/components/shops/CompleteShopSetupModal';
import { ConnectShopModal } from '@/components/shops/ConnectShopModal';
import { ShopProfileBanner } from '@/components/shops/ShopProfileBanner';
import { SyncStatusBanner } from '@/components/shops/SyncStatusBanner';
import { PageHeader, Button } from '@/components/ui';
import type { Shop } from '@floxen/shared';
import {
  useShopsQuery,
  useShopsSyncPolling,
  useCreateShopMutation,
  useDeleteShopMutation,
  useToggleSyncMutation,
  useTriggerSyncMutation,
  useUpdateShopMutation,
} from '@/hooks/useShopsQuery';
import { isValidUrl, formatTimestamp } from '@/lib/validation';

function isProfileComplete(shop: Shop): boolean {
  return Boolean(shop.sellerName && shop.returnPolicy && shop.returnWindow);
}

function isFirstSync(shop: Shop): boolean {
  // Must be connected AND in sync state AND never synced before
  return shop.isConnected && (shop.syncStatus === 'SYNCING' || shop.syncStatus === 'PENDING') && shop.lastSyncAt === null;
}

export default function ShopsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, hydrated } = useAuth();

  const { data: shops = [], isLoading: loading } = useShopsQuery();

  // UI state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [modalShop, setModalShop] = useState<Shop | null>(null);
  const [expandedAdvanced, setExpandedAdvanced] = useState<Record<string, boolean>>({});
  const prevSyncStatusesRef = useRef<Record<string, string>>({});
  const oauthHandledRef = useRef(false);

  // URL query params
  const shopIdFromUrl = searchParams.get('shop');
  const isOAuthReturn = searchParams.get('oauth') === 'complete';
  const openProfileId = searchParams.get('openProfile');

  useEffect(() => {
    if (openProfileId && shops.length > 0 && !modalShop) {
      const shopToOpen = shops.find(s => s.id === openProfileId);
      if (shopToOpen) {
        setModalShop(shopToOpen);
        router.replace('/shops', { scroll: false });
      }
    }
  }, [openProfileId, shops, modalShop, router]);

  const hasSyncingShops = shops.some(
    (shop) => shop.syncStatus === 'PENDING' || shop.syncStatus === 'SYNCING'
  );
  useShopsSyncPolling(hasSyncingShops);

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

  // Handle OAuth return - check if connection succeeded or was denied
  useEffect(() => {
    if (isOAuthReturn && shopIdFromUrl && shops.length > 0 && !oauthHandledRef.current) {
      oauthHandledRef.current = true;

      const shop = shops.find((s) => s.id === shopIdFromUrl);
      if (shop?.isConnected) {
        // Check if user needs to select products (FREE/STARTER tier)
        const tier = user?.subscriptionTier || 'FREE';
        const needsProductSelection = tier !== 'PROFESSIONAL';

        if (needsProductSelection) {
          // Redirect to product selection page
          setToast({ message: 'Store connected successfully! Select products to sync.', type: 'success' });
          router.replace(`/shops/${shop.id}/select-products`);
        } else {
          // PRO tier: full sync, stay on shops page
          router.replace('/shops', { scroll: false });
          setToast({ message: 'Store connected successfully! Syncing products...', type: 'success' });
        }
      } else {
        // OAuth was denied or failed - clean up orphaned shop
        router.replace('/shops', { scroll: false });
        setToast({ message: 'Store connection was cancelled or denied.', type: 'error' });
        if (shop) {
          deleteShopMutation.mutate(shop.id);
        }
      }
    }
  }, [isOAuthReturn, shopIdFromUrl, shops, router, deleteShopMutation, user]);

  // Local state
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
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

  function handleConnectShop(storeUrl: string) {
    if (!user || !storeUrl.trim()) return;
    setConnectError(null);
    createShopMutation.mutate(
      { storeUrl: storeUrl.trim() },
      {
        onSuccess: (data) => {
          window.location.href = data.authUrl;
        },
        onError: (err) => {
          setConnectError(err.message);
        },
      }
    );
  }

  function handleDeleteShop(shopId: string) {
    if (!user || !confirm('Are you sure you want to delete this store? This action cannot be undone.')) return;
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

  async function handleRetryOAuth(shopId: string) {
    if (!user) return;
    try {
      const { authUrl } = await import('@/lib/api').then(m => m.getShopOAuthUrl(shopId));
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get OAuth URL');
    }
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
            setToast({ message: 'Store profile saved successfully!', type: 'success' });
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

  // Find first shop with incomplete profile for banner
  const incompleteShop = shops.find(shop => shop.isConnected && !isProfileComplete(shop));

  // Check if any shop is in first sync state
  const hasShopInFirstSync = shops.some(shop => isFirstSync(shop));

  return (
    <div className="p-4">
      <div className="w-full">
        {/* Banner for incomplete profile - at very top */}
        {incompleteShop && (
          <ShopProfileBanner shop={incompleteShop} currentPath="shops" />
        )}

        {/* Header */}
        <PageHeader
          title="Your Stores"
          subtitle="Manage your WooCommerce store connections"
          actions={
            !hasShopInFirstSync && (
              <Button variant="primary" onClick={() => setShowConnectModal(true)}>
                Connect new store
              </Button>
            )
          }
        />

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}


        {/* Shops List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {shops.length} {shops.length === 1 ? 'Store' : 'Stores'}
            </h2>
          </div>

          {loading && shops.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="text-center text-gray-500">Loading stores...</div>
            </div>
          ) : shops.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="text-center">
                <p className="text-gray-600 mb-4">No stores yet. Click below to connect your first store.</p>
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="btn btn--primary"
                >
                  Connect new store
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
                    {/* Main Card Header */}
                    <div className="p-5">
                      {/* Row 1: URL + Connected + Buttons */}
                      <div className="flex justify-between items-start mb-3">
                        {/* Left: URL and connected status */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-lg font-semibold text-gray-900">
                            {shop.wooStoreUrl}
                          </span>
                          {shop.isConnected ? (
                            <span className="text-green-600 font-medium">• Connected ✓</span>
                          ) : (
                            <span className="text-orange-600 font-medium">• Connection Incomplete</span>
                          )}
                        </div>

                        {/* Right: Action buttons - Unconnected shops */}
                        {!shop.isConnected && (
                          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                            <button
                              onClick={() => handleRetryOAuth(shop.id)}
                              className="bg-[#FA7315] hover:bg-[#E5650F] text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                            >
                              Retry Connection
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this store?')) {
                                  deleteShopMutation.mutate(shop.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}

                        {/* Right: Action buttons - Connected shops */}
                        {shop.isConnected && (
                          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                            {isFirstSync(shop) ? (
                              /* First sync state: Show "Complete Store Profile" button instead of action buttons */
                              <button
                                onClick={() => setModalShop(shop)}
                                className="bg-[#FA7315] hover:bg-[#E5650F] text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                              >
                                Complete Store Profile
                              </button>
                            ) : (
                              /* Normal state: Show product selection button */
                              <Link
                                href={`/shops/${shop.id}/select-products`}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                              >
                                Update Product Selection
                              </Link>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Connection Incomplete Banner - shows for unconnected shops */}
                      {!shop.isConnected && (
                        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <p className="text-sm text-orange-800">
                            WooCommerce authorization was not completed. Click &quot;Retry Connection&quot; to authorize access to your store, or delete this entry to start over.
                          </p>
                        </div>
                      )}

                      {/* First Sync Banner - shows during initial sync */}
                      {isFirstSync(shop) && (
                        <div className="mt-3">
                          <SyncStatusBanner shop={shop} />
                        </div>
                      )}

                      {/* Sync/Feed status - only for connected shops, hidden during first sync */}
                      {shop.isConnected && !isFirstSync(shop) && (
                        <>
                          {/* Row 2: Sync status */}
                          <div className="text-sm text-gray-600 mb-1">
                            Sync:{' '}
                            <span className={`font-medium ${
                              shop.syncStatus === 'COMPLETED' ? 'text-green-600' :
                              shop.syncStatus === 'FAILED' ? 'text-red-600' :
                              shop.syncStatus === 'SYNCING' ? 'text-blue-600' :
                              'text-amber-600'
                            }`}>
                              {shop.syncStatus.toLowerCase()}
                            </span>
                            {' '}• Last synced: {formatTimestamp(shop.lastSyncAt)}
                          </div>

                          {/* Sync Progress Bar */}
                          {(shop.syncStatus === 'SYNCING' || shop.syncStatus === 'PENDING') && (
                            <div className="mt-2 mb-1">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  {shop.syncProgress !== null && shop.syncProgress !== undefined ? (
                                    <div
                                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                      style={{ width: `${Math.max(shop.syncProgress, 5)}%` }}
                                    />
                              ) : (
                                <div
                                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                  style={{ width: '5%' }}
                                />
                              )}
                            </div>
                            <span className="text-xs text-gray-500 min-w-[3rem] text-right">
                              {shop.syncProgress !== null && shop.syncProgress !== undefined
                                ? `${Math.max(shop.syncProgress, 5)}%`
                                : 'Starting...'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Row 3: Feed status */}
                      <div className="text-sm text-gray-600">
                        Feed:{' '}
                        <span className={`font-medium ${
                          shop.feedStatus === 'COMPLETED' ? 'text-green-600' :
                          shop.feedStatus === 'FAILED' ? 'text-red-600' :
                          shop.feedStatus === 'SYNCING' ? 'text-blue-600' :
                          'text-amber-600'
                        }`}>
                          {shop.feedStatus?.toLowerCase() || 'pending'}
                        </span>
                        {' '}• Last published: {formatTimestamp(shop.lastFeedGeneratedAt)}
                      </div>
                    </>
                  )}
                </div>

                {/* Shop Profile Section */}
                    {shop.isConnected && (
                      <div className={`mx-5 mb-5 rounded-xl p-5 ${
                        profileComplete
                          ? 'bg-gray-50 border border-gray-200'
                          : 'bg-amber-50 border border-amber-400'
                      }`}>
                        {/* Header row */}
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-gray-900">Store Profile</span>
                            <button
                              onClick={() => setModalShop(shop)}
                              className="text-[#FA7315] hover:underline font-medium text-sm"
                            >
                              Edit
                            </button>
                          </div>
                        </div>

                        {/* Fields - stacked vertically */}
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs text-gray-500">Store name</div>
                            <div className={shop.sellerName ? 'text-sm font-medium text-gray-900' : 'text-sm text-gray-400'}>
                              {shop.sellerName || 'Not set'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Return policy</div>
                            {shop.returnPolicy ? (
                              <a
                                href={shop.returnPolicy}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-gray-900 hover:text-gray-700 underline break-all"
                              >
                                {shop.returnPolicy}
                              </a>
                            ) : (
                              <div className="text-sm text-gray-400">Not set</div>
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Return window</div>
                            <div className={shop.returnWindow ? 'text-sm font-medium text-gray-900' : 'text-sm text-gray-400'}>
                              {shop.returnWindow ? `${shop.returnWindow} days` : 'Not set'}
                            </div>
                          </div>
                        </div>
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

                            {/* Auto-sync & Publish toggle */}
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-700">Auto-sync & Publish:</span>
                              <button
                                onClick={() => handleToggleSync(shop.id, shop.syncEnabled)}
                                disabled={!shop.openaiEnabled}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  !shop.openaiEnabled
                                    ? 'bg-gray-200 cursor-not-allowed'
                                    : shop.syncEnabled
                                      ? 'bg-green-500'
                                      : 'bg-gray-300'
                                }`}
                                title={
                                  !shop.openaiEnabled
                                    ? 'Activate feed first to enable auto-sync'
                                    : shop.syncEnabled
                                      ? 'Auto-sync enabled (hourly)'
                                      : 'Auto-sync disabled'
                                }
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    shop.syncEnabled && shop.openaiEnabled ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                              <span className="text-sm text-gray-500">
                                {!shop.openaiEnabled
                                  ? 'Requires feed activation'
                                  : shop.syncEnabled
                                    ? 'Enabled (hourly)'
                                    : 'Disabled'}
                              </span>
                            </div>

                            {savingAdvanced === shop.id && (
                              <p className="text-xs text-gray-500 italic">Saving...</p>
                            )}

                            {/* Delete Store */}
                            <div className="pt-4 mt-4 border-t border-gray-200">
                              <button
                                onClick={() => handleDeleteShop(shop.id)}
                                disabled={deleteShopMutation.isPending}
                                className="text-red-500 hover:text-red-700 font-medium text-sm transition-colors"
                              >
                                Delete Store
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
                          Delete Store
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

      {/* Connect Shop Modal */}
      <ConnectShopModal
        isOpen={showConnectModal}
        onClose={() => {
          setShowConnectModal(false);
          setConnectError(null);
        }}
        onConnect={handleConnectShop}
        isConnecting={createShopMutation.isPending}
        error={connectError}
      />

      {/* Complete Shop Setup Modal */}
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
