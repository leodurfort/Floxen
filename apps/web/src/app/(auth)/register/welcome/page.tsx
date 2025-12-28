'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import * as api from '@/lib/api';

// Progress Step Component
function ProgressBar() {
  return (
    <div className="flex items-center justify-center gap-2 text-sm">
      {/* Step 1: Account - Completed */}
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full bg-[#FA7315] flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="text-[#FA7315] font-medium">Account</span>
      </div>

      {/* Connector */}
      <div className="w-8 lg:w-12 h-px bg-gray-300 mx-1" />

      {/* Step 2: Connect store - Active */}
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full bg-[#FA7315] flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-white" />
        </div>
        <span className="text-[#FA7315] font-medium">Connect store</span>
      </div>

      {/* Connector */}
      <div className="w-8 lg:w-12 h-px bg-gray-300 mx-1" />

      {/* Step 3: Products live - Upcoming */}
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-gray-300" />
        </div>
        <span className="text-gray-400">Products live in ChatGPT</span>
      </div>
    </div>
  );
}

// WooCommerce Logo Component (links to woocommerce.com)
function WooCommerceLogo({ className = "h-8" }: { className?: string }) {
  return (
    <a href="https://woocommerce.com" target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
      <img
        src="/logos/woocommerce.png"
        alt="WooCommerce"
        className={className}
      />
    </a>
  );
}

// Trust Badge Component
function TrustBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span className="flex-shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

// Connection Modal Component
function ConnectionModal({
  isOpen,
  onClose,
  storeUrl,
  setStoreUrl,
  error,
  isLoading,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  storeUrl: string;
  setStoreUrl: (url: string) => void;
  error: string;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <WooCommerceLogo className="h-10" />
          <h3 className="text-lg font-semibold text-gray-900">
            Connect your store
          </h3>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-col gap-2 mb-6 p-3 bg-gray-50 rounded-lg">
          <TrustBadge
            icon={
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            }
            text="Read-only product access"
          />
          <TrustBadge
            icon={
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
            text="Uses official WooCommerce OAuth"
          />
          <TrustBadge
            icon={
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            text="Takes ~10 seconds"
          />
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">Store URL</span>
            <input
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              type="url"
              placeholder="https://example-store.com"
              required
              autoFocus
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#FA7315] focus:outline-none focus:ring-2 focus:ring-[#FA7315]/10 transition-colors"
            />
          </label>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            className="w-full bg-[#FA7315] hover:bg-[#E5650F] text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Connecting...' : 'Connect & preview my products'}
          </button>
        </form>

        {/* OAuth Reassurance */}
        <p className="text-center text-sm text-gray-500 mt-4">
          You&apos;ll be redirected to WooCommerce to approve access.
          <br />
          No changes will be made to your store.
        </p>
      </div>
    </div>
  );
}

export default function RegisterWelcomePage() {
  const router = useRouter();
  const { user, hydrate, hydrated, setUser } = useAuth();
  const [storeUrl, setStoreUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !user) {
      router.push('/register');
    }
  }, [hydrated, user, router]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!storeUrl.trim()) {
      setError('Please enter your WooCommerce store URL');
      return;
    }

    setIsLoading(true);

    try {
      // Complete onboarding before connecting store
      const onboardingResult = await api.completeOnboarding();
      setUser(onboardingResult.user);

      const result = await api.createShop({ storeUrl: storeUrl.trim() });
      // Redirect to WooCommerce OAuth
      if (result.authUrl) {
        window.location.href = result.authUrl;
      } else {
        // If no authUrl, shop was created without OAuth (shouldn't happen normally)
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect store');
      setIsLoading(false);
    }
  }

  function openModal() {
    setError('');
    setIsModalOpen(true);
  }

  function closeModal() {
    if (!isLoading) {
      setIsModalOpen(false);
      setError('');
    }
  }

  if (!hydrated || !user) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F9FAFB] py-4 lg:py-6 px-2">
      <div className="max-w-[1400px] mx-auto">
        {/* Progress Bar */}
        <div className="mb-5 lg:mb-8">
          <ProgressBar />
        </div>

        {/* Main Content - 60/40 Split with equal height boxes */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 lg:items-stretch">
          {/* Left Column (60%) - Connection Box */}
          <div className="w-full lg:w-[58%] bg-white rounded-xl border border-gray-200 shadow-sm p-5 lg:p-6">
            {/* Headline */}
            <h1 className="text-2xl lg:text-[28px] xl:text-3xl font-display font-bold text-gray-900 mb-2">
              Your products are ready to appear in ChatGPT
            </h1>

            {/* Subheadline */}
            <p className="text-base text-gray-600 mb-5">
              Connect your WooCommerce store to showcase your first products in ChatGPT.
            </p>

            {/* WooCommerce Header */}
            <div className="flex items-center gap-3 mb-4">
              <WooCommerceLogo className="h-8" />
              <h2 className="text-base font-semibold text-gray-900">
                Securely connect your WooCommerce store
              </h2>
            </div>

            {/* Primary CTA */}
            <button
              onClick={openModal}
              className="w-full bg-[#FA7315] hover:bg-[#E5650F] text-white font-medium py-3 px-4 rounded-lg transition-colors mb-5"
            >
              Connect & preview my products
            </button>

            {/* Free Plan Callout */}
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FA7315]/20 flex items-center justify-center mt-0.5">
                  <svg className="w-3.5 h-3.5 text-[#FA7315]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Free plan:</p>
                  <ul className="text-sm text-gray-600 space-y-0.5">
                    <li>• Publish up to <strong>5</strong> products</li>
                    <li>• Full visibility in ChatGPT results</li>
                    <li>• Upgrade <strong>anytime</strong> to sync more products</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (40%) - Preview Box */}
          <div className="w-full lg:w-[42%] bg-white rounded-xl border border-gray-200 shadow-sm p-5 lg:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              How buyers discover your products via AI
            </h2>

            {/* Visual Mockup Container */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              {/* User Intent */}
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 mb-1">User intent</p>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-sm text-gray-700">
                      I&apos;m looking for a modern garden studio under €25k that can be delivered in France.
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Response */}
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#10a37f] flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-sm text-gray-700">
                      Sure! Here are some beautiful garden studios that match your needs:
                    </p>
                  </div>
                </div>
              </div>

              {/* Product Card Preview */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Placeholder for product preview GIF/image - replace src with actual asset later */}
                <div className="relative w-full aspect-[16/10] bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center">
                  {/* Simulated product image placeholder */}
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-2 rounded-lg bg-green-200/50 flex items-center justify-center">
                      <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-xs text-green-600">Product image</span>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">Modern Garden Studio</h3>
                  <p className="text-[#FA7315] font-bold text-lg mb-1">€19,995</p>
                  <div className="flex items-center gap-1 mb-2">
                    <div className="flex text-yellow-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">(12)</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Solid oak, fully insulated</p>
                  <p className="text-xs text-gray-500 mb-3">Free delivery in France</p>
                  <button className="w-full bg-[#FA7315] hover:bg-[#E5650F] text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors">
                    View on store
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Modal */}
      <ConnectionModal
        isOpen={isModalOpen}
        onClose={closeModal}
        storeUrl={storeUrl}
        setStoreUrl={setStoreUrl}
        error={error}
        isLoading={isLoading}
        onSubmit={handleConnect}
      />
    </main>
  );
}
