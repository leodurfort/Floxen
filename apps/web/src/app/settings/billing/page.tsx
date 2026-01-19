'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import * as api from '@/lib/api';
import { useAuth } from '@/store/auth';

const TIER_DISPLAY: Record<string, { name: string; limit: string }> = {
  FREE: { name: 'Free', limit: '15 products' },
  STARTER: { name: 'Starter', limit: '500 products' },
  PROFESSIONAL: { name: 'Pro', limit: 'Unlimited products' },
};

export default function BillingSettingsPage() {
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const [billing, setBilling] = useState<api.BillingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  const successParam = searchParams.get('success');
  const canceledParam = searchParams.get('canceled');

  console.debug('[BILLING-PAGE] Component mounted', {
    successParam,
    canceledParam,
    currentUrl: typeof window !== 'undefined' ? window.location.href : 'SSR',
  });

  useEffect(() => {
    async function loadBilling() {
      console.debug('[BILLING-PAGE] loadBilling() started');
      try {
        const data = await api.getBilling();
        console.debug('[BILLING-PAGE] loadBilling() success', {
          tier: data.tier,
          status: data.status,
          currentPeriodEnd: data.currentPeriodEnd,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd,
        });
        setBilling(data);

        // Sync user profile to auth store to update subscription tier across the app
        try {
          const freshUser = await api.getProfile();
          setUser(freshUser);
          console.debug('[BILLING-PAGE] User profile synced to auth store');
        } catch {
          // Silent fail - billing page still works, sync will happen on next visit
          console.debug('[BILLING-PAGE] User profile sync failed (non-critical)');
        }
      } catch (err) {
        console.error('[BILLING-PAGE] loadBilling() FAILED', err);
        setError(err instanceof Error ? err.message : 'Failed to load billing info');
      } finally {
        setIsLoading(false);
        console.debug('[BILLING-PAGE] loadBilling() completed, isLoading set to false');
      }
    }
    loadBilling();
  }, [setUser]);

  async function handleManageBilling() {
    console.debug('[BILLING-PAGE] handleManageBilling() called');
    setIsPortalLoading(true);
    setError('');

    try {
      console.debug('[BILLING-PAGE] Creating portal session...');
      const { url } = await api.createPortalSession();
      console.debug('[BILLING-PAGE] Portal session created, redirecting to:', url);
      window.location.href = url;
    } catch (err) {
      console.error('[BILLING-PAGE] handleManageBilling() FAILED', err);
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
      setIsPortalLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-w-xl">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const tierInfo = billing ? TIER_DISPLAY[billing.tier] || TIER_DISPLAY.FREE : TIER_DISPLAY.FREE;
  const isPaid = billing?.tier !== 'FREE';
  const isActive = billing?.status === 'active';

  return (
    <div className="space-y-6 max-w-xl">
      {/* Success/Cancel Messages */}
      {successParam === 'true' && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          Your subscription has been activated successfully.
        </div>
      )}

      {canceledParam === 'true' && (
        <div className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
          Checkout was canceled. No changes were made to your subscription.
        </div>
      )}

      {/* Current Plan */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Current Plan</h2>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {tierInfo.name}
              {isPaid && billing?.billingInterval && (
                <span className="text-base font-medium text-gray-500 ml-2">
                  ({billing.billingInterval === 'year' ? 'Annual' : 'Monthly'})
                </span>
              )}
            </p>
            <p className="text-sm text-gray-500">{tierInfo.limit}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isPaid && isActive && !billing?.cancelAtPeriodEnd
                ? 'bg-green-100 text-green-800'
                : isPaid && billing?.cancelAtPeriodEnd
                ? 'bg-yellow-100 text-yellow-800'
                : isPaid
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {isPaid
              ? billing?.cancelAtPeriodEnd
                ? 'Canceling'
                : isActive
                ? 'Active'
                : billing?.status || 'Inactive'
              : 'Free Plan'}
          </span>
        </div>

        {billing?.currentPeriodEnd && (
          <p className="text-sm text-gray-500 mb-4">
            {billing.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} on{' '}
            {new Date(billing.currentPeriodEnd).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        )}

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {isPaid ? (
            <button
              onClick={handleManageBilling}
              disabled={isPortalLoading}
              className="btn btn--secondary py-2.5 px-6"
            >
              {isPortalLoading ? 'Opening...' : 'Manage Subscription'}
            </button>
          ) : (
            <Link href="/pricing" className="btn btn--primary py-2.5 px-6">
              Upgrade Plan
            </Link>
          )}
        </div>
      </div>

      {/* Plan Comparison */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h3>

        <div className="space-y-4">
          <div className={`p-4 rounded-lg border ${billing?.tier === 'FREE' ? 'border-[#FA7315] bg-[#FA7315]/5' : 'border-gray-200'}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-gray-900">Free</p>
                <p className="text-sm text-gray-500">15 products</p>
              </div>
              <span className="text-gray-500">$0/mo</span>
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${billing?.tier === 'STARTER' ? 'border-[#FA7315] bg-[#FA7315]/5' : 'border-gray-200'}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-gray-900">Starter</p>
                <p className="text-sm text-gray-500">500 products</p>
              </div>
              <span className="text-gray-700 font-medium">$25/mo</span>
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${billing?.tier === 'PROFESSIONAL' ? 'border-[#FA7315] bg-[#FA7315]/5' : 'border-gray-200'}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-gray-900">Pro</p>
                <p className="text-sm text-gray-500">Unlimited products</p>
              </div>
              <span className="text-gray-700 font-medium">$37/mo</span>
            </div>
          </div>
        </div>

        {billing?.tier !== 'PROFESSIONAL' && (
          <div className="mt-4">
            <Link href="/pricing" className="text-[#FA7315] hover:text-[#E5680D] text-sm font-medium">
              Compare plans and upgrade &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
