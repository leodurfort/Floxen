# Clean Architecture Fix: Subscription Billing System

## Problem Summary

Two critical issues in the current billing architecture:

1. **Multiple Active Subscriptions**: Users can create unlimited subscriptions because there's no validation before checkout
2. **Account Deletion with Active Subscription**: Users can delete their account while still having an active paid subscription, leaving orphaned subscriptions in Stripe

---

## Architecture Analysis

### Current Flow (Broken)

```
User clicks "Upgrade" → createCheckoutSession() → Stripe Checkout → Webhook
                              ↓
                    NO VALIDATION for existing subscription
                              ↓
                    Creates NEW subscription (doesn't cancel old one)
                              ↓
                    Webhook overwrites subscriptionId in DB
                              ↓
                    Old subscription becomes "orphaned" in Stripe
```

### Root Causes

| Component | Issue |
|-----------|-------|
| `createCheckoutSession()` | No check for existing subscription |
| `handleCheckoutCompleted()` | Overwrites subscriptionId without canceling old |
| `deleteAccount()` | No check for active subscription before deletion |
| `scheduleAccountDeletion()` | No check for active subscription |

---

## Solution Design

### Principle: Single Source of Truth

- User can have **exactly ONE subscription** at a time
- Before creating new subscription → cancel or update existing one
- Before deleting account → require subscription cancellation first

---

## Implementation Plan

### Phase 1: Add Subscription Cancellation Function

**File:** `apps/api/src/services/billingService.ts`

Add new function to cancel subscription via Stripe API:

```typescript
/**
 * Cancel a user's active subscription immediately via Stripe API
 * Used before creating new subscription or before account deletion
 */
export async function cancelSubscription(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionId: true, stripeCustomerId: true },
  });

  if (!user?.subscriptionId) {
    return; // No subscription to cancel
  }

  // Cancel immediately in Stripe
  await getStripe().subscriptions.cancel(user.subscriptionId);

  // Update local state
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionId: null,
      subscriptionStatus: 'canceled',
      subscriptionTier: 'FREE',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
  });

  // Reset shop limits
  const freeLimit = getTierLimit('FREE');
  await prisma.shop.updateMany({
    where: { userId },
    data: { productLimit: freeLimit, needsProductReselection: true },
  });
}
```

---

### Phase 2: Add Pre-Checkout Validation

**File:** `apps/api/src/services/billingService.ts`

Add helper to check subscription state:

```typescript
/**
 * Check if user has an active (non-canceled) subscription
 */
export async function hasActiveSubscription(userId: string): Promise<{
  hasSubscription: boolean;
  subscriptionId: string | null;
  tier: string;
  status: string | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionId: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      cancelAtPeriodEnd: true,
    },
  });

  if (!user) {
    return { hasSubscription: false, subscriptionId: null, tier: 'FREE', status: null };
  }

  // Has active subscription if:
  // - subscriptionId exists
  // - status is 'active' or 'past_due' (not 'canceled')
  // - NOT scheduled for cancellation (cancelAtPeriodEnd = false)
  const isActive =
    user.subscriptionId != null &&
    user.subscriptionStatus != null &&
    ['active', 'past_due'].includes(user.subscriptionStatus) &&
    !user.cancelAtPeriodEnd;

  return {
    hasSubscription: isActive,
    subscriptionId: user.subscriptionId,
    tier: user.subscriptionTier,
    status: user.subscriptionStatus,
  };
}
```

Modify `createCheckoutSession()` to validate:

```typescript
export async function createCheckoutSession(
  userId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  // Check for existing subscription FIRST
  const existing = await hasActiveSubscription(userId);

  if (existing.hasSubscription) {
    const targetTier = getTierFromPriceId(priceId);

    if (targetTier === existing.tier) {
      throw new Error('You already have an active subscription to this plan');
    }

    // Cancel existing subscription before creating new one
    // This ensures clean state and prevents orphaned subscriptions
    logger.info('[BILLING] Canceling existing subscription before new checkout', {
      userId,
      existingTier: existing.tier,
      targetTier,
      existingSubscriptionId: existing.subscriptionId,
    });

    await cancelSubscription(userId);
  }

  // Continue with existing checkout logic...
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, stripeCustomerId: true },
  });

  // ... rest of existing code
}
```

---

### Phase 3: Block Account Deletion with Active Subscription

**File:** `apps/api/src/services/accountDeletionService.ts`

Modify `scheduleAccountDeletion()`:

```typescript
export async function scheduleAccountDeletion(userId: string): Promise<{
  success: boolean;
  scheduledFor?: Date;
  error?: string;
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { accountDeletion: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // NEW: Check for active subscription
    const { hasActiveSubscription } = await import('./billingService');
    const subscription = await hasActiveSubscription(userId);

    if (subscription.hasSubscription) {
      return {
        success: false,
        error: 'Please cancel your subscription before deleting your account. You can manage your subscription in Settings > Billing.',
      };
    }

    // ... rest of existing code
  }
}
```

**File:** `apps/api/src/controllers/userController.ts`

Modify `deleteAccount()`:

```typescript
export async function deleteAccount(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // NEW: Check for active subscription
    const { hasActiveSubscription } = await import('../services/billingService');
    const subscription = await hasActiveSubscription(userId);

    if (subscription.hasSubscription) {
      return res.status(400).json({
        error: 'Cannot delete account with active subscription',
        message: 'Please cancel your subscription before deleting your account. You can manage your subscription in Settings > Billing.',
      });
    }

    // ... rest of existing deletion code
  }
}
```

---

### Phase 4: Update Billing Controller Error Handling

**File:** `apps/api/src/controllers/billingController.ts`

Better error handling for duplicate subscription attempts:

```typescript
export async function createCheckout(req: Request, res: Response) {
  const userId = getUserId(req);
  const { priceId } = req.body;

  try {
    // ... validation code ...

    const checkoutUrl = await createCheckoutSession(userId, priceId, successUrl, cancelUrl);
    res.json({ url: checkoutUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create checkout session';

    // Handle specific errors with appropriate status codes
    if (message.includes('already have an active subscription')) {
      return res.status(400).json({ error: message });
    }

    logger.error('[BILLING-API] Failed to create checkout session', {
      error: err instanceof Error ? err : new Error(String(err)),
      userId,
      priceId,
    });
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
```

---

### Phase 5: Frontend Updates (Optional Enhancement)

**File:** `apps/web/src/app/pricing/page.tsx`

Show better UI when user already has subscription:

- If user has active subscription → show "Manage Subscription" button instead of upgrade options
- Or show "Change Plan" which goes to Stripe Portal

**File:** `apps/web/src/app/settings/account/page.tsx`

Show warning when trying to delete account with active subscription:

- Disable delete button if subscription active
- Show message: "Cancel your subscription before deleting your account"

---

## File Changes Summary

| File | Changes |
|------|---------|
| `apps/api/src/services/billingService.ts` | Add `cancelSubscription()`, `hasActiveSubscription()`, update `createCheckoutSession()` |
| `apps/api/src/services/accountDeletionService.ts` | Add subscription check in `scheduleAccountDeletion()` |
| `apps/api/src/controllers/userController.ts` | Add subscription check in `deleteAccount()` |
| `apps/api/src/controllers/billingController.ts` | Add error handling for duplicate subscription |
| `apps/web/src/app/settings/account/page.tsx` | (Optional) Disable delete if subscription active |

---

## Testing Checklist

- [ ] User with FREE tier can upgrade to STARTER
- [ ] User with FREE tier can upgrade to PROFESSIONAL
- [ ] User with STARTER cannot create duplicate STARTER subscription
- [ ] User with STARTER can upgrade to PROFESSIONAL (old sub cancelled first)
- [ ] User with active subscription cannot delete account
- [ ] User with canceled subscription CAN delete account
- [ ] User with subscription pending cancellation cannot delete account until cancellation completes
- [ ] Webhooks still work correctly after changes

---

## Migration Notes

Since there are no existing users with this issue (per user's statement), no data migration is needed. The changes are purely additive business logic.

---

## Rollback Plan

If issues arise, the changes can be rolled back by:
1. Removing the subscription checks in `createCheckoutSession()`
2. Removing the subscription checks in account deletion
3. The system will revert to previous (broken) behavior

This is safe because no schema changes are involved.
