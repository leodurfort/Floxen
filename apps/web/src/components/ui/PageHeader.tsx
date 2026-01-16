'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
  /** Uppercase supertitle above the main title (e.g., "PRODUCTS") */
  label?: string;
  /** Main page title */
  title: string;
  /** Optional subtitle/description below the title */
  subtitle?: string;
  /** Action elements (buttons, badges) aligned to the right */
  actions?: ReactNode;
}

export function PageHeader({ label, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          {label && (
            <p className="uppercase tracking-[0.18em] text-xs text-gray-500 mb-1">
              {label}
            </p>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-gray-600 text-sm mt-1">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
