'use client';

import Link from 'next/link';

export type PlanChangeType = 'upgrade' | 'downgrade' | 'canceled';

interface PlanChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  changeType: PlanChangeType;
  newTier: string;
  renewalDate?: string | null;
  shopId?: string;
}

const TIER_DISPLAY_NAMES: Record<string, string> = {
  FREE: 'Free',
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
};

const TIER_PRODUCT_LIMITS: Record<string, string> = {
  FREE: '15 products',
  STARTER: '500 products',
  PROFESSIONAL: 'unlimited products',
};

export function PlanChangeModal({
  isOpen,
  onClose,
  changeType,
  newTier,
  renewalDate,
  shopId,
}: PlanChangeModalProps) {
  if (!isOpen) return null;

  const tierName = TIER_DISPLAY_NAMES[newTier] || newTier;
  const productLimit = TIER_PRODUCT_LIMITS[newTier] || 'products';

  // Format renewal date if provided
  const formattedDate = renewalDate
    ? new Date(renewalDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const content = {
    upgrade: {
      icon: (
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ),
      title: 'Plan Upgraded!',
      message: `You've upgraded to ${tierName}. You now have access to ${productLimit}.`,
      showSelectProducts: true,
      buttonText: 'Close',
    },
    downgrade: {
      icon: (
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      ),
      title: 'Plan Changed',
      message: `Your plan has been changed to ${tierName}. You now have access to ${productLimit}. Please review your product selection.`,
      showSelectProducts: true,
      buttonText: 'Close',
    },
    canceled: {
      icon: (
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      ),
      title: 'Subscription Canceled',
      message: formattedDate
        ? `Your subscription will remain active until ${formattedDate}. After that, you'll be downgraded to the Free plan.`
        : `Your subscription has been canceled. You'll be downgraded to the Free plan at the end of your billing period.`,
      showSelectProducts: false,
      buttonText: 'Got it',
    },
  };

  const { icon, title, message, showSelectProducts, buttonText } = content[changeType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-xl overflow-hidden">
        {/* Header with close button */}
        <div className="p-6 pb-0">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors -mt-1 -mr-1"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 pb-8 text-center">
          <div className="flex justify-center">{icon}</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600 mb-6">{message}</p>

          {/* Actions */}
          <div className="space-y-3">
            {showSelectProducts && shopId && (
              <Link
                href={`/shops/${shopId}/select-products`}
                className="block w-full px-6 py-3 bg-[#FA7315] text-white font-medium rounded-lg hover:bg-[#E5650F] transition-colors text-center"
              >
                Update Product Selection →
              </Link>
            )}
            <button
              onClick={onClose}
              className={`w-full px-6 py-3 font-medium rounded-lg transition-colors ${
                showSelectProducts && shopId
                  ? 'text-gray-500 hover:text-gray-700'
                  : 'bg-[#FA7315] text-white hover:bg-[#E5650F]'
              }`}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
