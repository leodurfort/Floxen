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
        <span className="text-gray-400">Products live in AI</span>
      </div>
    </div>
  );
}

// WooCommerce Logo Component (Purple)
function WooCommerceLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 256 153" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M23.759 0H232.24C245.375 0 256 10.625 256 23.759V129.24C256 142.375 245.375 153 232.24 153H23.759C10.625 153 0 142.375 0 129.24V23.759C0 10.625 10.625 0 23.759 0Z" fill="#7F54B3"/>
      <path d="M14.578 21.75C16.156 19.594 18.469 18.5 21.516 18.5C27.453 18.5 30.625 22.406 31.031 30.219C32.266 54.25 33.688 74.125 35.297 89.844L56.906 50.469C58.531 47.484 60.594 45.906 63.094 45.766C66.844 45.531 69.109 47.906 69.891 52.875C71.797 65.656 74.188 76.625 77.063 85.781C79.75 60.906 83.906 42.406 89.531 30.281C91.063 27.063 93.391 25.438 96.516 25.391C99.047 25.359 101.234 26.281 103.078 28.156C104.922 30.031 105.875 32.266 105.938 34.859C105.969 36.75 105.563 38.438 104.719 39.922C100.844 46.797 97.641 57.375 95.109 71.656C92.641 85.563 91.547 96.422 91.828 104.234C91.953 107.766 91.406 110.719 90.188 113.094C88.781 115.813 86.75 117.203 84.094 117.266C81.063 117.328 78.156 115.641 75.375 112.203C64.266 98.609 55.531 80.406 49.172 57.594L39.125 77.781C35.188 85.656 31.875 91.109 29.188 94.141C25.25 98.734 21.188 101.063 17 101.125C14 101.172 11.484 99.703 9.453 96.719C7.016 93.078 5.625 88.297 5.281 82.375C4.781 73.875 5.047 63.609 6.078 51.578C7.109 39.547 8.797 29.703 11.141 22.047C11.859 19.656 13.016 17.906 14.578 16.797V21.75Z" fill="white"/>
      <path d="M140.578 21.75C142.156 19.594 144.469 18.5 147.516 18.5C153.453 18.5 156.625 22.406 157.031 30.219C158.266 54.25 159.688 74.125 161.297 89.844L182.906 50.469C184.531 47.484 186.594 45.906 189.094 45.766C192.844 45.531 195.109 47.906 195.891 52.875C197.797 65.656 200.188 76.625 203.063 85.781C205.75 60.906 209.906 42.406 215.531 30.281C217.063 27.063 219.391 25.438 222.516 25.391C225.047 25.359 227.234 26.281 229.078 28.156C230.922 30.031 231.875 32.266 231.938 34.859C231.969 36.75 231.563 38.438 230.719 39.922C226.844 46.797 223.641 57.375 221.109 71.656C218.641 85.563 217.547 96.422 217.828 104.234C217.953 107.766 217.406 110.719 216.188 113.094C214.781 115.813 212.75 117.203 210.094 117.266C207.063 117.328 204.156 115.641 201.375 112.203C190.266 98.609 181.531 80.406 175.172 57.594L165.125 77.781C161.188 85.656 157.875 91.109 155.188 94.141C151.25 98.734 147.188 101.063 143 101.125C140 101.172 137.484 99.703 135.453 96.719C133.016 93.078 131.625 88.297 131.281 82.375C130.781 73.875 131.047 63.609 132.078 51.578C133.109 39.547 134.797 29.703 137.141 22.047C137.859 19.656 139.016 17.906 140.578 16.797V21.75Z" fill="white"/>
      <path d="M112.078 45.797C114.875 41.016 118.656 38.328 123.422 37.734C130.75 36.828 135.906 40.797 138.891 49.641C140.078 52.984 140.828 56.859 141.141 61.266C141.922 72.75 139.844 82.422 134.906 90.281C130.625 97.031 125.297 100.719 118.922 101.344C114.734 101.75 111.156 100.578 108.188 97.828C104.063 93.984 101.688 88.016 101.063 79.922C100.531 73.047 100.938 66.047 102.281 58.922C104.063 49.438 107.297 42.547 112.078 38.25V45.797ZM119.859 81.422C122.063 76.953 123.25 71.266 123.422 64.359C123.484 61.141 123.156 58.188 122.438 55.5C121.281 51.109 119.344 48.797 116.625 48.563C113.781 48.313 111.469 50.188 109.688 54.188C108.25 57.422 107.359 61.172 107.016 65.438C106.516 71.641 107.031 77.172 108.563 82.031C110.313 87.656 112.797 90.391 116.016 90.234C117.797 90.141 119.266 88.531 120.422 85.375C121.172 83.313 121.578 81.625 121.641 80.313L119.859 81.422Z" fill="white"/>
    </svg>
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
          <WooCommerceLogo className="w-10 h-10" />
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
            text="Takes ~30 seconds"
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
    <main className="min-h-screen bg-[#F9FAFB] py-6 lg:py-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8 lg:mb-12">
          <ProgressBar />
        </div>

        {/* Main Content - 60/40 Split */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Left Column (60%) */}
          <div className="w-full lg:w-[60%]">
            {/* Headline */}
            <h1 className="text-2xl lg:text-3xl xl:text-4xl font-display font-bold text-gray-900 mb-3">
              Your products are ready to appear in ChatGPT
            </h1>

            {/* Subheadline */}
            <p className="text-base lg:text-lg text-gray-600 mb-6 lg:mb-8">
              Connect your WooCommerce store to showcase your first products in ChatGPT.
            </p>

            {/* Connection Card - Step 1 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 lg:p-6 shadow-sm">
              {/* WooCommerce Header */}
              <div className="flex items-center gap-4 mb-5">
                <WooCommerceLogo className="w-12 h-12" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Securely connect your WooCommerce store
                  </h2>
                </div>
              </div>

              {/* Primary CTA */}
              <button
                onClick={openModal}
                className="w-full bg-[#FA7315] hover:bg-[#E5650F] text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Connect & preview my products
              </button>

              {/* Free Plan Callout */}
              <div className="mt-5 p-4 bg-orange-50 rounded-lg border border-orange-100">
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
                      <li>• Full visibility in AI shopping results</li>
                      <li>• Upgrade <strong>anytime</strong> to sync more products</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (40%) */}
          <div className="w-full lg:w-[40%]">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              How buyers discover your products via AI
            </h2>

            {/* Visual Mockup Container */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 lg:p-5">
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
