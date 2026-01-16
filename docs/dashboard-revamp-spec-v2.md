# Dashboard Revamp Implementation Spec (v2 - Revised)

## Overview

Complete revamp of the dashboard with two modes, first sync banner, and terminology changes.

**Key changes from v1:**
- Fixed First Sync Banner logic (was showing on every sync)
- Extracted shared utilities to avoid duplication
- Removed unnecessary `useFieldMappingStatus` hook
- Fixed missing props in StatsGrid
- Clarified banner placement in AppLayout

---

## Table of Contents

1. [Shared Utilities (Extract First)](#1-shared-utilities)
2. [Dashboard Modes](#2-dashboard-modes)
3. [Store Banner Component](#3-store-banner-component)
4. [Stats Grid Component](#4-stats-grid-component)
5. [Getting Started Checklist](#5-getting-started-checklist)
6. [First Sync Success Banner](#6-first-sync-success-banner)
7. [Sidebar Terminology Change](#7-sidebar-terminology-change)
8. [Files Summary](#8-files-summary)
9. [Implementation Order](#9-implementation-order)

---

## 1. Shared Utilities

### File: `apps/web/src/lib/dateUtils.ts`

Extract from existing `FeedHealthCard.tsx`:

```tsx
export function formatRelativeTime(date: string | Date | null): string {
  if (!date) return 'Never';
  const now = new Date();
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}
```

### File: `apps/web/src/lib/feedUtils.ts`

Extract from existing `FeedHealthCard.tsx`:

```tsx
import { deriveFeedState, type FeedState } from '@productsynch/shared';

export { deriveFeedState };

export interface FeedStateConfig {
  label: string;
  colorClass: string;
  dotClass: string;
}

export const FEED_STATE_CONFIG: Record<FeedState, FeedStateConfig> = {
  not_activated: { label: 'Not Activated', colorClass: 'text-gray-600', dotClass: 'bg-gray-400' },
  active: { label: 'Active', colorClass: 'text-green-600', dotClass: 'bg-green-500' },
  paused: { label: 'Paused', colorClass: 'text-amber-600', dotClass: 'bg-amber-500' },
  error: { label: 'Error', colorClass: 'text-red-600', dotClass: 'bg-red-500' },
};

export function getFeedStateConfig(shop: {
  openaiEnabled: boolean;
  syncEnabled: boolean;
  feedStatus: string;
}): FeedStateConfig {
  const state = deriveFeedState(shop);
  return FEED_STATE_CONFIG[state];
}
```

### File: `apps/web/src/lib/fieldMappingUtils.ts`

Utility function (NOT a hook):

```tsx
import { REQUIRED_FIELDS } from '@productsynch/shared';
import type { FieldMappings } from '@productsynch/shared';

export interface FieldMappingProgress {
  requiredFieldsMapped: number;
  totalRequiredFields: number;
  isComplete: boolean;
}

export function calculateFieldMappingProgress(mappings: FieldMappings): FieldMappingProgress {
  const requiredFieldsMapped = REQUIRED_FIELDS.filter(
    (spec) => mappings[spec.attribute] != null && mappings[spec.attribute] !== ''
  ).length;
  const totalRequiredFields = REQUIRED_FIELDS.length;

  return {
    requiredFieldsMapped,
    totalRequiredFields,
    isComplete: requiredFieldsMapped === totalRequiredFields,
  };
}
```

---

## 2. Dashboard Modes

### Mode A: Getting Started Visible (not all 5 steps complete)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Dashboard                                                           │
├─────────────────────────────────────────────────────────────────────┤
│ [First Sync Banner - if applicable]                                 │
│                                                                     │
│ ┌─ Store Banner ──────────────────────────────────────────────────┐ │
│ │  ferrari.example.com                             ● Active       │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─ Stats Grid ────────────────────────────────────────────────────┐ │
│ │ Total Items │ In Feed │ Needs Attention │ Last Sync             │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─ Getting Started (4/5 complete) ─────────────── [Collapse ▲] ───┐ │
│ │  [Accordion steps...]                                           │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Mode B: Dashboard Only (all 5 steps complete)

Checklist disappears permanently. Only Store Banner + Stats Grid remain.

---

## 3. Store Banner Component

### File: `apps/web/src/components/dashboard/StoreBanner.tsx`

```tsx
import { getFeedStateConfig } from '@/lib/feedUtils';

interface StoreBannerProps {
  shop: {
    wooStoreUrl?: string;
    sellerName?: string | null;
    openaiEnabled: boolean;
    syncEnabled: boolean;
    feedStatus: string;
  };
}

export function StoreBanner({ shop }: StoreBannerProps) {
  const config = getFeedStateConfig(shop);

  const displayName = shop.sellerName
    || shop.wooStoreUrl?.replace(/^https?:\/\//, '')
    || 'Unnamed store';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
      <span className="text-lg font-semibold text-gray-900">{displayName}</span>
      <span className={`flex items-center gap-1.5 text-sm font-medium ${config.colorClass}`}>
        <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
        {config.label}
      </span>
    </div>
  );
}
```

---

## 4. Stats Grid Component

### File: `apps/web/src/components/dashboard/StatsGrid.tsx`

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { formatRelativeTime } from '@/lib/dateUtils';

interface StatsGridProps {
  shopId: string;
  stats: {
    total: number;
    inFeed: number;
    needsAttention: number;
  };
  lastFeedGeneratedAt: string | null;
  syncEnabled: boolean;
  feedStatus: string;
  openaiEnabled: boolean; // FIXED: Was missing in v1
}

interface SyncStatusDisplay {
  label: string;
  dotClass: string;
  textClass: string;
}

function getSyncStatusDisplay(
  syncEnabled: boolean,
  feedStatus: string,
  openaiEnabled: boolean
): SyncStatusDisplay {
  if (feedStatus === 'SYNCING') {
    return { label: 'Syncing...', dotClass: 'bg-blue-500 animate-pulse', textClass: 'text-blue-600' };
  }
  if (feedStatus === 'FAILED') {
    return { label: 'Sync error', dotClass: 'bg-red-500', textClass: 'text-red-600' };
  }
  if (!openaiEnabled) {
    return { label: 'Not activated', dotClass: 'bg-gray-400', textClass: 'text-gray-500' };
  }
  if (syncEnabled) {
    return { label: 'Auto-sync on', dotClass: 'bg-green-500', textClass: 'text-green-600' };
  }
  return { label: 'Auto-sync paused', dotClass: 'bg-amber-500', textClass: 'text-amber-600' };
}

export function StatsGrid({
  shopId,
  stats,
  lastFeedGeneratedAt,
  syncEnabled,
  feedStatus,
  openaiEnabled
}: StatsGridProps) {
  const router = useRouter();
  const syncStatus = getSyncStatusDisplay(syncEnabled, feedStatus, openaiEnabled);

  const clickableCards = [
    {
      label: 'Total Items',
      value: stats.total.toLocaleString(),
      onClick: () => router.push(`/shops/${shopId}/products`),
    },
    {
      label: 'In Feed',
      value: stats.inFeed.toLocaleString(),
      onClick: () => router.push(`/shops/${shopId}/products?cf_isValid_v=true&cf_enable_search_v=true`),
    },
    {
      label: 'Needs Attention',
      value: stats.needsAttention.toLocaleString(),
      valueClass: stats.needsAttention > 0 ? 'text-amber-600' : undefined,
      onClick: () => router.push(`/shops/${shopId}/products?cf_isValid_v=false`),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {clickableCards.map((card) => (
        <button
          key={card.label}
          onClick={card.onClick}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-left hover:border-[#FA7315] hover:shadow-md transition-all"
        >
          <div className="text-sm text-gray-500 mb-1">{card.label}</div>
          <div className={`text-3xl font-bold ${card.valueClass || 'text-gray-900'}`}>
            {card.value}
          </div>
        </button>
      ))}

      {/* Last Sync - not clickable */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="text-sm text-gray-500 mb-1">Last Sync</div>
        <div className="text-3xl font-bold text-gray-900">
          {formatRelativeTime(lastFeedGeneratedAt)}
        </div>
        <div className={`flex items-center gap-1.5 mt-2 text-xs ${syncStatus.textClass}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${syncStatus.dotClass}`} />
          {syncStatus.label}
        </div>
      </div>
    </div>
  );
}
```

---

## 5. Getting Started Checklist

### File: `apps/web/src/components/dashboard/GettingStartedChecklist.tsx`

### Props

```tsx
interface GettingStartedChecklistProps {
  shopId: string;
  steps: {
    connectStore: boolean;
    fieldMappings: boolean;
    reviewCatalog: boolean;       // needsAttention === 0
    activateFeed: boolean;        // openaiEnabled
    unlockMoreItems: boolean;     // subscriptionTier !== 'FREE'
  };
  stepDetails: {
    storeUrl: string;
    totalItems: number;
    requiredFieldsMapped: number;
    totalRequiredFields: number;
    needsAttention: number;
    inFeed: number;
    subscriptionTier: string;
  };
}
```

### Step Definitions

| Step | Complete When | Incomplete CTA |
|------|---------------|----------------|
| 1. Connect your WooCommerce store | `isConnected === true` | [Connect Store] button |
| 2. Configure field mappings | All required fields mapped | [Complete Setup →] to `/shops/{id}/setup` |
| 3. Review your catalog (Optional) | `needsAttention === 0` | [View Catalog →] |
| 4. Activate your feed | `openaiEnabled === true` | [Go to Catalog →] |
| 5. Unlock more items | `subscriptionTier !== 'FREE'` | [View Plans] |

### Behavior

- Accordion-style: each step expands/collapses individually
- Overall section can collapse (stored in localStorage: `productsynch:gettingStarted:collapsed:${shopId}`)
- Progress bar shows completion percentage
- **Disappears permanently when all 5 steps complete**

### Implementation Notes

- Use existing `useFieldMappingsQuery(shopId)` + `calculateFieldMappingProgress()` utility
- Get `subscriptionTier` from `useAuth().user.subscriptionTier`
- Each step tracks its own expanded/collapsed state internally

---

## 6. First Sync Success Banner

### File: `apps/web/src/components/banners/FirstSyncSuccessBanner.tsx`

**FIXED LOGIC**: Check localStorage BEFORE showing, track `hasShownBefore` not just `isDismissed`.

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';

interface FirstSyncSuccessBannerProps {
  shopId: string;
  totalItems: number;
  lastSyncAt: string | null;
  syncStatus: string;
}

const STORAGE_KEY_PREFIX = 'productsynch:firstSyncBanner:shown:';

export function FirstSyncSuccessBanner({
  shopId,
  totalItems,
  lastSyncAt,
  syncStatus
}: FirstSyncSuccessBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const prevSyncStatusRef = useRef<string | null>(null);
  const prevLastSyncAtRef = useRef<string | null>(null);

  useEffect(() => {
    // Check if we've already shown this banner for this shop
    const hasShownBefore = localStorage.getItem(`${STORAGE_KEY_PREFIX}${shopId}`) === 'true';
    if (hasShownBefore) {
      return; // Never show again
    }

    // Detect first sync completion:
    // - Previous status was SYNCING or PENDING
    // - Current status is COMPLETED
    // - lastSyncAt just changed from null to a value (or from old value to new)
    const wassyncing = prevSyncStatusRef.current === 'SYNCING' || prevSyncStatusRef.current === 'PENDING';
    const justCompleted = syncStatus === 'COMPLETED' && wassyncing;
    const syncAtChanged = lastSyncAt !== prevLastSyncAtRef.current && lastSyncAt !== null;

    if (justCompleted && syncAtChanged) {
      setIsVisible(true);
      // Mark as shown so it never appears again
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${shopId}`, 'true');
    }

    // Update refs for next comparison
    prevSyncStatusRef.current = syncStatus;
    prevLastSyncAtRef.current = lastSyncAt;
  }, [shopId, lastSyncAt, syncStatus]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="mb-4 p-4 bg-green-50 border border-green-300 rounded-lg flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="text-green-600 text-lg flex-shrink-0">✓</span>
        <div>
          <div className="text-green-800 font-medium">First sync complete!</div>
          <div className="text-green-700 text-sm mt-0.5">
            {totalItems.toLocaleString()} items imported.
            Each product variation counts as a separate item for ChatGPT.
          </div>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="text-green-600 hover:text-green-800 text-lg font-light flex-shrink-0"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
```

### Placement

Add to `apps/web/src/components/AppLayout.tsx` so it shows on all authenticated pages.

```tsx
// In AppLayout, after the header/before main content:
{currentShop && (
  <FirstSyncSuccessBanner
    shopId={currentShop.id}
    totalItems={productStats?.total ?? 0}
    lastSyncAt={currentShop.lastSyncAt}
    syncStatus={currentShop.syncStatus}
  />
)}
```

---

## 7. Sidebar Terminology Change

### File: `apps/web/src/components/Sidebar.tsx`

Change label from "Products" to "Catalog". URL remains `/products`.

**TWO changes required:**

1. **Nav item label** (line 43):
```tsx
// Change:
{ href: `/shops/${currentShop.id}/products`, label: 'Products', icon: '📦' },
// To:
{ href: `/shops/${currentShop.id}/products`, label: 'Catalog', icon: '📦' },
```

2. **Active state check** (lines 104-105) - **CRITICAL: Must also update this!**
```tsx
// Change:
} else if (item.label === 'Products') {
  isActive = pathname.includes('/products');
// To:
} else if (item.label === 'Catalog') {
  isActive = pathname.includes('/products');
```

If you only change the label without updating the active state check, the "Catalog" nav item will never highlight as active.

---

## 7b. Fix Existing Duplication in products/page.tsx

### File: `apps/web/src/app/shops/[id]/products/page.tsx`

This file already has a duplicate `FEED_STATE_CONFIG` (lines 36-60). Update to use shared utility:

**Remove** (lines 35-60):
```tsx
// Feed state display configuration
const FEED_STATE_CONFIG: Record<
  FeedState,
  { label: string; colorClass: string; dotClass: string }
> = {
  not_activated: { ... },
  active: { ... },
  paused: { ... },
  error: { ... },
};
```

**Add import**:
```tsx
import { FEED_STATE_CONFIG } from '@/lib/feedUtils';
```

This eliminates existing code duplication and ensures consistent feed state display across the app.

---

## 8. Files Summary

### New Files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/dateUtils.ts` | `formatRelativeTime` utility |
| `apps/web/src/lib/feedUtils.ts` | `FEED_STATE_CONFIG`, `getFeedStateConfig` |
| `apps/web/src/lib/fieldMappingUtils.ts` | `calculateFieldMappingProgress` utility |
| `apps/web/src/components/dashboard/StoreBanner.tsx` | Store name + status badge |
| `apps/web/src/components/dashboard/StatsGrid.tsx` | 4 stat cards (3 clickable) |
| `apps/web/src/components/dashboard/GettingStartedChecklist.tsx` | 5-step onboarding |
| `apps/web/src/components/banners/FirstSyncSuccessBanner.tsx` | Post-first-sync banner |

### Modified Files

| File | Changes |
|------|---------|
| `apps/web/src/app/dashboard/page.tsx` | Complete revamp with new components |
| `apps/web/src/components/Sidebar.tsx` | "Products" → "Catalog" + fix active state check |
| `apps/web/src/components/AppLayout.tsx` | Add FirstSyncSuccessBanner |
| `apps/web/src/app/shops/[id]/products/page.tsx` | Use shared `feedUtils.ts` (fixes existing duplication) |

### Files to DELETE

| File | Reason |
|------|--------|
| `apps/web/src/components/dashboard/FeedHealthCard.tsx` | Replaced by StoreBanner + StatsGrid. Only used in dashboard/page.tsx |

---

## 9. Implementation Order

1. **Shared utilities** - `dateUtils.ts`, `feedUtils.ts`, `fieldMappingUtils.ts`
2. **Update products/page.tsx** - Use shared `feedUtils.ts` (fixes existing duplication)
3. **Sidebar change** - Label + active state check (both changes!)
4. **StoreBanner** - Simple, self-contained
5. **StatsGrid** - Uses shared utilities
6. **GettingStartedChecklist** - Most complex component
7. **FirstSyncSuccessBanner** - Independent
8. **AppLayout update** - Add banner
9. **Dashboard page revamp** - Combine everything
10. **Delete FeedHealthCard** - After dashboard works

---

## Removed from Original Plan

- `useFieldMappingStatus.ts` hook - Use existing `useFieldMappingsQuery` + utility instead
- Quick Actions section - Confirmed removal
- WooCommerce product count in banner - Too complex, skipped

---

## Potential Breaking Changes (Watch Out!)

| Risk | Mitigation |
|------|------------|
| Sidebar "Catalog" nav item not highlighting | Must update BOTH the label AND the active state check (line 104) |
| FeedHealthCard import errors | Delete FeedHealthCard ONLY after dashboard/page.tsx is updated |
| products/page.tsx FEED_STATE_CONFIG removal | Must add import from `@/lib/feedUtils` before removing local definition |
| First Sync Banner showing repeatedly | Verify localStorage key is being checked BEFORE showing, not just for dismissal |

---

## Key Fixes from v1

1. **First Sync Banner**: Now properly tracks first-time completion using localStorage check BEFORE showing
2. **Shared utilities**: No more duplicate code across components
3. **StatsGrid props**: Added missing `openaiEnabled` prop
4. **Simpler architecture**: One less custom hook to maintain
