# Epics and Stories
# WooCommerce Test Data Generator

**Version:** 1.1
**Date:** January 13, 2026
**Author:** Scrum Master Agent
**Status:** Implementation Complete
**Related Documents:**
- [PRD](./PRD-woo-test-generator.md)
- [Architecture](./ARCHITECTURE-woo-test-generator.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Epic Summary](#epic-summary)
3. [Epic 1: Project Setup & Infrastructure](#epic-1-project-setup--infrastructure)
4. [Epic 2: OAuth & Session Management](#epic-2-oauth--session-management)
5. [Epic 3: Product Data Catalog](#epic-3-product-data-catalog)
6. [Epic 4: Product Generation Engine](#epic-4-product-generation-engine)
7. [Epic 5: User Interface](#epic-5-user-interface)
8. [Epic 6: Cleanup Functionality](#epic-6-cleanup-functionality)
9. [Epic 7: Testing & Quality Assurance](#epic-7-testing--quality-assurance)
10. [Implementation Order](#implementation-order)

---

## Overview

This document breaks down the WooCommerce Test Data Generator into implementable epics and user stories. Each story includes acceptance criteria, technical notes, and estimated complexity.

### Story Point Scale

| Points | Complexity | Time Estimate |
|--------|------------|---------------|
| 1 | Trivial | < 1 hour |
| 2 | Simple | 1-2 hours |
| 3 | Medium | 2-4 hours |
| 5 | Complex | 4-8 hours |
| 8 | Very Complex | 1-2 days |
| 13 | Epic-level | 2-3 days |

### Story Status Legend

- `[ ]` Not Started
- `[~]` In Progress
- `[x]` Completed
- `[!]` Blocked

---

## Epic Summary

| Epic | Name | Stories | Total Points | Priority |
|------|------|---------|--------------|----------|
| E1 | Project Setup & Infrastructure | 6 | 18 | P0 - Critical |
| E2 | OAuth & Session Management | 5 | 21 | P0 - Critical |
| E3 | Product Data Catalog | 6 | 26 | P0 - Critical |
| E4 | Product Generation Engine | 8 | 42 | P0 - Critical |
| E5 | User Interface | 7 | 24 | P1 - High |
| E6 | Cleanup Functionality | 4 | 16 | P1 - High |
| E7 | Testing & Quality Assurance | 5 | 18 | P2 - Medium |
| **Total** | | **41** | **165** | |

---

## Epic 1: Project Setup & Infrastructure

**Goal:** Establish the foundational project structure within the ProductSync monorepo.

**Dependencies:** None (this is the foundation)

**Acceptance Criteria:**
- [x] New Next.js app created in `apps/test-generator/`
- [x] Monorepo workspace configuration updated
- [x] Development server runs independently
- [x] Railway deployment configuration ready

---

### Story 1.1: Initialize Next.js Application

**As a** developer
**I want** a new Next.js 14 application in the monorepo
**So that** I have the foundation for the test generator

**Status:** `[x]` Completed
**Points:** 3
**Priority:** P0

**Acceptance Criteria:**
- [x] Next.js 14 app created with App Router at `apps/test-generator/`
- [x] TypeScript configured with strict mode
- [x] Tailwind CSS configured matching ProductSync web app
- [x] ESLint and Prettier configured
- [x] App runs on port 3002 (to avoid conflicts with existing apps)

**Technical Notes:**
```bash
# Commands to run
cd apps
npx create-next-app@14 test-generator --typescript --tailwind --app --src-dir
```

**Files to Create/Modify:**
- `apps/test-generator/package.json`
- `apps/test-generator/tsconfig.json`
- `apps/test-generator/tailwind.config.ts`
- `apps/test-generator/next.config.js`
- `apps/test-generator/src/app/layout.tsx`
- `apps/test-generator/src/app/page.tsx`
- `apps/test-generator/src/app/globals.css`

---

### Story 1.2: Configure Monorepo Workspace

**As a** developer
**I want** the test generator integrated into the monorepo workspace
**So that** I can run it alongside other apps and share dependencies

**Status:** `[x]` Completed
**Points:** 2
**Priority:** P0

**Acceptance Criteria:**
- [x] Root `package.json` updated with workspace scripts
- [x] `npm run dev:test-gen` starts the test generator
- [x] `npm run build:test-gen` builds the test generator
- [x] Shared packages accessible from test generator

**Technical Notes:**
```json
// Root package.json additions
{
  "scripts": {
    "dev:test-gen": "npm run dev --workspace=apps/test-generator",
    "build:test-gen": "npm run build --workspace=apps/test-generator"
  }
}
```

**Files to Modify:**
- `package.json` (root)

---

### Story 1.3: Set Up Environment Configuration

**As a** developer
**I want** environment variables properly configured
**So that** the app works in development and production

**Status:** `[x]` Completed
**Points:** 2
**Priority:** P0

**Acceptance Criteria:**
- [x] `.env.local.example` created with all required variables
- [x] Environment variables documented
- [x] `SESSION_SECRET` generation instructions provided
- [x] `NEXT_PUBLIC_APP_URL` configured for development

**Environment Variables:**
```env
# Required
SESSION_SECRET=your-32-character-secret-here
NEXT_PUBLIC_APP_URL=http://localhost:3002

# Optional
PLACEHOLDER_IMAGE_URL=https://via.placeholder.com
```

**Files to Create:**
- `apps/test-generator/.env.local.example`
- `apps/test-generator/.env.local` (gitignored)

---

### Story 1.4: Configure Railway Deployment

**As a** developer
**I want** Railway deployment configuration ready
**So that** the app can be deployed as a separate service

**Status:** `[x]` Completed
**Points:** 3
**Priority:** P0

**Acceptance Criteria:**
- [x] `railway.toml` configured with build and start commands
- [x] Health check endpoint configured (`/api/status`)
- [x] Service runs on internal port 3000
- [x] Documentation for Railway setup provided

**Files to Create:**
- `apps/test-generator/railway.toml`

**Railway Config:**
```toml
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/status"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

---

### Story 1.5: Create Base Directory Structure

**As a** developer
**I want** the directory structure established
**So that** I have clear organization for all components

**Status:** `[x]` Completed
**Points:** 3
**Priority:** P0

**Acceptance Criteria:**
- [x] All directories created per architecture document
- [x] Barrel exports (`index.ts`) in each directory
- [x] README placeholder in key directories

**Directory Structure:**
```
src/
├── app/
│   └── api/
│       ├── oauth/
│       │   ├── initiate/
│       │   └── callback/
│       ├── generate/
│       ├── cleanup/
│       └── status/
├── components/
│   └── ui/
├── lib/
├── data/
│   └── products/
├── types/
└── hooks/
```

---

### Story 1.6: Create Shared Type Definitions

**As a** developer
**I want** TypeScript type definitions established
**So that** all code is type-safe from the start

**Status:** `[x]` Completed
**Points:** 5
**Priority:** P0

**Acceptance Criteria:**
- [x] Session types defined
- [x] Product definition types defined
- [x] WooCommerce API types defined
- [x] API response types defined
- [x] SSE event types defined

**Files to Create:**
- `apps/test-generator/src/types/index.ts`
- `apps/test-generator/src/types/session.ts`
- `apps/test-generator/src/types/product.ts`
- `apps/test-generator/src/types/woocommerce.ts`
- `apps/test-generator/src/types/api.ts`
- `apps/test-generator/src/types/events.ts`

**Key Types:**
```typescript
// types/session.ts
export interface SessionData {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  connectedAt: number;
  storeInfo?: StoreInfo;
}

// types/events.ts
export interface ProgressEvent {
  type: 'progress';
  phase: string;
  current: number;
  total: number;
  message: string;
}
```

---

## Epic 2: OAuth & Session Management

**Goal:** Implement secure WooCommerce OAuth flow and session management.

**Dependencies:** Epic 1 (Project Setup)

**Acceptance Criteria:**
- [x] Users can connect to any WooCommerce store via OAuth
- [x] Credentials stored securely in encrypted session
- [x] Session expires after 1 hour
- [x] Users can disconnect and reconnect

---

### Story 2.1: Implement Session Management

**As a** developer
**I want** iron-session configured for secure credential storage
**So that** WooCommerce credentials are stored safely

**Status:** `[x]` Completed
**Points:** 5
**Priority:** P0

**Acceptance Criteria:**
- [x] `iron-session` package installed
- [x] Session configuration with 1-hour TTL
- [x] HTTP-only, secure cookies in production
- [x] Helper functions for get/set/clear session
- [x] Session type augmentation for TypeScript

**Files to Create:**
- `apps/test-generator/src/lib/session.ts`

**Implementation:**
```typescript
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionData } from '@/types/session';

export const sessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'woo-test-gen-session',
  ttl: 3600,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  },
};

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}
```

---

### Story 2.2: Implement OAuth Initiate Endpoint

**As a** user
**I want** to enter my WooCommerce store URL and initiate connection
**So that** I can authorize the app to access my store

**Status:** `[x]` Completed
**Points:** 5
**Priority:** P0

**Acceptance Criteria:**
- [x] `POST /api/oauth/initiate` endpoint created
- [x] URL validation (must be valid HTTPS URL)
- [x] OAuth URL generated with correct parameters
- [x] Store URL saved to session
- [x] Error handling for invalid URLs

**Files to Create:**
- `apps/test-generator/src/app/api/oauth/initiate/route.ts`

**API Contract:**
```typescript
// Request
POST /api/oauth/initiate
{ "storeUrl": "https://mystore.com" }

// Response (success)
{ "success": true, "authUrl": "https://mystore.com/wc-auth/v1/authorize?..." }

// Response (error)
{ "success": false, "error": { "code": "INVALID_URL", "message": "..." } }
```

**OAuth URL Parameters:**
- `app_name`: "WooCommerce Test Data Generator"
- `scope`: "read_write"
- `user_id`: Session ID
- `return_url`: `${APP_URL}/?connected=true`
- `callback_url`: `${APP_URL}/api/oauth/callback`

---

### Story 2.3: Implement OAuth Callback Endpoint

**As a** user
**I want** the app to receive my WooCommerce credentials after authorization
**So that** I can generate products in my store

**Status:** `[x]` Completed
**Points:** 5
**Priority:** P0

**Acceptance Criteria:**
- [x] `GET /api/oauth/callback` endpoint created
- [x] `POST /api/oauth/callback` endpoint created (some WooCommerce versions use POST)
- [x] Both GET and POST methods handled identically
- [x] Credentials extracted from query params (GET) or body (POST)
- [x] Credentials validated (must be strings, not arrays)
- [x] Connection tested with WooCommerce API
- [x] Store settings fetched (currency, units)
- [x] All data saved to session
- [x] Redirect to app with success/error

**Files to Create:**
- `apps/test-generator/src/app/api/oauth/callback/route.ts`

**Technical Notes:**
- WooCommerce OAuth can send credentials via GET query params or POST body depending on the WordPress/WooCommerce version
- Both methods must be supported for maximum compatibility

**Security Checks:**
```typescript
// Prevent array injection
if (Array.isArray(consumer_key) || Array.isArray(consumer_secret)) {
  return redirect('/?error=invalid_credentials');
}
```

---

### Story 2.4: Implement Status Check Endpoint

**As a** frontend component
**I want** to check the current connection status
**So that** I can display the appropriate UI state

**Status:** `[x]` Completed
**Points:** 3
**Priority:** P0

**Acceptance Criteria:**
- [x] `GET /api/status` endpoint created
- [x] Returns connection status and store info
- [x] Returns false if no session
- [x] Used by frontend to restore state on page load

**Files to Create:**
- `apps/test-generator/src/app/api/status/route.ts`

**API Contract:**
```typescript
// Response (connected)
{
  "connected": true,
  "storeUrl": "https://mystore.com",
  "storeInfo": {
    "currency": "USD",
    "dimensionUnit": "in",
    "weightUnit": "lbs"
  },
  "connectedAt": 1704931200000
}

// Response (not connected)
{ "connected": false }
```

---

### Story 2.5: Implement WooCommerce Client

**As a** developer
**I want** a WooCommerce API client wrapper
**So that** I can interact with WooCommerce stores consistently

**Status:** `[x]` Completed
**Points:** 3
**Priority:** P0

**Acceptance Criteria:**
- [x] `@woocommerce/woocommerce-rest-api` package installed
- [x] Client wrapper class created
- [x] Methods for testing connection
- [x] Methods for fetching store settings
- [x] Proper error handling and typing

**Files to Create:**
- `apps/test-generator/src/lib/woo-client.ts`

**Implementation:**
```typescript
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

export class WooClient {
  private api: WooCommerceRestApi;

  constructor(storeUrl: string, consumerKey: string, consumerSecret: string) {
    this.api = new WooCommerceRestApi({
      url: storeUrl,
      consumerKey,
      consumerSecret,
      version: 'wc/v3',
    });
  }

  async testConnection(): Promise<boolean> {
    const response = await this.api.get('');
    return response.status === 200;
  }

  async getStoreSettings(): Promise<StoreSettings> {
    const response = await this.api.get('settings/general');
    // Extract currency, dimension_unit, weight_unit
  }
}
```

---

## Epic 3: Product Data Catalog

**Goal:** Define all 500 products as static TypeScript data structures.

**Dependencies:** Epic 1 (Types defined)

**Acceptance Criteria:**
- [x] All 14 categories defined
- [x] All 10 brands defined
- [x] All 500 products defined with edge cases
- [x] Type-safe product definitions
- [x] Products organized by category

---

### Story 3.1: Define Category Data

**As a** developer
**I want** all product categories defined
**So that** products can be properly categorized

**Status:** `[x]` Completed
**Points:** 2
**Priority:** P0

**Acceptance Criteria:**
- [x] 14 categories defined with hierarchy
- [x] Category slugs and names defined
- [x] Parent-child relationships established
- [x] Meta data for generator tracking included

**Files to Create:**
- `apps/test-generator/src/data/categories.ts`

**Data:**
```typescript
export const CATEGORIES: CategoryDefinition[] = [
  { slug: 'apparel', name: 'Apparel', parent: null },
  { slug: 'tops', name: 'Tops', parent: 'apparel' },
  { slug: 't-shirts', name: 'T-Shirts', parent: 'tops' },
  { slug: 'hoodies', name: 'Hoodies', parent: 'tops' },
  // ... all 14 categories
];
```

---

### Story 3.2: Define Brand Data

**As a** developer
**I want** all fictional brands defined
**So that** products have realistic brand assignments

**Status:** `[x]` Completed
**Points:** 1
**Priority:** P0

**Acceptance Criteria:**
- [x] 10 fictional brands defined
- [x] Brand styles and target categories documented
- [x] Brand selection logic for products

**Files to Create:**
- `apps/test-generator/src/data/brands.ts`

**Data:**
```typescript
export const BRANDS = {
  URBAN_THREAD: { name: 'UrbanThread', style: 'Streetwear, casual' },
  NORTH_PEAK: { name: 'NorthPeak', style: 'Outdoor, performance' },
  // ... all 10 brands
};
```

---

### Story 3.3: Define T-Shirts, Hoodies, Jackets Products

**As a** developer
**I want** tops category products defined
**So that** they can be generated in WooCommerce

**Status:** `[x]` Completed
**Points:** 8
**Priority:** P0

**Acceptance Criteria:**
- [x] 50 T-Shirt products (15 simple, 30 variable, 5 grouped)
- [x] 40 Hoodie products (12 simple, 25 variable, 3 grouped)
- [x] 40 Jacket products (10 simple, 25 variable, 5 grouped)
- [x] All edge cases from PRD included
- [x] Variations properly defined for variable products

**Files to Create:**
- `apps/test-generator/src/data/products/t-shirts.ts`
- `apps/test-generator/src/data/products/hoodies.ts`
- `apps/test-generator/src/data/products/jackets.ts`

---

### Story 3.4: Define Pants, Shorts Products

**As a** developer
**I want** bottoms category products defined
**So that** they can be generated in WooCommerce

**Status:** `[x]` Completed
**Points:** 5
**Priority:** P0

**Acceptance Criteria:**
- [x] 45 Pants products (12 simple, 28 variable, 5 grouped)
- [x] 40 Shorts products (15 simple, 20 variable, 5 grouped)
- [x] Waist/length sizing variations included
- [x] All edge cases included

**Files to Create:**
- `apps/test-generator/src/data/products/pants.ts`
- `apps/test-generator/src/data/products/shorts.ts`

---

### Story 3.5: Define Footwear Products

**As a** developer
**I want** footwear category products defined
**So that** they can be generated in WooCommerce

**Status:** `[x]` Completed
**Points:** 5
**Priority:** P0

**Acceptance Criteria:**
- [x] 45 Sneaker products (10 simple, 30 variable, 5 grouped)
- [x] 40 Boot products (12 simple, 23 variable, 5 grouped)
- [x] 40 Sandal products (18 simple, 17 variable, 5 grouped)
- [x] US/EU/UK sizing variations included
- [x] Width attribute variations included

**Files to Create:**
- `apps/test-generator/src/data/products/sneakers.ts`
- `apps/test-generator/src/data/products/boots.ts`
- `apps/test-generator/src/data/products/sandals.ts`

---

### Story 3.6: Define Accessories Products

**As a** developer
**I want** accessories category products defined
**So that** they can be generated in WooCommerce

**Status:** `[x]` Completed
**Points:** 5
**Priority:** P0

**Acceptance Criteria:**
- [x] 45 Hat products (25 simple, 15 variable, 5 grouped)
- [x] 45 Bag products (20 simple, 22 variable, 3 grouped)
- [x] 70 Belt products (31 simple, 35 variable, 4 grouped)
- [x] All edge cases included

**Files to Create:**
- `apps/test-generator/src/data/products/hats.ts`
- `apps/test-generator/src/data/products/bags.ts`
- `apps/test-generator/src/data/products/belts.ts`
- `apps/test-generator/src/data/index.ts` (barrel export)

---

## Epic 4: Product Generation Engine

**Goal:** Implement the core logic for creating products in WooCommerce.

**Dependencies:** Epic 2 (WooClient), Epic 3 (Product Data)

**Acceptance Criteria:**
- [x] Categories created first with proper hierarchy
- [x] Simple products created in batches
- [x] Variable products with all variations created
- [x] Grouped products reference correct children
- [x] Progress events emitted via SSE
- [x] Fail-fast on any error

---

### Story 4.1: Implement Category Generator

**As a** developer
**I want** categories created in WooCommerce
**So that** products can be properly categorized

**Status:** `[x]` Completed
**Points:** 5
**Priority:** P0

**Acceptance Criteria:**
- [x] Categories created in hierarchical order (parents first)
- [x] Category IDs mapped for product creation
- [x] Generator meta field added to all categories
- [x] Progress events yielded

**Files to Create:**
- `apps/test-generator/src/lib/category-generator.ts`

**Implementation:**
```typescript
export class CategoryGenerator {
  private wooClient: WooClient;
  private categoryIdMap: Map<string, number> = new Map();

  async *generate(): AsyncGenerator<ProgressEvent> {
    // Sort categories by hierarchy level
    const sorted = sortByHierarchy(CATEGORIES);

    for (const category of sorted) {
      const parentId = category.parent
        ? this.categoryIdMap.get(category.parent)
        : undefined;

      const created = await this.wooClient.createCategory({
        name: category.name,
        slug: category.slug,
        parent: parentId,
        meta_data: [
          { key: '_generated_by', value: 'woo-test-generator' }
        ]
      });

      this.categoryIdMap.set(category.slug, created.id);
      yield { type: 'progress', phase: 'categories', ... };
    }
  }
}
```

---

### Story 4.2: Implement Simple Product Generator

**As a** developer
**I want** simple products created in WooCommerce
**So that** basic products are available for testing

**Status:** `[x]` Completed
**Points:** 5
**Priority:** P0

**Acceptance Criteria:**
- [x] Simple products created using batch API (100 per batch)
- [x] All fields mapped correctly (price, stock, images, etc.)
- [x] Generator meta field added
- [x] Product IDs stored for grouped product references
- [x] Progress events yielded

**Files to Create:**
- `apps/test-generator/src/lib/simple-product-generator.ts`

---

### Story 4.3: Implement Variable Product Generator

**As a** developer
**I want** variable products created in WooCommerce
**So that** products with variations are available for testing

**Status:** `[x]` Completed
**Points:** 8
**Priority:** P0

**Acceptance Criteria:**
- [x] Parent variable products created first
- [x] Attributes defined on parent product
- [x] Product ID captured for variation creation
- [x] Generator meta field added
- [x] Progress events yielded

**Files to Create:**
- `apps/test-generator/src/lib/variable-product-generator.ts`

---

### Story 4.4: Implement Variation Generator

**As a** developer
**I want** product variations created in WooCommerce
**So that** variable products have all their options

**Status:** `[x]` Completed
**Points:** 8
**Priority:** P0

**Acceptance Criteria:**
- [x] Variations created using batch API (100 per batch)
- [x] Each variation linked to correct parent product
- [x] Attribute combinations correctly assigned
- [x] Individual variation data (price, stock, images) applied
- [x] Generator meta field added
- [x] Progress events yielded

**Technical Notes:**
- ~1800 total variations across 270 variable products
- Average ~7 variations per product
- Some products have 80+ variations (stress test)

---

### Story 4.5: Implement Grouped Product Generator

**As a** developer
**I want** grouped products created in WooCommerce
**So that** product bundles are available for testing

**Status:** `[x]` Completed
**Points:** 5
**Priority:** P0

**Acceptance Criteria:**
- [x] Grouped products created after all children exist
- [x] `grouped_products` array contains correct WooCommerce IDs
- [x] Children referenced by SKU, mapped to WooCommerce ID
- [x] Generator meta field added
- [x] Progress events yielded

**Implementation:**
```typescript
async createGroupedProduct(definition: GroupedProductDefinition) {
  const childIds = definition.groupedProductSkus.map(
    sku => this.productIdMap.get(sku)
  );

  return this.wooClient.createProduct({
    type: 'grouped',
    grouped_products: childIds,
    // ... other fields
  });
}
```

---

### Story 4.6: Implement Main Generator Orchestrator

**As a** developer
**I want** a main orchestrator that coordinates all generators
**So that** the entire generation process is managed

**Status:** `[x]` Completed
**Points:** 5
**Priority:** P0

**Acceptance Criteria:**
- [x] Orchestrates all generators in correct order
- [x] Passes shared state (ID maps) between generators
- [x] Aggregates progress events
- [x] Implements fail-fast on any error
- [x] Emits completion event with summary

**Files to Create:**
- `apps/test-generator/src/lib/product-generator.ts`

**Implementation:**
```typescript
export class ProductGenerator {
  async *generate(): AsyncGenerator<GeneratorEvent> {
    try {
      // Phase 1: Categories
      yield* this.categoryGenerator.generate();

      // Phase 2: Simple products
      yield* this.simpleGenerator.generate();

      // Phase 3: Variable products
      yield* this.variableGenerator.generate();

      // Phase 4: Variations
      yield* this.variationGenerator.generate();

      // Phase 5: Grouped products
      yield* this.groupedGenerator.generate();

      // Complete
      yield { type: 'complete', summary: this.buildSummary() };

    } catch (error) {
      yield { type: 'error', error: formatError(error) };
    }
  }
}
```

---

### Story 4.7: Implement Generate API Endpoint

**As a** user
**I want** to trigger product generation via API
**So that** the frontend can start and monitor generation

**Status:** `[x]` Completed
**Points:** 3
**Priority:** P0

**Acceptance Criteria:**
- [x] `POST /api/generate` endpoint created
- [x] Session credentials used to create WooClient
- [x] SSE stream for progress events
- [x] Heartbeat event sent every 30 seconds to keep connection alive
- [x] Proper error responses for unauthorized/invalid requests

**Files to Create:**
- `apps/test-generator/src/app/api/generate/route.ts`

**SSE Implementation with Heartbeat:**
```typescript
const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.consumerKey) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const generator = new ProductGenerator(wooClient);

      // Set up heartbeat
      const heartbeatInterval = setInterval(() => {
        const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`;
        controller.enqueue(encoder.encode(heartbeat));
      }, HEARTBEAT_INTERVAL_MS);

      try {
        for await (const event of generator.generate()) {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      } finally {
        clearInterval(heartbeatInterval);
      }

      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
```

---

### Story 4.8: Implement Placeholder Image Generation

**As a** developer
**I want** placeholder images generated for products
**So that** products have visual representation

**Status:** `[x]` Completed
**Points:** 3
**Priority:** P0

**Acceptance Criteria:**
- [x] Placeholder URLs generated per category
- [x] SKU displayed on placeholder
- [x] Multiple images for products with galleries
- [x] Consistent sizing (800x800 main, 300x300 thumbnail)

**Files to Create:**
- `apps/test-generator/src/lib/placeholder-images.ts`

**Implementation:**
```typescript
const CATEGORY_COLORS = {
  't-shirts': 'E8E8E8',
  'hoodies': 'D0D0D0',
  // ...
};

export function getPlaceholderUrl(
  sku: string,
  category: string,
  size = '800x800'
): string {
  const color = CATEGORY_COLORS[category] || 'CCCCCC';
  const text = encodeURIComponent(sku);
  return `https://via.placeholder.com/${size}/${color}/333333?text=${text}`;
}
```

---

## Epic 5: User Interface

**Goal:** Build the React UI for the test generator.

**Dependencies:** Epic 4 (API endpoints ready)

**Acceptance Criteria:**
- [x] Single-page application
- [x] Clear state transitions
- [x] Real-time progress display
- [x] Error states handled gracefully
- [x] Matches ProductSync visual style

---

### Story 5.1: Implement Main Page Layout

**As a** user
**I want** a clean, single-page interface
**So that** I can easily use the tool

**Status:** `[x]` Completed
**Points:** 3
**Priority:** P1

**Acceptance Criteria:**
- [x] Header with logo/title
- [x] Centered content card
- [x] Footer with attribution
- [x] Responsive design (mobile-first)
- [x] Matches ProductSync styling

**Files to Create/Modify:**
- `apps/test-generator/src/app/page.tsx`
- `apps/test-generator/src/app/layout.tsx`
- `apps/test-generator/src/app/globals.css`

---

### Story 5.2: Implement Connect Form Component

**As a** user
**I want** to enter my WooCommerce store URL
**So that** I can connect my store

**Status:** `[x]` Completed
**Points:** 3
**Priority:** P1

**Acceptance Criteria:**
- [x] URL input with validation
- [x] Connect button
- [x] Loading state during OAuth initiation
- [x] Error display for invalid URLs
- [x] Redirect to WooCommerce on success

**Files to Create:**
- `apps/test-generator/src/components/ConnectForm.tsx`

---

### Story 5.3: Implement Connected State Component

**As a** user
**I want** to see my connection status after OAuth
**So that** I know I'm connected and can generate products

**Status:** `[x]` Completed
**Points:** 3
**Priority:** P1

**Acceptance Criteria:**
- [x] Shows connected store URL
- [x] Shows store info (currency, units)
- [x] Generate Products button
- [x] Disconnect button visible
- [x] Disconnect button clears session and returns to initial (Connect) state
- [x] Disconnect calls API to clear session cookie
- [x] Product count preview (shows "~500 products will be generated")

**Files to Create:**
- `apps/test-generator/src/components/ConnectedState.tsx`

**Disconnect Implementation:**
```typescript
async function handleDisconnect() {
  await fetch('/api/oauth/disconnect', { method: 'POST' });
  // Reset to initial state
  setConnectionState('disconnected');
}
```

---

### Story 5.4: Implement Progress Display Component

**As a** user
**I want** to see generation progress
**So that** I know the tool is working

**Status:** `[x]` Completed
**Points:** 5
**Priority:** P1

**Acceptance Criteria:**
- [x] Overall progress bar
- [x] Current phase indicator
- [x] Product count (created / total)
- [x] Current product being created
- [x] Breakdown by product type
- [x] Real-time updates via SSE
- [x] Handle heartbeat events (ignore for UI, use for connection health)
- [x] Auto-reconnect if SSE connection drops unexpectedly
- [x] Show reconnection status to user if reconnecting

**Files to Create:**
- `apps/test-generator/src/components/GenerateProgress.tsx`
- `apps/test-generator/src/hooks/useSSE.ts`

**SSE Hook with Reconnection:**
```typescript
export function useSSE<T>(url: string) {
  const [events, setEvents] = useState<T[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    let eventSource: EventSource;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 3;

    const connect = () => {
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsConnected(true);
        setIsReconnecting(false);
        reconnectAttempts = 0;
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsConnected(false);

        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          setIsReconnecting(true);
          reconnectAttempts++;
          setTimeout(connect, 1000 * reconnectAttempts);
        }
      };

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type !== 'heartbeat') {
          setEvents(prev => [...prev, data]);
        }
      };
    };

    connect();
    return () => eventSource?.close();
  }, [url]);

  return { events, isConnected, isReconnecting };
}
```

---

### Story 5.5: Implement Completion Summary Component

**As a** user
**I want** to see a summary after generation
**So that** I know what was created

**Status:** `[x]` Completed
**Points:** 3
**Priority:** P1

**Acceptance Criteria:**
- [x] Success message
- [x] Total products created
- [x] Breakdown by type
- [x] Categories created count
- [x] Duration
- [x] View in WooCommerce button
- [x] Cleanup button

**Files to Create:**
- `apps/test-generator/src/components/CompletionSummary.tsx`

---

### Story 5.6: Implement Error Display Component

**As a** user
**I want** to see clear error messages
**So that** I understand what went wrong

**Status:** `[x]` Completed
**Points:** 2
**Priority:** P1

**Acceptance Criteria:**
- [x] Error message displayed prominently
- [x] Error code shown
- [x] Phase where error occurred
- [x] Product SKU if applicable
- [x] Retry option
- [x] Return to start option

**Files to Create:**
- `apps/test-generator/src/components/ErrorDisplay.tsx`

---

### Story 5.7: Implement UI Components Library

**As a** developer
**I want** reusable UI components
**So that** the interface is consistent

**Status:** `[x]` Completed
**Points:** 5
**Priority:** P1

**Acceptance Criteria:**
- [x] Button component (primary, secondary, danger variants)
- [x] Card component
- [x] ProgressBar component
- [x] Alert component (success, error, warning)
- [x] Input component with validation
- [x] Loading spinner

**Files to Create:**
- `apps/test-generator/src/components/ui/Button.tsx`
- `apps/test-generator/src/components/ui/Card.tsx`
- `apps/test-generator/src/components/ui/ProgressBar.tsx`
- `apps/test-generator/src/components/ui/Alert.tsx`
- `apps/test-generator/src/components/ui/Input.tsx`
- `apps/test-generator/src/components/ui/Spinner.tsx`
- `apps/test-generator/src/components/ui/index.ts`

---

## Epic 6: Cleanup Functionality

**Goal:** Implement the ability to remove all generated products.

**Dependencies:** Epic 4 (Generator meta fields), Epic 5 (UI)

**Acceptance Criteria:**
- [x] Find all products with generator meta field
- [x] Delete products in batches
- [x] Delete generated categories
- [x] Progress tracking during cleanup
- [x] Confirmation before deletion

---

### Story 6.1: Implement Cleanup Service

**As a** developer
**I want** a service to find and delete generated products
**So that** users can clean up after testing

**Status:** `[x]` Completed
**Points:** 5
**Priority:** P1

**Acceptance Criteria:**
- [x] Query products by meta field `_generated_by`
- [x] Paginate through all matching products
- [x] Delete products in batches
- [x] Query and delete generated categories
- [x] **Delete categories in reverse hierarchy order** (children before parents to avoid WooCommerce foreign key errors)
- [x] Progress events yielded

**Files to Create:**
- `apps/test-generator/src/lib/cleanup-service.ts`

**Implementation:**
```typescript
export class CleanupService {
  async *cleanup(): AsyncGenerator<CleanupEvent> {
    // Find all generated products
    yield { type: 'progress', phase: 'finding', ... };
    const products = await this.findGeneratedProducts();

    // Delete products in batches
    yield { type: 'progress', phase: 'deleting-products', ... };
    for (const batch of chunk(products, 100)) {
      await this.wooClient.deleteProductsBatch(batch.map(p => p.id));
      yield { type: 'progress', ... };
    }

    // Find and delete categories in reverse hierarchy order
    yield { type: 'progress', phase: 'deleting-categories', ... };
    const categories = await this.findGeneratedCategories();
    const sortedCategories = this.sortByHierarchyDepth(categories, 'desc');
    // Delete children first (deepest level), then parents
    for (const category of sortedCategories) {
      await this.wooClient.deleteCategory(category.id);
      yield { type: 'progress', ... };
    }

    yield { type: 'complete', ... };
  }

  // Sort categories by depth: 'desc' = deepest first (for deletion)
  private sortByHierarchyDepth(
    categories: WooCategory[],
    order: 'asc' | 'desc'
  ): WooCategory[] {
    const depthMap = new Map<number, number>();
    const parentMap = new Map(categories.map(c => [c.id, c.parent]));

    const getDepth = (id: number): number => {
      if (depthMap.has(id)) return depthMap.get(id)!;
      const parentId = parentMap.get(id);
      if (!parentId || parentId === 0) return (depthMap.set(id, 0), 0);
      const depth = getDepth(parentId) + 1;
      return (depthMap.set(id, depth), depth);
    };

    categories.forEach(c => getDepth(c.id));
    return [...categories].sort((a, b) => {
      const diff = (depthMap.get(b.id) || 0) - (depthMap.get(a.id) || 0);
      return order === 'desc' ? diff : -diff;
    });
  }
}
```

---

### Story 6.2: Implement Cleanup API Endpoint

**As a** user
**I want** to trigger cleanup via API
**So that** the frontend can manage cleanup

**Status:** `[x]` Completed
**Points:** 3
**Priority:** P1

**Acceptance Criteria:**
- [x] `POST /api/cleanup` endpoint created
- [x] SSE stream for progress events
- [x] Requires valid session
- [x] Returns summary on completion

**Files to Create:**
- `apps/test-generator/src/app/api/cleanup/route.ts`

---

### Story 6.3: Implement Cleanup Confirmation Component

**As a** user
**I want** to confirm before deleting products
**So that** I don't accidentally delete data

**Status:** `[x]` Completed
**Points:** 3
**Priority:** P1

**Acceptance Criteria:**
- [x] Warning message displayed
- [x] Count of products to be deleted
- [x] Explanation of what will be deleted
- [x] Assurance that other products are safe
- [x] Cancel and Delete buttons
- [x] Delete button requires confirmation

**Files to Create:**
- `apps/test-generator/src/components/CleanupConfirm.tsx`

---

### Story 6.4: Implement Cleanup Progress Component

**As a** user
**I want** to see cleanup progress
**So that** I know deletion is working

**Status:** `[x]` Completed
**Points:** 5
**Priority:** P1

**Acceptance Criteria:**
- [x] Progress bar
- [x] Current phase (finding, deleting products, deleting categories)
- [x] Count deleted
- [x] Completion summary

**Files to Create:**
- `apps/test-generator/src/components/CleanupProgress.tsx`

---

## Epic 7: Testing & Quality Assurance

**Goal:** Ensure the application is reliable and bug-free.

**Dependencies:** All other epics

**Acceptance Criteria:**
- [ ] Unit tests for utilities and data transforms
- [ ] Integration tests for API routes
- [ ] E2E tests for critical flows
- [ ] Manual testing checklist completed

---

### Story 7.1: Set Up Testing Infrastructure

**As a** developer
**I want** testing tools configured
**So that** I can write and run tests

**Status:** `[ ]` Not Started
**Points:** 3
**Priority:** P2

**Acceptance Criteria:**
- [ ] Vitest configured for unit/integration tests
- [ ] React Testing Library configured
- [ ] MSW configured for API mocking
- [ ] Test scripts in package.json
- [ ] CI-friendly configuration

**Files to Create:**
- `apps/test-generator/vitest.config.ts`
- `apps/test-generator/src/test/setup.ts`
- `apps/test-generator/src/test/mocks/handlers.ts`

---

### Story 7.2: Write Unit Tests for Data Utilities

**As a** developer
**I want** unit tests for data utilities
**So that** product data is transformed correctly

**Status:** `[ ]` Not Started
**Points:** 3
**Priority:** P2

**Acceptance Criteria:**
- [ ] Placeholder image URL generation tested
- [ ] Category hierarchy sorting tested
- [ ] Product data transformation tested
- [ ] SKU generation tested

**Files to Create:**
- `apps/test-generator/src/lib/__tests__/placeholder-images.test.ts`
- `apps/test-generator/src/lib/__tests__/category-generator.test.ts`

---

### Story 7.3: Write Integration Tests for API Routes

**As a** developer
**I want** integration tests for API routes
**So that** endpoints work correctly

**Status:** `[ ]` Not Started
**Points:** 5
**Priority:** P2

**Acceptance Criteria:**
- [ ] OAuth initiate tested with valid/invalid URLs
- [ ] OAuth callback tested
- [ ] Status endpoint tested
- [ ] Generate endpoint tested (mocked WooCommerce)
- [ ] Cleanup endpoint tested (mocked WooCommerce)

**Files to Create:**
- `apps/test-generator/src/app/api/__tests__/oauth.test.ts`
- `apps/test-generator/src/app/api/__tests__/generate.test.ts`
- `apps/test-generator/src/app/api/__tests__/cleanup.test.ts`

---

### Story 7.4: Write E2E Tests for Critical Flows

**As a** developer
**I want** E2E tests for critical user flows
**So that** the application works end-to-end

**Status:** `[ ]` Not Started
**Points:** 5
**Priority:** P2

**Acceptance Criteria:**
- [ ] Playwright configured
- [ ] Connection flow tested (with mocked WooCommerce)
- [ ] Generation flow tested
- [ ] Cleanup flow tested
- [ ] Error handling tested

**Files to Create:**
- `apps/test-generator/playwright.config.ts`
- `apps/test-generator/e2e/connect.spec.ts`
- `apps/test-generator/e2e/generate.spec.ts`
- `apps/test-generator/e2e/cleanup.spec.ts`

---

### Story 7.5: Create Manual Testing Checklist

**As a** QA tester
**I want** a testing checklist
**So that** I can verify all functionality

**Status:** `[ ]` Not Started
**Points:** 2
**Priority:** P2

**Acceptance Criteria:**
- [ ] Pre-deployment checklist created
- [ ] All user flows documented
- [ ] Edge cases listed
- [ ] Browser compatibility noted
- [ ] Mobile responsiveness checks

**Files to Create:**
- `apps/test-generator/TESTING.md`

**Checklist Categories:**
1. Connection flow
2. Generation flow
3. Progress display
4. Completion summary
5. Cleanup flow
6. Error handling
7. Session expiration
8. Browser compatibility
9. Mobile responsiveness

---

## Implementation Order

### Phase 1: Foundation (Stories: 8, Points: 23)
**Goal:** Project setup and infrastructure

| Order | Story | Points | Dependencies |
|-------|-------|--------|--------------|
| 1 | 1.1 Initialize Next.js | 3 | None |
| 2 | 1.2 Configure Monorepo | 2 | 1.1 |
| 3 | 1.3 Environment Config | 2 | 1.1 |
| 4 | 1.4 Railway Config | 3 | 1.1 |
| 5 | 1.5 Directory Structure | 3 | 1.1 |
| 6 | 1.6 Type Definitions | 5 | 1.5 |
| 7 | 2.1 Session Management | 5 | 1.6 |

### Phase 2: OAuth & Connection (Stories: 4, Points: 16)
**Goal:** WooCommerce authentication working

| Order | Story | Points | Dependencies |
|-------|-------|--------|--------------|
| 8 | 2.5 WooCommerce Client | 3 | 2.1 |
| 9 | 2.2 OAuth Initiate | 5 | 2.5 |
| 10 | 2.3 OAuth Callback | 5 | 2.5 |
| 11 | 2.4 Status Endpoint | 3 | 2.1 |

### Phase 3: Product Data (Stories: 6, Points: 26)
**Goal:** All product definitions complete

| Order | Story | Points | Dependencies |
|-------|-------|--------|--------------|
| 12 | 3.1 Category Data | 2 | 1.6 |
| 13 | 3.2 Brand Data | 1 | 1.6 |
| 14 | 3.3 Tops Products | 8 | 3.1, 3.2 |
| 15 | 3.4 Bottoms Products | 5 | 3.1, 3.2 |
| 16 | 3.5 Footwear Products | 5 | 3.1, 3.2 |
| 17 | 3.6 Accessories Products | 5 | 3.1, 3.2 |

### Phase 4: Generation Engine (Stories: 8, Points: 42)
**Goal:** Product generation working

| Order | Story | Points | Dependencies |
|-------|-------|--------|--------------|
| 18 | 4.8 Placeholder Images | 3 | 1.6 |
| 19 | 4.1 Category Generator | 5 | 2.5, 3.1 |
| 20 | 4.2 Simple Product Gen | 5 | 2.5, 3.3-3.6 |
| 21 | 4.3 Variable Product Gen | 8 | 4.2 |
| 22 | 4.4 Variation Generator | 8 | 4.3 |
| 23 | 4.5 Grouped Product Gen | 5 | 4.2 |
| 24 | 4.6 Main Orchestrator | 5 | 4.1-4.5 |
| 25 | 4.7 Generate Endpoint | 3 | 4.6 |

### Phase 5: User Interface (Stories: 7, Points: 24)
**Goal:** UI complete and functional

| Order | Story | Points | Dependencies |
|-------|-------|--------|--------------|
| 26 | 5.7 UI Components | 5 | 1.1 |
| 27 | 5.1 Main Page Layout | 3 | 5.7 |
| 28 | 5.2 Connect Form | 3 | 5.7, 2.2 |
| 29 | 5.3 Connected State | 3 | 5.7, 2.4 |
| 30 | 5.4 Progress Display | 5 | 5.7, 4.7 |
| 31 | 5.5 Completion Summary | 3 | 5.7 |
| 32 | 5.6 Error Display | 2 | 5.7 |

### Phase 6: Cleanup (Stories: 4, Points: 16)
**Goal:** Cleanup functionality complete

| Order | Story | Points | Dependencies |
|-------|-------|--------|--------------|
| 33 | 6.1 Cleanup Service | 5 | 2.5 |
| 34 | 6.2 Cleanup Endpoint | 3 | 6.1 |
| 35 | 6.3 Cleanup Confirm | 3 | 5.7 |
| 36 | 6.4 Cleanup Progress | 5 | 5.7, 6.2 |

### Phase 7: Testing (Stories: 5, Points: 18)
**Goal:** Quality assurance complete

| Order | Story | Points | Dependencies |
|-------|-------|--------|--------------|
| 37 | 7.1 Testing Setup | 3 | 1.1 |
| 38 | 7.2 Unit Tests | 3 | 4.8, 4.1 |
| 39 | 7.3 Integration Tests | 5 | All API routes |
| 40 | 7.4 E2E Tests | 5 | All UI |
| 41 | 7.5 Testing Checklist | 2 | All |

---

## Sprint Suggestions

### Sprint 1: Foundation & OAuth (13 stories, ~44 points)
- All of Phase 1
- All of Phase 2
- Stories 3.1, 3.2

### Sprint 2: Product Data & Generation (14 stories, ~55 points)
- Stories 3.3-3.6
- All of Phase 4

### Sprint 3: UI & Cleanup (11 stories, ~40 points)
- All of Phase 5
- All of Phase 6

### Sprint 4: Testing & Polish (5 stories, ~18 points)
- All of Phase 7
- Bug fixes and polish

---

## Appendix: Story Template

```markdown
### Story X.X: [Title]

**As a** [persona]
**I want** [feature]
**So that** [benefit]

**Status:** `[ ]` Not Started
**Points:** X
**Priority:** PX

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

**Technical Notes:**
[Implementation details, code snippets, etc.]

**Files to Create/Modify:**
- `path/to/file.ts`

**Dependencies:**
- Story X.X
```

---

**End of Document**
