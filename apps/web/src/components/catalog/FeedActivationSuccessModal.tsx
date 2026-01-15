'use client';

interface FeedActivationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToDashboard: () => void;
  productCount: number;
}

export function FeedActivationSuccessModal({
  isOpen,
  onClose,
  onGoToDashboard,
  productCount,
}: FeedActivationSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-light"
          aria-label="Close"
        >
          &times;
        </button>

        {/* Logo connection visual */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {/* WooCommerce Logo */}
          <img
            src="/logos/woocommerce.png"
            alt="WooCommerce"
            className="h-12 w-auto"
          />

          {/* Arrow */}
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>

          {/* ChatGPT Logo */}
          <img
            src="/logos/chatgpt.png"
            alt="ChatGPT"
            className="h-12 w-auto"
          />
        </div>

        {/* Headline */}
        <h2 className="text-xl font-semibold text-gray-900 text-center mb-3">
          Your products are ready for ChatGPT discovery
        </h2>

        {/* Body text */}
        <p className="text-gray-600 text-center mb-8">
          {productCount.toLocaleString()} products published on ChatGPT.
          <br />
          Your product catalog will synchronize automatically.
        </p>

        {/* Primary button */}
        <div className="flex justify-center">
          <button
            onClick={onGoToDashboard}
            className="px-6 py-2.5 bg-[#FA7315] text-white font-medium rounded-lg hover:bg-[#E5650F] transition-colors text-sm"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
