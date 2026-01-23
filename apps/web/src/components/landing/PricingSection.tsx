'use client';

import { useState } from 'react';
import Link from 'next/link';
import { pricingPlans } from '@/lib/landing-data';

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(
    'annual'
  );

  return (
    <section id="pricing" className="landing-section landing-section--alt">
      <div className="landing-container">
        {/* Section header */}
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-10">
          <div className="bg-gray-200 rounded-lg p-1 flex">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-primary ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              aria-pressed={billingCycle === 'monthly'}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-primary ${
                billingCycle === 'annual'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              aria-pressed={billingCycle === 'annual'}
            >
              Annual
              <span className="ml-1.5 text-green-600 text-xs font-semibold">
                - Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pricingPlans.map((plan) => {
            const price =
              billingCycle === 'monthly'
                ? plan.monthlyPrice
                : Math.round(plan.annualPrice / 12);

            // Tier-based styling
            const borderClass =
              plan.tier === 'PRO'
                ? 'border-2 border-landing-primary'
                : plan.tier === 'STARTER'
                  ? 'border-2 border-[#874851]'
                  : 'border-2 border-gray-200';

            const buttonClass =
              plan.tier === 'PRO'
                ? 'bg-landing-primary text-white hover:bg-landing-primary/90'
                : plan.tier === 'STARTER'
                  ? 'bg-[#874851] text-white hover:bg-[#874851]/90'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200';

            const limitColor =
              plan.tier === 'PRO'
                ? 'text-landing-primary'
                : plan.tier === 'STARTER'
                  ? 'text-[#874851]'
                  : 'text-gray-600';

            return (
              <div
                key={plan.tier}
                className={`bg-white rounded-xl p-6 flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${borderClass}`}
              >
                {/* Plan header */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-gray-900">
                      ${price}
                    </span>
                    <span className="text-gray-500">/mo</span>
                  </div>
                  {billingCycle === 'annual' && plan.annualPrice > 0 && (
                    <p className="text-sm text-gray-500">
                      ${plan.annualPrice}/year
                    </p>
                  )}
                  <p className={`text-sm font-medium mt-2 ${limitColor}`}>
                    {plan.limit}
                  </p>
                </div>

                {/* Features list */}
                <ul className="space-y-3 mb-6 flex-grow">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-sm">
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
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA - aligned at bottom */}
                <Link
                  href="/register"
                  className={`block text-center py-3 rounded-lg font-medium transition-colors mt-auto ${buttonClass}`}
                >
                  {plan.ctaText}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
