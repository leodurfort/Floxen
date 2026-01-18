# Brainstorming Session: Stripe Implementation for ProductSynch

**Date**: 2026-01-17
**Topic**: Implementing Stripe payments/billing
**Goal**: Focused ideation on implementation approach
**Approach**: Progressive flow (broad → specific)

## Pricing Model (Defined)
| Tier (Enum) | Display | Price | Limit |
|-------------|---------|-------|-------|
| `FREE` | Free | $0 | 15 products/shop |
| `STARTER` | Starter | $29/mo or $278/yr | 500 products/shop |
| `PROFESSIONAL` | Pro | $49/mo or $470/yr | Unlimited |

## Reference
- User wants billing Stripe hosted portal screenshots

---

# Phase 1: Divergent — What Do We Need to Consider?

## User's Initial Thoughts

- Need to add billing capabilities to the app
- Prefer Stripe's hosted UX to keep implementation simpler
- Uncertainty about which Stripe products are needed
- Uncertainty about API vs web interface configuration
- "I don't know what questions to ask for great UX"
- Users should choose their plan (not auto-assigned)
- Plans are based on **number of products synchronized** from e-commerce store
- Focus is on Stripe implementation, not app UX flow

## Categories Identified

### Stripe Products & Concepts

**Products needed:**
- ✅ Stripe Billing — manages subscriptions, invoices, recurring payments
- ✅ Stripe Checkout — hosted payment page (Stripe's UX)
- ✅ Customer Portal — hosted self-service for users to manage billing
- ❌ Stripe Payments (one-time) — not needed

**Billing frequency:**
- Monthly AND Annual options (annual with discount)

### Technical Implementation

**Current State (from codebase analysis):**

| What exists | Details |
|-------------|---------|
| Database | PostgreSQL with Prisma ORM |
| User model | Has `subscriptionTier` field (enum: FREE, STARTER, PROFESSIONAL, ENTERPRISE) |
| Auth | JWT-based (access: 15m, refresh: 7d), tier included in token |
| Structure | Single-user model (no teams/orgs) — User owns Shops directly |

**✅ Tier Names Decision:**
- Keep existing enum: `FREE`, `STARTER`, `PROFESSIONAL`
- Display names: Free, Starter, Pro
- Remove `ENTERPRISE` from enum (not used)

| Enum | Display | Price | Limit |
|------|---------|-------|-------|
| `FREE` | Free | $0 | 15 products/shop |
| `STARTER` | Starter | $29/mo or $278/yr | 500 products/shop |
| `PROFESSIONAL` | Pro | $49/mo or $470/yr | Unlimited |

**What needs to be ADDED to User model:**

| Field | Purpose |
|-------|---------|
| `stripeCustomerId` | Link to Stripe Customer |
| `subscriptionId` | Active Stripe subscription ID |
| `subscriptionStatus` | `active`, `canceled`, `past_due`, `trialing` |
| `currentPeriodEnd` | When billing period ends |
| `cancelAtPeriodEnd` | User requested cancellation? |

**What Your Code Will Do (API endpoints needed):**

| Endpoint | Purpose |
|----------|---------|
| `POST /api/billing/checkout` | Create Checkout Session → redirect to Stripe |
| `POST /api/billing/portal` | Create Portal Session → redirect to manage billing |
| `POST /api/webhooks/stripe` | Receive Stripe events |

**Webhook Events to Handle:**
- `checkout.session.completed` — user subscribed
- `customer.subscription.updated` — plan changed
- `customer.subscription.deleted` — subscription canceled
- `invoice.payment_failed` — payment failed

### Business Logic

**What counts as a product:**
- WooCommerce products (parent), NOT ProductSynch items/variants
- Example: 1 WooCommerce product with 5 color variants = **1 product** for billing
- ALL synced products count, even if excluded from feed
- Counted **per shop**

**Updated limits:**
| Tier | Limit |
|------|-------|
| FREE | 15 WooCommerce products per shop |
| STARTER | 500 WooCommerce products per shop |
| PROFESSIONAL | Unlimited |

**Limit enforcement:**
- Sync is hard-limited by default (can't exceed)
- User upgrades → triggers new sync with higher limit

**Downgrade behavior:**
- New sync happens with new (lower) limit
- Example: Pro (800 products) → Starter = next sync only syncs 500
- Old data kept until next sync, then replaced with fresh limited set

**Product Selection Model:**

*Initial sync:*
- Connect WooCommerce → Fetch product list (metadata only)
- User explicitly selects up to [tier limit] products
- Full sync of selected products only

*Ongoing behavior:*
- Swaps allowed anytime (remove A, add B) as long as total ≤ limit
- New WooCommerce products appear as "available" but can't add without removing another or upgrading
- Selected products stay synced on every refresh

*On upgrade:*
- Full re-selection up to new limit (e.g., FREE→STARTER = select up to 500)

*On downgrade:*
- Full re-selection required down to new limit (e.g., PRO→STARTER with 800 products = must select 500 to keep)

**Limit scope:**
- Per shop (not per user)
- FREE user with 2 shops = 15 products per shop (30 total)

### User Experience
*(pricing page, checkout, portal, invoices)*

### Edge Cases & Decisions

**Upgrades mid-cycle:**
- Prorate (credit unused days, charge new plan remainder)

**Downgrades mid-cycle:**
- End of period (keep current tier until renewal, then switch)

**Failed payments:**
- During `past_due` (retry period): Keep current tier access
- After all retries fail (`canceled`): Revert to FREE tier

**Free trial:**
- No separate trial — FREE tier serves as the trial

**Annual ↔ Monthly switching:**
- Monthly → Annual (same tier): **Immediate** with proration (upgrade in commitment)
- Annual → Monthly (same tier): **End of period** (downgrade in commitment)
- Cross-tier follows same logic: more commitment = immediate, less = end of period

**Refunds:**
- No refunds policy

### Additional Decisions (from review)

**FREE tier in Stripe:**
- No Stripe Product/Price for FREE tier
- FREE users have no `stripeCustomerId` until first upgrade attempt
- Tier managed entirely in app database

**Stripe Customer creation:**
- Created on first checkout attempt (lazy creation)
- Not on signup

**PRO tier product selection:**
- No selection UI — auto-sync all products
- No limit enforcement needed

**Currency:**
- Single currency: USD only

**Tax:**
- Use Stripe Tax (automatic calculation)

**Abandoned checkout:**
- Listen for `checkout.session.expired` webhook
- Useful for follow-up emails later

**Downgrade re-selection trigger:**
- Add `needsProductReselection` flag to Shop model
- Set to `true` when tier downgrades
- App checks flag on login/shop access → force re-selection UI

**Price ID → Tier mapping:**
```typescript
const PRICE_TO_TIER: Record<string, SubscriptionTier> = {
  'price_starter_monthly': 'STARTER',
  'price_starter_annual': 'STARTER',
  'price_pro_monthly': 'PROFESSIONAL',
  'price_pro_annual': 'PROFESSIONAL',
}
```

**Checkout session metadata:**
- Pass `userId` in metadata so webhook can identify user
```typescript
metadata: { userId: user.id }
```

---

# Phase 2: Synthesis — Implementation Roadmap

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR APP                                  │
├─────────────────────────────────────────────────────────────────┤
│  Frontend                         │  Backend                     │
│  ────────                         │  ───────                     │
│  • Pricing page                   │  • POST /api/billing/checkout│
│  • "Upgrade" buttons              │  • POST /api/billing/portal  │
│  • "Manage Billing" button        │  • POST /api/webhooks/stripe │
│  • Product selection UI           │  • Tier enforcement logic    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         STRIPE                                   │
├─────────────────────────────────────────────────────────────────┤
│  Dashboard (one-time setup)       │  Hosted UX (Stripe manages)  │
│  ─────────────────────────        │  ──────────────────────────  │
│  • Products: Starter, Pro         │  • Checkout page             │
│  • Prices: $29/mo, $278/yr, etc.  │  • Customer Portal           │
│  • Customer Portal settings       │  • Invoice emails            │
│  • Webhook endpoint config        │  • Payment retry (dunning)   │
└─────────────────────────────────────────────────────────────────┘
```

## What to Configure in Stripe Dashboard

### 1. Products & Prices

| Product | Price ID needed | Amount |
|---------|-----------------|--------|
| Starter | `price_starter_monthly` | $29/month |
| Starter | `price_starter_annual` | $278/year (20% off) |
| Pro | `price_pro_monthly` | $49/month |
| Pro | `price_pro_annual` | $470/year (20% off) |

### 2. Customer Portal Settings

Enable:
- ✅ Update payment method
- ✅ View invoice history
- ✅ Cancel subscription
- ✅ Switch plans (upgrade/downgrade)

Configure:
- Proration behavior: `create_prorations`
- Cancellation: At end of billing period

### 3. Webhook Endpoint

Register: `https://yourapp.com/api/webhooks/stripe`

Events to listen for:
- `checkout.session.completed`
- `checkout.session.expired` (for abandoned checkout follow-up)
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.paid`

## Database Changes (Prisma)

```prisma
// Update SubscriptionTier enum (remove ENTERPRISE)
enum SubscriptionTier {
  FREE
  STARTER
  PROFESSIONAL
}

// Add to User model
model User {
  // ... existing fields ...

  // Stripe fields
  stripeCustomerId    String?   @unique @map("stripe_customer_id")
  subscriptionId      String?   @map("subscription_id")
  subscriptionStatus  String?   @map("subscription_status") // active, canceled, past_due
  currentPeriodEnd    DateTime? @map("current_period_end")
  cancelAtPeriodEnd   Boolean   @default(false) @map("cancel_at_period_end")
}

// Add to Shop model (for product selection tracking)
model Shop {
  // ... existing fields ...

  productLimit              Int       @default(15) @map("product_limit")
  needsProductReselection   Boolean   @default(false) @map("needs_product_reselection")
}

// Track selected products
model Product {
  // ... existing fields ...

  isSelected          Boolean   @default(false) @map("is_selected")
}
```

## API Endpoints to Build

### POST /api/billing/checkout

```typescript
// Request
{ priceId: "price_starter_monthly" }

// Logic
1. Get or create Stripe Customer (store stripeCustomerId)
2. Create Checkout Session with:
   - customer: stripeCustomerId
   - mode: "subscription"
   - line_items: [{ price: priceId, quantity: 1 }]
   - automatic_tax: { enabled: true }  // Stripe Tax
   - success_url: /settings/billing?success=true
   - cancel_url: /pricing
   - metadata: { userId: user.id }
3. Return { url: session.url }

// Frontend redirects to Stripe Checkout
```

### POST /api/billing/portal

```typescript
// Logic
1. Get user's stripeCustomerId (required)
2. Create Billing Portal Session with:
   - customer: stripeCustomerId
   - return_url: /settings/billing  // Where user returns after portal
3. Return { url: session.url }

// Frontend redirects to Stripe Portal
```

### POST /api/webhooks/stripe

```typescript
// 1. Verify webhook signature (REQUIRED for security)
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

// 2. Handle events:

checkout.session.completed:
  // Session object contains: subscription, customer, metadata
  const session = event.data.object;
  const userId = session.metadata.userId;
  const subscriptionId = session.subscription;  // Subscription ID directly available
  const customerId = session.customer;

  // Retrieve subscription to get price ID
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0].price.id;
  const tier = PRICE_TO_TIER[priceId];

  → Update user: stripeCustomerId, subscriptionId, subscriptionTier, subscriptionStatus
  → Update shop productLimit based on tier
  → If tier != PRO: trigger product re-selection flow

customer.subscription.updated:
  // Check subscription.items.data[0].price for new price
  const subscription = event.data.object;
  const priceId = subscription.items.data[0].price.id;
  const newTier = PRICE_TO_TIER[priceId];

  → Update user tier based on price ID
  → If downgrade: set needsProductReselection = true on shops

customer.subscription.deleted:
  → Set subscriptionTier = FREE, clear subscriptionId
  → Set needsProductReselection = true on all shops

invoice.payment_failed:
  → Set subscriptionStatus = "past_due"
  → (Keep current tier access)

invoice.paid:
  → Set subscriptionStatus = "active"
  → Update currentPeriodEnd from subscription.current_period_end

checkout.session.expired:
  → Log for follow-up email (optional)
```

## Product Selection Flow

### Initial Connection (New)

```
1. User connects WooCommerce
2. Fetch ALL product metadata (id, name, image, modified_date)
3. Show selection UI:
   "Select up to 15 products to sync (Free plan)"
   [Product grid with checkboxes]
   [Selected: 0/15]
4. User selects products
5. Sync only selected products
6. Store selection (isSelected = true on Product)
```

### Upgrade Flow

```
1. User on FREE (15 products) upgrades to STARTER
2. Webhook fires → update tier
3. Redirect to selection UI:
   "You can now sync up to 500 products!"
   [Current 15 pre-selected]
   [All other products available]
4. User selects additional products
5. Trigger sync of newly selected products
```

### Downgrade Flow

```
1. User on PRO (800 products) downgrades to STARTER
2. Webhook fires at period end → update tier
3. Force selection UI:
   "Your plan now supports 500 products. Please select which to keep."
   [Must deselect 300 products]
4. On save → mark deselected as isSelected = false
5. Next sync only includes selected 500
```

## Summary: What You Build vs What Stripe Provides

| You Build | Stripe Provides |
|-----------|-----------------|
| Pricing page UI | Checkout page |
| "Upgrade" button → redirect | Payment processing |
| "Manage Billing" button → redirect | Customer Portal |
| Webhook handler | Subscription management |
| Product selection UI | Invoice emails |
| Tier enforcement in sync | Payment retry logic |
| Database updates | Proration calculations |

---

# Phase 3: Action Items

## Implementation Order (Recommended)

### Step 1: Stripe Dashboard Setup
- [ ] Create Stripe account (or use existing)
- [ ] Create Products: "Starter", "Pro" (NO product for Free tier)
- [ ] Create Prices (4 total): monthly + annual for each
- [ ] Configure Customer Portal settings (proration, cancellation at period end)
- [ ] Enable Stripe Tax
- [ ] Note down Price IDs for code
- [ ] Create Price ID → Tier mapping constant

### Step 2: Database Migration
- [ ] Remove `ENTERPRISE` from SubscriptionTier enum
- [ ] Add Stripe fields to User model
- [ ] Add `isSelected` to Product model
- [ ] Add `needsProductReselection` to Shop model
- [ ] Delete existing test accounts (fresh start)
- [ ] Run migration

### Step 3: Backend - Stripe Integration
- [ ] Install `stripe` npm package
- [ ] Add Stripe API keys to env (test mode first)
- [ ] Add Stripe webhook secret to env
- [ ] Build `POST /api/billing/checkout` endpoint (include userId in metadata, enable automatic_tax)
- [ ] Build `POST /api/billing/portal` endpoint
- [ ] Build `POST /api/webhooks/stripe` endpoint:
  - [ ] ⚠️ Use raw body for signature verification (not parsed JSON)
  - [ ] Verify signature with `stripe.webhooks.constructEvent()`
  - [ ] Handle all events including `checkout.session.expired`
- [ ] Test with Stripe CLI (`stripe listen --forward-to localhost:PORT/api/webhooks/stripe`)

### Step 4: Backend - Tier Enforcement
- [ ] Modify sync logic to respect product selection
- [ ] Add tier limit constants (FREE=15, STARTER=500, PRO=unlimited)
- [ ] PRO tier: auto-sync all products (no selection)
- [ ] Build product selection save endpoint
- [ ] Implement `needsProductReselection` flag logic

### Step 5: Frontend - Product Selection UI
- [ ] Build product selection component (grid with checkboxes)
- [ ] Integrate into WooCommerce connection flow
- [ ] Add selection count indicator ("5/15 selected")
- [ ] Handle upgrade/downgrade re-selection flows

### Step 6: Frontend - Billing UI
- [ ] Build pricing page (or add to settings)
- [ ] Add "Upgrade" buttons → call checkout endpoint
- [ ] Add "Manage Billing" button → call portal endpoint
- [ ] Show current plan in settings

### Step 7: Testing
- [ ] Test full checkout flow (Stripe test mode)
- [ ] Test upgrade/downgrade via Customer Portal
- [ ] Test monthly → annual switch (immediate proration)
- [ ] Test annual → monthly switch (end of period)
- [ ] Test webhook handling (all subscription events)
- [ ] Test failed payment scenario
- [ ] Test product selection limits (FREE, STARTER)
- [ ] Test PRO auto-sync (no selection UI)
- [ ] Test `needsProductReselection` flow on downgrade

### Step 8: Go Live
- [ ] Switch to Stripe live keys
- [ ] Register production webhook URL
- [ ] Verify webhook signature in production

---

## Key Decisions Summary

| Decision | Choice |
|----------|--------|
| Stripe products | Billing + Checkout + Customer Portal |
| Billing frequency | Monthly + Annual (20% discount) |
| Tier names | FREE, STARTER, PROFESSIONAL |
| Limits | 15 / 500 / Unlimited per shop |
| Limit enforcement | User selects products explicitly |
| Selection behavior | Swaps allowed, locked to limit |
| PRO tier selection | No selection UI — auto-sync all |
| Upgrade mid-cycle | Prorate |
| Downgrade mid-cycle | End of period |
| Monthly → Annual | Immediate with proration |
| Annual → Monthly | End of period |
| Failed payment | Keep access during retry, then FREE |
| Free trial | No — FREE tier is the trial |
| FREE tier in Stripe | No product — managed in app only |
| Stripe Customer | Created on first checkout (lazy) |
| Currency | USD only |
| Tax | Stripe Tax (automatic) |
| Refunds | No refunds |
| Abandoned checkout | Track for follow-up emails |

---

## Questions Answered

✅ Which Stripe products? → Billing + Checkout + Customer Portal
✅ API vs Dashboard? → Dashboard for setup, API for runtime
✅ How to enforce limits? → Product selection UI, your app enforces
✅ What about upgrades/downgrades? → Prorate up, end-of-period down
✅ Failed payments? → Keep access during retry, revert to FREE after

---

## Session Complete

**Next step**: Start with Step 1 (Stripe Dashboard setup) — create your products and prices, then move to code.
