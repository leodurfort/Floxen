'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import * as api from '@/lib/api';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  tier: string;
  price: { monthly: number; annual: number };
  priceId: { monthly: string; annual: string };
  limit: string;
  description: string;
  features: PlanFeature[];
  popular?: boolean;
}

export default function PricingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [prices, setPrices] = useState<api.BillingPrices | null>(null);
  const [currentTier, setCurrentTier] = useState<string>('FREE');
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  console.debug('[PRICING-PAGE] Component render', {
    hasUser: !!user,
    userId: user?.id,
    userTier: user?.subscriptionTier,
    currentTier,
    billingCycle,
    hasPrices: !!prices,
  });

  useEffect(() => {
    async function loadData() {
      console.debug('[PRICING-PAGE] loadData() started', {
        hasUser: !!user,
        userId: user?.id,
      });

      try {
        const [pricesData, billingData] = await Promise.all([
          api.getBillingPrices(),
          user ? api.getBilling() : Promise.resolve(null),
        ]);

        console.debug('[PRICING-PAGE] loadData() responses', {
          prices: pricesData,
          billingData,
        });

        setPrices(pricesData);
        if (billingData) {
          console.debug('[PRICING-PAGE] Setting currentTier from API', {
            tier: billingData.tier,
            status: billingData.status,
            cancelAtPeriodEnd: billingData.cancelAtPeriodEnd,
          });
          setCurrentTier(billingData.tier);
          setCancelAtPeriodEnd(billingData.cancelAtPeriodEnd ?? false);
        }
      } catch (err) {
        console.error('[PRICING-PAGE] Failed to load pricing data:', err);
      }
    }
    loadData();
  }, [user]);

  const plans: Plan[] = [
    {
      name: 'Free',
      tier: 'FREE',
      price: { monthly: 0, annual: 0 },
      priceId: { monthly: '', annual: '' },
      limit: '5 products',
      description: 'Perfect for trying out Floxen',
      features: [
        { text: 'Up to 5 products', included: true },
        { text: 'WooCommerce sync', included: true },
        { text: 'ChatGPT feed generation', included: true },
        { text: 'Chat support', included: true },
      ],
    },
    {
      name: 'Starter',
      tier: 'STARTER',
      price: { monthly: 25, annual: 250 },
      priceId: {
        monthly: prices?.starter.monthly || '',
        annual: prices?.starter.annual || '',
      },
      limit: '100 products',
      description: 'For growing stores',
      features: [
        { text: 'Up to 100 products', included: true },
        { text: 'WooCommerce sync', included: true },
        { text: 'ChatGPT feed generation', included: true },
        { text: 'Chat support', included: true },
        { text: 'ChatGPT Analytics (coming soon)', included: true },
      ],
    },
    {
      name: 'Pro',
      tier: 'PROFESSIONAL',
      price: { monthly: 37, annual: 374 },
      priceId: {
        monthly: prices?.professional.monthly || '',
        annual: prices?.professional.annual || '',
      },
      limit: 'Unlimited',
      description: 'For large catalogs',
      features: [
        { text: 'Unlimited products', included: true },
        { text: 'WooCommerce sync', included: true },
        { text: 'ChatGPT feed generation', included: true },
        { text: 'Chat support', included: true },
        { text: 'ChatGPT Analytics (coming soon)', included: true },
      ],
    },
  ];

  async function handleSelectPlan(plan: Plan) {
    console.debug('[PRICING-PAGE] handleSelectPlan() called', {
      planTier: plan.tier,
      planName: plan.name,
      currentTier,
      billingCycle,
      priceId: plan.priceId[billingCycle],
      hasUser: !!user,
    });

    // Block if already on this plan
    if (plan.tier === currentTier) {
      console.debug('[PRICING-PAGE] Plan selection blocked (current plan)', {
        planTier: plan.tier,
        currentTier,
      });
      return;
    }

    // Free plan selected by a paid user - redirect to portal to cancel/downgrade
    if (plan.tier === 'FREE' && currentTier !== 'FREE') {
      console.debug('[PRICING-PAGE] Free plan selected by paid user, redirecting to portal');
      setIsLoading('FREE');
      setError('');
      // Store current tier before redirect to detect changes on return (billing page reads this)
      sessionStorage.setItem('previousTier', currentTier);
      sessionStorage.setItem('previousCancelAtPeriodEnd', String(cancelAtPeriodEnd));
      try {
        const { url } = await api.createPortalSession();
        window.location.href = url;
      } catch (err) {
        console.error('[PRICING-PAGE] Portal session FAILED', err);
        setError(err instanceof Error ? err.message : 'Failed to open billing portal');
        setIsLoading(null);
      }
      return;
    }

    // Block free-to-free selection
    if (plan.tier === 'FREE') {
      console.debug('[PRICING-PAGE] Plan selection blocked (already on FREE)', {
        planTier: plan.tier,
        currentTier,
      });
      return;
    }

    if (!user) {
      console.debug('[PRICING-PAGE] No user, redirecting to login');
      router.push('/login?redirect=/pricing');
      return;
    }

    const priceId = plan.priceId[billingCycle];
    if (!priceId) {
      console.error('[PRICING-PAGE] No priceId available', {
        planTier: plan.tier,
        billingCycle,
        allPriceIds: plan.priceId,
      });
      setError('Pricing not available. Please try again later.');
      return;
    }

    setIsLoading(plan.tier);
    setError('');

    try {
      // If user already has a paid subscription, redirect to portal for plan changes
      if (currentTier !== 'FREE') {
        console.debug('[PRICING-PAGE] User has subscription, redirecting to portal', {
          currentTier,
          targetTier: plan.tier,
        });
        // Store current tier before redirect to detect changes on return (billing page reads this)
        sessionStorage.setItem('previousTier', currentTier);
        sessionStorage.setItem('previousCancelAtPeriodEnd', String(cancelAtPeriodEnd));
        const { url } = await api.createPortalSession();
        window.location.href = url;
        return;
      }

      // For FREE users, create a new checkout session
      console.debug('[PRICING-PAGE] Creating checkout session', {
        priceId,
        planTier: plan.tier,
        billingCycle,
      });
      const { url } = await api.createCheckoutSession(priceId);
      console.debug('[PRICING-PAGE] Checkout session created, redirecting', {
        url,
      });
      window.location.href = url;
    } catch (err) {
      console.error('[PRICING-PAGE] Checkout session FAILED', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setIsLoading(null);
    }
  }

  function getButtonText(plan: Plan): string {
    if (plan.tier === currentTier) {
      return 'Current Plan';
    }
    if (plan.tier === 'FREE') {
      return 'Free Forever';
    }
    if (currentTier !== 'FREE') {
      // User has a paid subscription
      // Show "Upgrade Plan" when upgrading (e.g., Starter to Pro)
      // Show "Manage in Portal" for downgrades
      const tierOrder = { FREE: 0, STARTER: 1, PROFESSIONAL: 2 };
      const currentLevel = tierOrder[currentTier as keyof typeof tierOrder] ?? 0;
      const targetLevel = tierOrder[plan.tier as keyof typeof tierOrder] ?? 0;
      return targetLevel > currentLevel ? 'Upgrade Plan' : 'Manage in Portal';
    }
    return 'Get Started';
  }

  function isButtonDisabled(plan: Plan): boolean {
    // Disable if it's the current plan
    // Free plan is now selectable if user has a paid subscription (to downgrade via portal)
    if (plan.tier === currentTier) {
      return true;
    }
    // Free plan is only disabled if user is already on free tier
    if (plan.tier === 'FREE' && currentTier === 'FREE') {
      return true;
    }
    return false;
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Plan</h1>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 rounded-lg p-1 flex">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'annual'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Annual
            <span className="ml-1 text-green-600 text-xs">Save 17%</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="max-w-md mx-auto mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.tier}
            className={`relative bg-white rounded-xl border-2 p-6 ${
              plan.tier === currentTier
                ? 'border-green-500'
                : 'border-gray-200'
            }`}
          >
            {plan.tier === currentTier && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Current Plan
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

              <div className="mb-2">
                <span className="text-4xl font-bold text-gray-900">
                  ${billingCycle === 'monthly' ? plan.price.monthly : Math.round(plan.price.annual / 12)}
                </span>
                <span className="text-gray-500">/mo</span>
              </div>

              {billingCycle === 'annual' && plan.price.annual > 0 && (
                <p className="text-sm text-gray-500">
                  ${plan.price.annual}/year
                </p>
              )}

              <p className="text-sm font-medium text-[#FA7315] mt-2">{plan.limit}</p>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-center text-sm">
                  {feature.included ? (
                    <svg
                      className="w-5 h-5 text-green-500 mr-2 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-gray-300 mr-2 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                  <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelectPlan(plan)}
              disabled={isButtonDisabled(plan) || isLoading === plan.tier}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                isButtonDisabled(plan)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {isLoading === plan.tier ? 'Redirecting...' : getButtonText(plan)}
            </button>
          </div>
        ))}
      </div>

      {/* FAQ or Additional Info */}
      <div className="mt-12 text-center">
        <p className="text-gray-500 text-sm">
          All plans include WooCommerce integration, OpenAI feed generation, and secure data handling.
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Questions?{' '}
          <a href="mailto:support@floxen.com" className="text-[#FA7315] hover:underline">
            Contact us
          </a>
        </p>
      </div>
    </div>
  );
}
