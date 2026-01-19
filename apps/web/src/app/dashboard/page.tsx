'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useShopsQuery, useUpdateShopMutation, useToggleSyncMutation } from '@/hooks/useShopsQuery';
import { useCurrentShop } from '@/hooks/useCurrentShop';
import { useProductStats } from '@/hooks/useProductStats';
import { useFieldMappingsQuery } from '@/hooks/useFieldMappingsQuery';
import { StoreBanner } from '@/components/dashboard/StoreBanner';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { GettingStartedChecklist } from '@/components/dashboard/GettingStartedChecklist';
import { CompleteShopSetupModal } from '@/components/shops/CompleteShopSetupModal';
import { Toast } from '@/components/catalog/Toast';
import { calculateFieldMappingProgress } from '@/lib/fieldMappingUtils';
import { PageHeader } from '@/components/ui';

export default function DashboardPage() {
  const router = useRouter();
  const { user, hydrated } = useAuth();
  const { data: shops = [], isLoading: loading } = useShopsQuery();
  const { currentShop } = useCurrentShop();
  const { data: productStats } = useProductStats(currentShop?.id);
  const { data: fieldMappingsData } = useFieldMappingsQuery(currentShop?.id);
  const updateShopMutation = useUpdateShopMutation();
  const toggleSyncMutation = useToggleSyncMutation();

  // Modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (hydrated && !user) {
      router.push('/login');
    }
  }, [hydrated, user, router]);

  // Handle store profile modal save
  async function handleProfileSave(data: { sellerName: string | null; returnPolicy: string | null; returnWindow: number | null }) {
    if (!currentShop) return;

    return new Promise<void>((resolve, reject) => {
      updateShopMutation.mutate(
        { shopId: currentShop.id, data },
        {
          onSuccess: () => {
            setIsProfileModalOpen(false);
            setToast({ message: 'Store profile saved successfully!', type: 'success' });
            resolve();
          },
          onError: (err) => {
            setToast({ message: err.message, type: 'error' });
            reject(err);
          },
        }
      );
    });
  }

  if (!hydrated) {
    return (
      <div className="p-4">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const connectedShops = shops.filter((s) => s.isConnected);

  // Calculate field mapping progress
  const fieldMappingProgress = fieldMappingsData?.mappings
    ? calculateFieldMappingProgress(fieldMappingsData.mappings)
    : { requiredFieldsMapped: 0, totalRequiredFields: 0, isComplete: false };

  // Calculate checklist steps
  const isStoreProfileComplete = Boolean(
    currentShop?.sellerName && currentShop?.returnPolicy && currentShop?.returnWindow
  );

  // Feed is truly active only when both openaiEnabled AND syncEnabled are true
  const isFeedActive = (currentShop?.openaiEnabled && currentShop?.syncEnabled) ?? false;
  // Feed is paused when openaiEnabled=true but syncEnabled=false
  const isFeedPaused = (currentShop?.openaiEnabled && !currentShop?.syncEnabled) ?? false;

  const checklistSteps = {
    connectStore: currentShop?.isConnected ?? false,
    selectProducts: (productStats?.selectedProductCount ?? 0) > 0,
    storeProfile: isStoreProfileComplete,
    fieldMappings: fieldMappingProgress.isComplete,
    reviewCatalog: (productStats?.total ?? 0) > 0 && (productStats?.needsAttention ?? 0) === 0,
    activateFeed: isFeedActive,
    unlockMoreItems: user.subscriptionTier !== 'FREE',
  };

  // Handler to reactivate feed (turn syncEnabled back on)
  function handleReactivateFeed() {
    if (!currentShop) return;
    toggleSyncMutation.mutate(
      { shopId: currentShop.id, syncEnabled: true },
      {
        onSuccess: () => {
          setToast({ message: 'Feed reactivated successfully!', type: 'success' });
        },
        onError: (err) => {
          setToast({ message: err.message, type: 'error' });
        },
      }
    );
  }

  const stepDetails = {
    storeUrl: currentShop?.wooStoreUrl?.replace(/^https?:\/\//, '') ?? '',
    totalItems: productStats?.total ?? 0,
    selectedProductCount: productStats?.selectedProductCount ?? 0,
    requiredFieldsMapped: fieldMappingProgress.requiredFieldsMapped,
    totalRequiredFields: fieldMappingProgress.totalRequiredFields,
    needsAttention: productStats?.needsAttention ?? 0,
    inFeed: productStats?.inFeed ?? 0,
    subscriptionTier: user.subscriptionTier,
  };

  // Show empty state if no stores connected
  if (!loading && connectedShops.length === 0) {
    return (
      <div className="p-4">
        <div className="w-full">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          </div>

          {/* Empty State */}
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🏪</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No stores connected yet</h3>
            <p className="text-gray-600 mb-6">
              Connect your first WooCommerce store to start displaying your products in ChatGPT
            </p>
            <Link href="/shops" className="btn btn--primary">
              Connect your first store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="w-full">
        {/* Header */}
        <PageHeader title="Dashboard" />

        {/* Store Banner */}
        {currentShop && (
          <div className="mb-4">
            <StoreBanner shop={currentShop} />
          </div>
        )}

        {/* Stats Grid */}
        {currentShop && productStats && (
          <div className="mb-6">
            <StatsGrid
              shopId={currentShop.id}
              stats={{
                total: productStats.total,
                inFeed: productStats.inFeed,
                needsAttention: productStats.needsAttention,
                productCount: productStats.productCount,
                productCountInFeed: productStats.productCountInFeed,
                productCountNeedsAttention: productStats.productCountNeedsAttention,
              }}
              lastFeedGeneratedAt={currentShop.lastFeedGeneratedAt ?? null}
              syncEnabled={currentShop.syncEnabled}
              feedStatus={currentShop.feedStatus}
              openaiEnabled={currentShop.openaiEnabled}
            />
          </div>
        )}

        {/* Getting Started Checklist */}
        {currentShop && (
          <GettingStartedChecklist
            shopId={currentShop.id}
            steps={checklistSteps}
            stepDetails={stepDetails}
            onOpenStoreProfile={() => setIsProfileModalOpen(true)}
            isFeedPaused={isFeedPaused}
            onReactivateFeed={handleReactivateFeed}
            isReactivating={toggleSyncMutation.isPending}
          />
        )}
      </div>

      {/* Complete Store Profile Modal */}
      {currentShop && (
        <CompleteShopSetupModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          shop={currentShop}
          onSave={handleProfileSave}
          isSaving={updateShopMutation.isPending}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
