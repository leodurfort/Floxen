'use client';

import { useState, useEffect } from 'react';

interface ConnectShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (storeUrl: string) => void;
  isConnecting?: boolean;
  error?: string | null;
}

// WooCommerce Logo Component
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

// Expandable FAQ Component
function PermissionsFAQ() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>Why does WooCommerce show other permissions?</span>
      </button>
      {isOpen && (
        <div className="mt-2 ml-5.5 text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-200">
          <p className="mb-2">
            WooCommerce doesn&apos;t offer product-only permissions. Their &quot;read&quot; scope includes access to all store data.
          </p>
          <p className="font-medium text-gray-700">
            Floxen only reads your products — we never access your orders, customers, or coupons.
          </p>
        </div>
      )}
    </div>
  );
}

export function ConnectShopModal({
  isOpen,
  onClose,
  onConnect,
  isConnecting = false,
  error,
}: ConnectShopModalProps) {
  const [storeUrl, setStoreUrl] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStoreUrl('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeUrl.trim()) return;
    onConnect(storeUrl.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-xl overflow-hidden">
        {/* Header with WooCommerce Logo */}
        <div className="p-8 pb-0 relative">
          <button
            onClick={onClose}
            disabled={isConnecting}
            className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex flex-col items-center gap-3">
            <WooCommerceLogo className="h-7" />
            <h2 className="text-xl font-semibold text-gray-900">Connect your store</h2>
          </div>
        </div>

        {/* Trust Badges Section */}
        <div className="px-8 py-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex flex-col gap-2">
              <TrustBadge
                icon={
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                }
                text="We only sync your products"
              />
              <TrustBadge
                icon={
                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                }
                text="Orders, customers & coupons are never accessed"
              />
              <TrustBadge
                icon={
                  <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                }
                text="Uses official WooCommerce OAuth"
              />
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              placeholder="https://your-store.com"
              disabled={isConnecting}
              autoFocus
              className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg border border-gray-300 focus:outline-none focus:border-[#FA7315] focus:ring-2 focus:ring-[#FA7315]/10 disabled:opacity-50 disabled:bg-gray-50"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isConnecting || !storeUrl.trim()}
            className="w-full px-6 py-3 bg-[#FA7315] text-white font-medium rounded-lg hover:bg-[#E5650F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Connecting...
              </>
            ) : (
              'Connect & preview my products'
            )}
          </button>
        </form>

        {/* OAuth Reassurance */}
        <div className="px-8 pb-4">
          <p className="text-center text-sm text-gray-500">
            You&apos;ll be redirected to WooCommerce to approve access.
            <br />
            No changes will be made to your store.
          </p>
        </div>

        {/* FAQ at bottom */}
        <div className="px-8 pb-6">
          <PermissionsFAQ />
        </div>
      </div>
    </div>
  );
}
