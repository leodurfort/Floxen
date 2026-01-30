# Floxen

**Get your WooCommerce products discovered in ChatGPT.**

Floxen connects WooCommerce stores to OpenAI's product feed so merchants can surface their catalog in ChatGPT shopping conversations. Connect a store, select products, map fields, activate - products become discoverable to 300M+ weekly ChatGPT users.

**Live:** [floxen.ai](https://floxen.ai) | **App:** [app.floxen.ai](https://app.floxen.ai)

---

## How It Works

1. **Connect** - OAuth into any WooCommerce store (read-only, products only)
2. **Select** - Choose which products to publish (tiered by plan)
3. **Map** - Floxen auto-maps WooCommerce fields to OpenAI's 70-attribute feed spec. Merchants fine-tune via a visual field mapping UI with live preview
4. **Activate** - One click generates a compliant JSON feed and keeps it synced

## Architecture

TypeScript monorepo. Four apps, one shared package.

```
floxen/
├── apps/
│   ├── api/              # Express + Prisma API
│   ├── web/              # Next.js 14 dashboard (App Router)
│   ├── landing/          # Marketing site (floxen.ai)
│   └── test-generator/   # WooCommerce test data tooling
├── packages/
│   └── shared/           # OpenAI feed spec, types, transforms
└── docs/
```

### apps/api

Express + TypeScript backend. Handles auth, store connections, product sync, feed generation, and billing.

- **Database:** PostgreSQL via Prisma ORM (15+ models)
- **Cache / Queue:** Redis + BullMQ for async sync jobs and scheduled tasks
- **Auth:** JWT (access + refresh tokens), Google OAuth, multi-step email verification
- **Integrations:** WooCommerce REST API (OAuth), OpenAI product feed, Stripe (subscriptions), Resend (transactional email), Sentry (error tracking), S3 (feed storage)
- **Key routes:** Auth, shops, products, sync, feed (public JSON endpoints), analytics, billing

### apps/web

Next.js 14 App Router dashboard. The merchant's control plane.

- **State:** Zustand + TanStack Query
- **Forms:** React Hook Form + Zod validation
- **Auth:** Google OAuth + email/password
- **Key flows:** Onboarding wizard, store connection, product selection, field mapping setup (shop-level + product-level overrides), bulk edit, catalog management, feed activation
- **Support:** Intercom chat integration with identity verification

### apps/landing

Static marketing site at floxen.ai. Next.js with Tailwind. Includes hero, how-it-works, features, pricing (Free / Starter / Pro), FAQ, legal pages. SEO-optimized with JSON-LD structured data.

### apps/test-generator

Internal tool for seeding WooCommerce stores with test products. OAuth connection, batch product generation, cleanup, and data repair utilities.

### packages/shared

The transformation engine. Contains:

- **OpenAI feed spec** - All 70 feed attributes with types, validation rules, WooCommerce mappings, and editability flags
- **Transform registry** - Declarative field mapping: WooCommerce data in, OpenAI-compliant data out
- **Validators** - Feed-level and field-level validation against OpenAI requirements
- **Shared types** - User, Shop, Product, enums consumed across all apps

## Tech Stack

| Layer | Tech |
|---|---|
| Language | TypeScript (end-to-end) |
| API | Express 4, Prisma 5, Zod |
| Frontend | Next.js 14, React 18, Tailwind CSS, Zustand, TanStack Query |
| Database | PostgreSQL |
| Cache / Queue | Redis, BullMQ |
| Auth | JWT, Google OAuth, bcrypt |
| Payments | Stripe (subscriptions) |
| Email | Resend |
| Monitoring | Sentry |
| Storage | S3-compatible |
| Infra | Railway (Docker), npm workspaces |

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL, JWT secrets, API keys

# Run database migrations
npm run migrate:deploy

# Start API (port 3001) and web app (port 3000)
npm run dev:api
npm run dev:web

# Optional: start landing site (port 3003)
npm run dev:landing
```

## API Overview

Base path: `/api/v1`

| Domain | Endpoints | Auth |
|---|---|---|
| Auth | Register (multi-step), login, Google OAuth, refresh, password reset | Public |
| Shops | CRUD, OAuth callback, field mappings, feed activation, product discovery | Protected |
| Products | List, detail, update, selection management | Protected |
| Sync | Trigger sync, push feed, preview | Protected (rate limited) |
| Feed | JSON feed per shop, snapshots, HTML debug view | **Public** (rate limited) |
| Analytics | Product & shop-level metrics | Protected |
| Billing | Stripe subscription management | Protected |

## Key Design Decisions

**Shared transformation layer** - WooCommerce and OpenAI schemas don't overlap cleanly. A declarative mapping registry in `packages/shared` handles all transformations in one place. Both API and web consume the same spec.

**Two-tier field mapping** - Shop-level defaults + product-level overrides. Merchants get automation by default and per-product control when they need it. Bulk edit applies across selections.

**Hourly sync over real-time webhooks** - MVP trades real-time freshness for operational simplicity. Webhook-based sync is architected (BullMQ + Redis infrastructure is in place) but not shipped yet. Hourly is sufficient for most merchant inventory velocity.

**Public feed endpoints** - `/feed/:shopId` serves the JSON feed without authentication. OpenAI fetches it directly. Rate-limited at 100 req/min.

**No AI enrichment on product data** - Floxen transforms and validates, it doesn't rewrite. Keeps the pipeline fast, cheap, and deterministic. Merchants own their content.
