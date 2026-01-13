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

// Format timestamp
function formatTimestamp(date: string | null | undefined): string {
  if (!date) return 'Never';
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
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

  // Handle openProfile query param: /shops?openProfile=shopId
  const openProfileId = searchParams.get('openProfile');

  useEffect(() => {
    if (isOAuthRedirect && shopIdFromUrl) {
      router.replace('/shops', { scroll: false });
      setToast({ message: 'Store connected successfully! Syncing products...', type: 'success' });
    }
  }, [isOAuthRedirect, shopIdFromUrl, router]);

  // Auto-open modal when openProfile param is present
  useEffect(() => {
    if (openProfileId && shops.length > 0 && !modalShop) {
      const shopToOpen = shops.find(s => s.id === openProfileId);
      if (shopToOpen) {
        setModalShop(shopToOpen);
        // Clean up URL
        router.replace('/shops', { scroll: false });
      }
    }
  }, [openProfileId, shops, modalShop, router]);

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

  return (
    <div className="p-4">
      <div className="w-full">
        {/* Banner for incomplete profile - at very top */}
        {incompleteShop && (
          <ShopProfileBanner shop={incompleteShop} currentPath="shops" />
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Your Stores</h1>
            </div>
            <button
              onClick={() => setShowConnectModal(true)}
              className="btn btn--primary"
            >
              Connect new store
            </button>
          </div>
          <p className="text-gray-600 text-sm">
            Manage your WooCommerce store connections
          </p>
        </div>

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
                const hasValidProducts = (shop.validProductCount ?? 0) > 0;
                const isAdvancedExpanded = expandedAdvanced[shop.id] ?? false;

                // Determine button states based on progress
                // State 1: Profile incomplete - Mapping is gray, Sync is gray
                // State 2: Profile complete, no valid products - Mapping is orange, Sync is gray (disabled)
                // State 3: Profile complete, valid products exist - Mapping is gray ("Check Field Mapping"), Sync is gray (enabled)
                const mappingButtonOrange = profileComplete && !hasValidProducts;
                const mappingButtonText = profileComplete && hasValidProducts ? 'Check Field Mapping' : 'Complete Mapping Setup';
                const syncDisabled = triggerSyncMutation.isPending || (profileComplete && !hasValidProducts);

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
                            <span className="text-yellow-600 font-medium">• Pending</span>
                          )}
                        </div>

                        {/* Right: Action buttons */}
                        {shop.isConnected && (
                          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                            <Link
                              href={`/shops/${shop.id}/setup`}
                              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                                mappingButtonOrange
                                  ? 'bg-[#FA7315] hover:bg-[#E5650F] text-white'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                              }`}
                            >
                              {mappingButtonText}
                            </Link>
                            <button
                              onClick={() => handleSync(shop.id)}
                              disabled={syncDisabled}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Sync WooCommerce Products
                            </button>
                          </div>
                        )}
                      </div>

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
                                  style={{ width: `${shop.syncProgress}%` }}
                                />
                              ) : (
                                <div className="h-full w-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 animate-pulse" />
                              )}
                            </div>
                            <span className="text-xs text-gray-500 min-w-[3rem] text-right">
                              {shop.syncProgress !== null && shop.syncProgress !== undefined
                                ? `${shop.syncProgress}%`
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
                            {/* Button/Edit link */}
                            {profileComplete ? (
                              <button
                                onClick={() => setModalShop(shop)}
                                className="text-[#FA7315] hover:underline font-medium text-sm"
                              >
                                Edit
                              </button>
                            ) : (
                              <button
                                onClick={() => setModalShop(shop)}
                                className="bg-[#FA7315] hover:bg-[#E5650F] text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                              >
                                Complete Store Profile
                              </button>
                            )}
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
