'use client';

type FeedStatusVariant = 'success' | 'warning' | 'error' | 'neutral';

interface FeedStatusBadgeProps {
  label: string;
  variant: FeedStatusVariant;
  showDot?: boolean;
}

const variantStyles: Record<FeedStatusVariant, { text: string; dot: string }> = {
  success: {
    text: 'text-green-600',
    dot: 'bg-green-500',
  },
  warning: {
    text: 'text-amber-600',
    dot: 'bg-amber-500',
  },
  error: {
    text: 'text-red-600',
    dot: 'bg-red-500',
  },
  neutral: {
    text: 'text-gray-600',
    dot: 'bg-gray-400',
  },
};

export function FeedStatusBadge({ label, variant, showDot = true }: FeedStatusBadgeProps) {
  const styles = variantStyles[variant];

  return (
    <span className={`flex items-center gap-1.5 text-sm font-medium ${styles.text}`}>
      {showDot && <span className={`w-2 h-2 rounded-full ${styles.dot}`} />}
      {label}
    </span>
  );
}
