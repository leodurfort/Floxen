# Database Maintenance Scripts

## fix-feed-enable-search.ts

### Purpose
Fixes the `feedEnableSearch` field for products that were discovered and then synced with the incorrect value.

### Problem
When products are discovered, they were being created with `feedEnableSearch: false`. This value was preserved throughout the product lifecycle:
1. Product discovered → `feedEnableSearch: false`
2. Product selected → `feedEnableSearch` remains `false` (not updated)
3. Product synced → `feedEnableSearch` remains `false` (intentionally preserved)

This caused synced products to show "Enable Search: Disabled" and "Feed Status: Excluded" even though they should be enabled.

### Solution
This script updates all synced, selected products that have `feedEnableSearch: false` to use their shop's `defaultEnableSearch` setting (which defaults to `true`).

### Usage
```bash
cd /workspaces/ProductSynch/apps/api
npx tsx scripts/fix-feed-enable-search.ts
```

### What it does
1. Fetches all shops and their `defaultEnableSearch` setting
2. For each shop, updates all products where:
   - `isSelected: true`
   - `syncState: 'synced'`
   - `feedEnableSearch: false`
3. Sets their `feedEnableSearch` to the shop's `defaultEnableSearch` value

### Related Files
- `/workspaces/ProductSynch/apps/api/src/services/productDiscoveryService.ts` (line 96) - Fixed to use shop's `defaultEnableSearch` instead of hardcoded `false`
- `/workspaces/ProductSynch/apps/api/prisma/migrations/20260118_fix_feed_enable_search/migration.sql` - SQL migration version of this fix
