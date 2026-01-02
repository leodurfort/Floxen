'use client';

import { useState, useEffect } from 'react';

interface Shop {
  id: string;
  sellerName?: string | null;
  returnPolicy?: string | null;
  returnWindow?: number | null;
}

interface CompleteShopSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: Shop;
  onSave: (data: { sellerName: string | null; returnPolicy: string | null; returnWindow: number | null }) => Promise<void>;
  isSaving?: boolean;
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

// Validate integer
function isValidInteger(value: string): boolean {
  if (!value.trim()) return true;
  const num = parseInt(value.trim(), 10);
  return !isNaN(num) && num > 0 && Number.isInteger(num);
}

export function CompleteShopSetupModal({
  isOpen,
  onClose,
  shop,
  onSave,
  isSaving = false,
}: CompleteShopSetupModalProps) {
  const [sellerName, setSellerName] = useState('');
  const [returnPolicy, setReturnPolicy] = useState('');
  const [returnWindow, setReturnWindow] = useState('');
  const [errors, setErrors] = useState<{ returnPolicy?: string; returnWindow?: string }>({});

  // Reset form when modal opens or shop changes
  useEffect(() => {
    if (isOpen) {
      setSellerName(shop.sellerName || '');
      setReturnPolicy(shop.returnPolicy || '');
      setReturnWindow(shop.returnWindow?.toString() || '');
      setErrors({});
    }
  }, [isOpen, shop]);

  const validateForm = (): boolean => {
    const newErrors: { returnPolicy?: string; returnWindow?: string } = {};

    if (returnPolicy.trim() && !isValidUrl(returnPolicy)) {
      newErrors.returnPolicy = 'Please enter a valid URL';
    }

    if (returnWindow.trim() && !isValidInteger(returnWindow)) {
      newErrors.returnWindow = 'Please enter a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const data = {
      sellerName: sellerName.trim() || null,
      returnPolicy: returnPolicy.trim() || null,
      returnWindow: returnWindow.trim() ? parseInt(returnWindow.trim(), 10) : null,
    };

    await onSave(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-8 pb-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Complete your store profile</h2>
              <p className="text-sm text-gray-600 mt-2">
                This information is mandatory in order to share your product feed with ChatGPT.
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isSaving}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 -mt-1 -mr-1"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 space-y-5">
          {/* Seller Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Store/Brand name
            </label>
            <input
              type="text"
              value={sellerName}
              onChange={(e) => setSellerName(e.target.value)}
              placeholder="Ferrari"
              disabled={isSaving}
              className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg border border-gray-300 focus:outline-none focus:border-[#FA7315] focus:ring-2 focus:ring-[#FA7315]/10 disabled:opacity-50 disabled:bg-gray-50"
            />
          </div>

          {/* Return Policy URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Return policy URL
            </label>
            <input
              type="url"
              value={returnPolicy}
              onChange={(e) => {
                setReturnPolicy(e.target.value);
                if (errors.returnPolicy) {
                  setErrors((prev) => ({ ...prev, returnPolicy: undefined }));
                }
              }}
              placeholder="https://store.ferrari.com/en-us/right-of-withdrawal"
              disabled={isSaving}
              className={`w-full px-4 py-3 bg-white text-gray-900 rounded-lg border focus:outline-none focus:ring-2 disabled:opacity-50 disabled:bg-gray-50 ${
                errors.returnPolicy
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                  : 'border-gray-300 focus:border-[#FA7315] focus:ring-[#FA7315]/10'
              }`}
            />
            {errors.returnPolicy && (
              <p className="mt-1 text-sm text-red-600">{errors.returnPolicy}</p>
            )}
          </div>

          {/* Return Window */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product return window (days)
            </label>
            <input
              type="number"
              value={returnWindow}
              onChange={(e) => {
                setReturnWindow(e.target.value);
                if (errors.returnWindow) {
                  setErrors((prev) => ({ ...prev, returnWindow: undefined }));
                }
              }}
              placeholder="30"
              min="1"
              disabled={isSaving}
              className={`w-full px-4 py-3 bg-white text-gray-900 rounded-lg border focus:outline-none focus:ring-2 disabled:opacity-50 disabled:bg-gray-50 ${
                errors.returnWindow
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                  : 'border-gray-300 focus:border-[#FA7315] focus:ring-[#FA7315]/10'
              }`}
            />
            {errors.returnWindow && (
              <p className="mt-1 text-sm text-red-600">{errors.returnWindow}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 pt-0 space-y-3">
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="w-full px-6 py-3 bg-[#FA7315] text-white font-medium rounded-lg hover:bg-[#E5650F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              'Save & Continue'
            )}
          </button>

          <button
            onClick={onClose}
            disabled={isSaving}
            className="w-full text-center text-gray-500 hover:text-gray-700 text-sm py-2 transition-colors disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
