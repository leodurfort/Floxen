'use client';

import type { ProductStats } from '@productsynch/shared';

export type ProductTabId = 'all' | 'inFeed' | 'needsAttention' | 'disabled';

interface ProductTabsProps {
  activeTab: ProductTabId;
  onTabChange: (tab: ProductTabId) => void;
  stats?: ProductStats;
  isFeedActivated?: boolean;
}

export function ProductTabs({ activeTab, onTabChange, stats, isFeedActivated }: ProductTabsProps) {
  // Dynamic tabs - label changes based on feed activation state
  const tabs: { id: ProductTabId; label: string; countKey: keyof ProductStats | 'all' }[] = [
    { id: 'all', label: 'All Items', countKey: 'total' },
    { id: 'inFeed', label: isFeedActivated ? 'In Feed' : 'Ready for Feed', countKey: 'inFeed' },
    { id: 'needsAttention', label: 'Needs Attention', countKey: 'needsAttention' },
    { id: 'disabled', label: 'Disabled', countKey: 'disabled' },
  ];
  return (
    <div className="flex border-b border-gray-200 mb-4">
      {tabs.map((tab) => {
        const count = stats ? stats[tab.countKey as keyof ProductStats] : undefined;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? 'border-[#FA7315] text-[#FA7315]'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {tab.label}
            {count !== undefined && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                  isActive
                    ? 'bg-[#FA7315]/10 text-[#FA7315]'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
