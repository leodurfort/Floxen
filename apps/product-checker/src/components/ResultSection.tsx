'use client';

import { useState } from 'react';
import clsx from 'clsx';

interface ResultItem {
  field: string;
  message?: string;
  category?: string;
  value?: any;
}

interface ResultSectionProps {
  title: string;
  items: ResultItem[];
  variant: 'error' | 'warning' | 'success';
  defaultOpen?: boolean;
}

const VARIANT_CONFIG = {
  error: {
    headerBg: 'bg-red-50',
    headerBorder: 'border-red-100',
    headerText: 'text-red-900',
    badgeCls: 'badge badge--error',
    iconColor: 'text-red-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  warning: {
    headerBg: 'bg-amber-50',
    headerBorder: 'border-amber-100',
    headerText: 'text-amber-900',
    badgeCls: 'badge badge--warning',
    iconColor: 'text-amber-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
  },
  success: {
    headerBg: 'bg-green-50',
    headerBorder: 'border-green-100',
    headerText: 'text-green-900',
    badgeCls: 'badge badge--success',
    iconColor: 'text-green-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
} as const;

export function ResultSection({
  title,
  items,
  variant,
  defaultOpen = false,
}: ResultSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const config = VARIANT_CONFIG[variant];

  if (items.length === 0) return null;

  return (
    <div
      className={clsx(
        'rounded-xl border overflow-hidden',
        config.headerBorder
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={clsx(
          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
          config.headerBg,
          'hover:opacity-90',
          'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-landing-primary'
        )}
      >
        <span className={config.iconColor}>{config.icon}</span>
        <span className={clsx('flex-1 font-semibold text-sm', config.headerText)}>
          {title}
        </span>
        <span className={config.badgeCls}>{items.length}</span>
        <svg
          className={clsx(
            'w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Content */}
      <div
        className="accordion-content"
        data-state={isOpen ? 'open' : 'closed'}
      >
        <div className="bg-white divide-y divide-gray-50">
          {items.map((item, index) => (
            <div key={`${item.field}-${index}`} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-sm text-gray-900">
                    {item.field}
                  </span>
                  {item.message && (
                    <p className="text-sm text-gray-600 mt-0.5">
                      {item.message}
                    </p>
                  )}
                </div>
                {item.category && (
                  <span className="badge badge--neutral flex-shrink-0">
                    {item.category}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
