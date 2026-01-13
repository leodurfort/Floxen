'use client';

import { useState, useEffect } from 'react';

interface ConnectShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (storeUrl: string) => void;
  isConnecting?: boolean;
  error?: string | null;
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
        {/* Header */}
        <div className="p-8 pb-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Connect WooCommerce Store</h2>
              <p className="text-sm text-gray-600 mt-2">
                Enter your store URL to start the connection process.
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isConnecting}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 -mt-1 -mr-1"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
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

          {/* Footer */}
          <div className="pt-3 space-y-3">
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
                'Connect'
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isConnecting}
              className="w-full text-center text-gray-500 hover:text-gray-700 text-sm py-2 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
