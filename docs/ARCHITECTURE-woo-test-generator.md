# Architecture Document
# WooCommerce Test Data Generator

**Version:** 1.0
**Date:** January 11, 2026
**Author:** Architect Agent
**Status:** Draft
**Related PRD:** [PRD-woo-test-generator.md](./PRD-woo-test-generator.md)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Decisions](#2-architecture-decisions)
3. [System Architecture](#3-system-architecture)
4. [Component Design](#4-component-design)
5. [Data Flow](#5-data-flow)
6. [API Specification](#6-api-specification)
7. [Data Models](#7-data-models)
8. [Security Architecture](#8-security-architecture)
9. [Error Handling](#9-error-handling)
10. [Performance Considerations](#10-performance-considerations)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Development Guidelines](#12-development-guidelines)

---

## 1. Overview

### 1.1 Purpose

This document defines the technical architecture for the **WooCommerce Test Data Generator**, a developer tool that populates WooCommerce stores with ~500 test products to validate ProductSync field mappings.

### 1.2 Scope

- Full-stack Next.js application within ProductSync monorepo
- Stateless architecture with session-based credential storage
- WooCommerce REST API integration via OAuth
- Real-time progress tracking via Server-Sent Events

### 1.3 Key Constraints

| Constraint | Impact |
|------------|--------|
| Stateless | No database, credentials in encrypted session |
| Single store | One WooCommerce connection per session |
| Stop on error | No partial recovery, fail fast |
| Monorepo | Must integrate with existing ProductSync structure |

---

## 2. Architecture Decisions

### ADR-001: Full-Stack Next.js Application

**Decision:** Use Next.js 14 with App Router as a single full-stack application.

**Context:** Need a simple deployment model that handles both UI and API.

**Alternatives Considered:**
1. Separate React frontend + Express backend (like ProductSync)
2. Static site + serverless functions
3. Full-stack Next.js (chosen)

**Rationale:**
- Simpler deployment (single service)
- API routes for backend logic
- Shared types between frontend and backend
- No need for separate API server for this tool's scope

**Consequences:**
- (+) Single deployment unit
- (+) Shared code/types
- (-) Less separation of concerns than ProductSync main app

---

### ADR-002: Stateless Session Architecture

**Decision:** Store WooCommerce credentials in encrypted HTTP-only cookies using `iron-session`.

**Context:** PRD specifies stateless architecture, no database.

**Alternatives Considered:**
1. Database storage (like ProductSync)
2. LocalStorage (insecure)
3. Encrypted cookies (chosen)

**Rationale:**
- No database dependency
- Credentials encrypted at rest
- Automatic expiration
- HTTP-only prevents XSS access

**Consequences:**
- (+) No database required
- (+) Secure credential storage
- (-) Session limited to cookie size (~4KB, sufficient)
- (-) Credentials lost on cookie expiration

**Session Configuration:**
```typescript
{
  password: process.env.SESSION_SECRET, // 32+ chars
  cookieName: 'woo-test-gen-session',
  ttl: 3600, // 1 hour
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}
```

---

### ADR-003: Server-Sent Events for Progress

**Decision:** Use SSE for real-time progress updates during generation and cleanup.

**Context:** Need to show progress for long-running operations (500 products).

**Alternatives Considered:**
1. Polling (inefficient)
2. WebSockets (overkill)
3. Server-Sent Events (chosen)

**Rationale:**
- Native browser support
- Unidirectional (server to client) is sufficient
- Simpler than WebSockets
- Auto-reconnect built-in

**Consequences:**
- (+) Real-time updates
- (+) Simple implementation
- (-) One-way communication only (sufficient for our use case)

---

### ADR-004: Product Catalog as Static Data

**Decision:** Define all 500 products as static TypeScript data structures.

**Context:** Products are predetermined, no customization needed.

**Alternatives Considered:**
1. JSON configuration files
2. Database seeding
3. TypeScript static data (chosen)

**Rationale:**
- Type safety for product definitions
- No runtime parsing needed
- IDE autocomplete and validation
- Easy to maintain and extend

**Consequences:**
- (+) Type-safe product definitions
- (+) Compile-time validation
- (-) Bundle size includes all products (~50KB gzipped)

---

### ADR-005: WooCommerce API Batching Strategy

**Decision:** Use WooCommerce Batch API with groups of 100 products.

**Context:** Creating 500 products individually would be too slow.

**Alternatives Considered:**
1. Individual API calls (500 calls)
2. Batch API 100 at a time (chosen)
3. Maximum batch size (varies by server)

**Rationale:**
- WooCommerce batch API supports up to 100 items
- Reduces API calls from 500 to ~5 for simple products
- Balance between speed and reliability

**Consequences:**
- (+) ~10x faster than individual calls
- (+) Within WooCommerce limits
- (-) Batch failure affects up to 100 products

---

### ADR-006: Category Creation Strategy

**Decision:** Create categories first, then products, with category ID mapping.

**Context:** Products reference categories by ID, categories must exist first.

**Approach:**
1. Create parent categories (Apparel, Tops, Bottoms, etc.)
2. Create child categories with parent references
3. Store ID mapping for product creation
4. Products reference category IDs

**Consequences:**
- (+) Proper hierarchy maintained
- (+) Products correctly categorized
- (-) Requires category ID tracking in memory

---

### ADR-007: Variation Creation Strategy

**Decision:** Create variable products first, then add variations in batches.

**Context:** WooCommerce requires parent product to exist before variations.

**Approach:**
1. Create variable product (parent)
2. Define attributes on parent
3. Create variations referencing parent ID
4. Use batch API for variations (up to 100 per call)

**Consequences:**
- (+) Follows WooCommerce API requirements
- (+) Efficient batch creation
- (-) Two-step process for variable products

---

### ADR-008: Grouped Product Creation Strategy

**Decision:** Create child products first, then grouped product with references.

**Context:** Grouped products reference existing products by ID.

**Approach:**
1. Identify products that will be grouped children
2. Create simple/variable products first
3. Create grouped product with `grouped_products` array
4. Reference children by WooCommerce product IDs

**Consequences:**
- (+) Correct product relationships
- (-) Requires careful ordering of product creation

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     React Application                            │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │    │
│  │  │ ConnectForm  │  │ProgressView  │  │    CleanupView       │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS APPLICATION                              │
│                         (Railway Service)                                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        API Routes                                │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌─────────────────┐   │    │
│  │  │ /api/oauth/*   │  │ /api/generate  │  │ /api/cleanup    │   │    │
│  │  └────────────────┘  └────────────────┘  └─────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        Core Libraries                            │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌─────────────────┐   │    │
│  │  │ WooClient      │  │ ProductGen     │  │ Session         │   │    │
│  │  └────────────────┘  └────────────────┘  └─────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        Static Data                               │    │
│  │  ┌────────────────────────────────────────────────────────────┐ │    │
│  │  │              Product Catalog (500 products)                 │ │    │
│  │  └────────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS (WooCommerce REST API)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        WOOCOMMERCE STORE                                 │
│                        (User's Store)                                    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  /wc-auth/v1/authorize    OAuth Authorization                   │    │
│  │  /wp-json/wc/v3/*         REST API Endpoints                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Monorepo Integration

```
ProductSynch/
├── apps/
│   ├── api/                          # Existing: ProductSync API
│   ├── web/                          # Existing: ProductSync Web
│   └── test-generator/               # NEW: Test Data Generator
│       ├── src/
│       │   ├── app/                  # Next.js App Router
│       │   │   ├── page.tsx          # Main page component
│       │   │   ├── layout.tsx        # Root layout
│       │   │   ├── globals.css       # Global styles
│       │   │   └── api/              # API routes
│       │   │       ├── oauth/
│       │   │       │   ├── initiate/route.ts
│       │   │       │   └── callback/route.ts
│       │   │       ├── generate/route.ts
│       │   │       ├── cleanup/route.ts
│       │   │       └── status/route.ts
│       │   ├── components/           # React components
│       │   │   ├── ConnectForm.tsx
│       │   │   ├── ConnectedState.tsx
│       │   │   ├── GenerateProgress.tsx
│       │   │   ├── CompletionSummary.tsx
│       │   │   ├── CleanupConfirm.tsx
│       │   │   └── ui/               # Shared UI components
│       │   │       ├── Button.tsx
│       │   │       ├── Card.tsx
│       │   │       ├── ProgressBar.tsx
│       │   │       └── Alert.tsx
│       │   ├── lib/                  # Core libraries
│       │   │   ├── woo-client.ts     # WooCommerce API wrapper
│       │   │   ├── product-generator.ts
│       │   │   ├── category-generator.ts
│       │   │   ├── cleanup-service.ts
│       │   │   ├── session.ts        # iron-session config
│       │   │   └── constants.ts
│       │   ├── data/                 # Static product data
│       │   │   ├── index.ts          # Main export
│       │   │   ├── categories.ts     # Category definitions
│       │   │   ├── brands.ts         # Brand definitions
│       │   │   ├── products/         # Product definitions by category
│       │   │   │   ├── t-shirts.ts
│       │   │   │   ├── hoodies.ts
│       │   │   │   ├── jackets.ts
│       │   │   │   ├── pants.ts
│       │   │   │   ├── shorts.ts
│       │   │   │   ├── sneakers.ts
│       │   │   │   ├── boots.ts
│       │   │   │   ├── sandals.ts
│       │   │   │   ├── hats.ts
│       │   │   │   ├── bags.ts
│       │   │   │   └── belts.ts
│       │   │   └── edge-cases.ts     # Edge case configurations
│       │   ├── types/                # TypeScript types
│       │   │   ├── index.ts
│       │   │   ├── product.ts
│       │   │   ├── session.ts
│       │   │   └── woocommerce.ts
│       │   └── hooks/                # React hooks
│       │       ├── useSession.ts
│       │       └── useSSE.ts
│       ├── public/
│       │   └── favicon.ico
│       ├── package.json
│       ├── next.config.js
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── railway.toml
├── packages/
│   └── shared/                       # Existing: Shared types
└── package.json                      # Root package.json
```

---

## 4. Component Design

### 4.1 Frontend Components

#### Component Hierarchy

```
App (layout.tsx)
└── MainPage (page.tsx)
    ├── Header
    │   └── Logo + Title
    ├── ContentArea
    │   ├── ConnectForm (initial state)
    │   │   ├── URLInput
    │   │   └── ConnectButton
    │   ├── ConnectedState (after OAuth)
    │   │   ├── StoreInfo
    │   │   └── GenerateButton
    │   ├── GenerateProgress (during generation)
    │   │   ├── ProgressBar
    │   │   ├── StatusText
    │   │   └── DetailedStats
    │   ├── CompletionSummary (after generation)
    │   │   ├── SuccessMessage
    │   │   ├── Statistics
    │   │   ├── ViewInWooButton
    │   │   └── CleanupButton
    │   └── CleanupConfirm (cleanup flow)
    │       ├── WarningMessage
    │       ├── CancelButton
    │       └── DeleteButton
    └── Footer
        └── Attribution
```

#### State Machine

```
┌─────────────┐
│   INITIAL   │ ─────────────────────────────────┐
└─────────────┘                                   │
       │                                          │
       │ Enter URL + Click Connect                │
       ▼                                          │
┌─────────────┐                                   │
│ CONNECTING  │ ─── OAuth Redirect ───────────►  │
└─────────────┘                                   │
       │                                          │
       │ OAuth Callback Success                   │
       ▼                                          │
┌─────────────┐                                   │
│  CONNECTED  │ ◄─────────────────────────────────┘
└─────────────┘         Disconnect
       │
       │ Click Generate
       ▼
┌─────────────┐
│ GENERATING  │ ─── Error ───► ERROR
└─────────────┘
       │
       │ Complete
       ▼
┌─────────────┐
│  COMPLETE   │
└─────────────┘
       │
       │ Click Cleanup
       ▼
┌─────────────┐
│  CLEANUP    │
│  CONFIRM    │
└─────────────┘
       │
       │ Confirm
       ▼
┌─────────────┐
│  CLEANING   │
└─────────────┘
       │
       │ Complete
       ▼
┌─────────────┐
│   CLEANED   │ ─── Generate Again ───► CONNECTED
└─────────────┘
```

### 4.2 Backend Components

#### WooClient (`lib/woo-client.ts`)

**Configuration:**
- API Timeout: 30 seconds per request (matches ProductSync)
- API Version: WooCommerce REST API v3
- Batch Size: Maximum 100 items per batch request

```typescript
// Configuration constants
const WOO_REQUEST_TIMEOUT_MS = 30000; // 30 seconds
const WOO_BATCH_SIZE = 100;
const WOO_RETRY_ATTEMPTS = 3;
const WOO_RETRY_DELAY_MS = 1000; // Exponential backoff base

class WooClient {
  private api: WooCommerceRestApi;

  constructor(storeUrl: string, consumerKey: string, consumerSecret: string);

  // Store operations
  async getStoreSettings(): Promise<StoreSettings>;
  async testConnection(): Promise<boolean>;

  // Category operations
  async createCategory(data: CategoryInput): Promise<Category>;
  async createCategoriesBatch(data: CategoryInput[]): Promise<Category[]>;
  async deleteCategory(id: number): Promise<void>;

  // Product operations
  async createProduct(data: ProductInput): Promise<Product>;
  async createProductsBatch(data: ProductInput[]): Promise<Product[]>;
  async createVariation(productId: number, data: VariationInput): Promise<Variation>;
  async createVariationsBatch(productId: number, data: VariationInput[]): Promise<Variation[]>;

  // Cleanup operations
  async getProductsByMeta(key: string, value: string): Promise<Product[]>;
  async deleteProduct(id: number, force: boolean): Promise<void>;
  async deleteProductsBatch(ids: number[]): Promise<void>;

  // Error handling with retry
  private async withRetry<T>(operation: () => Promise<T>): Promise<T>;
}
```

**Batch Error Handling Strategy:**

When a batch operation fails:
1. **Identify failure type:**
   - Network timeout → Retry entire batch (up to 3 attempts)
   - Rate limit (429) → Wait with exponential backoff, then retry
   - Partial failure → Log failed items, continue with remaining batches
   - Complete failure → Stop generation, report error

2. **Retry logic:**
```typescript
async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      if (isRateLimitError(error)) {
        await delay(WOO_RETRY_DELAY_MS * Math.pow(2, attempt));
      } else if (isNetworkError(error)) {
        await delay(WOO_RETRY_DELAY_MS * attempt);
      } else {
        throw error; // Don't retry validation errors
      }
    }
  }
}
```

#### ProductGenerator (`lib/product-generator.ts`)

```typescript
class ProductGenerator {
  private wooClient: WooClient;
  private categoryIdMap: Map<string, number>;
  private productIdMap: Map<string, number>;
  private brandAttributeId: number | null;  // pa_brand attribute ID
  private brandTermIdMap: Map<string, number>;  // Brand name -> term ID

  constructor(wooClient: WooClient);

  // Main generation flow
  async *generate(): AsyncGenerator<ProgressEvent>;

  // Phase 1: Brands (pa_brand taxonomy and terms)
  private async createBrands(): Promise<void>;

  // Phase 2: Categories
  private async createCategories(): Promise<void>;

  // Phase 3: Simple products
  private async createSimpleProducts(): Promise<void>;

  // Phase 4: Variable products + variations
  private async createVariableProducts(): Promise<void>;

  // Phase 5: Grouped products
  private async createGroupedProducts(): Promise<void>;

  // Helpers
  private buildProductData(definition: ProductDefinition): ProductInput;
  private buildVariationData(definition: VariationDefinition): VariationInput;
  private buildBrandFields(brand: string, storageMethod: BrandStorageMethod): BrandFields;
}
```

#### CleanupService (`lib/cleanup-service.ts`)

```typescript
class CleanupService {
  private wooClient: WooClient;

  constructor(wooClient: WooClient);

  // Main cleanup flow
  async *cleanup(): AsyncGenerator<ProgressEvent>;

  // Find generated products
  private async findGeneratedProducts(): Promise<Product[]>;

  // Find generated categories
  private async findGeneratedCategories(): Promise<Category[]>;

  // Delete operations
  private async deleteProducts(ids: number[]): Promise<void>;
  private async deleteCategories(ids: number[]): Promise<void>;

  // Sort categories for deletion (children first)
  private sortCategoriesForDeletion(categories: Category[]): Category[];
}
```

**Category Deletion Order:**

Categories must be deleted in **reverse hierarchy order** (children before parents) to avoid foreign key constraint errors:

```typescript
// Deletion order for our category structure:
// 1. Leaf categories: T-Shirts, Hoodies, Jackets, Pants, Shorts,
//                     Sneakers, Boots, Sandals, Hats, Bags, Belts
// 2. Parent categories: Tops, Bottoms, Footwear, Accessories
// 3. Root category: Apparel

private sortCategoriesForDeletion(categories: Category[]): Category[] {
  // Sort by depth (deepest first)
  return categories.sort((a, b) => {
    const depthA = this.getCategoryDepth(a);
    const depthB = this.getCategoryDepth(b);
    return depthB - depthA; // Deepest first
  });
}
```

---

## 5. Data Flow

### 5.1 OAuth Flow

```
┌──────────┐      ┌──────────────┐      ┌─────────────────┐
│  Browser │      │  Test Gen    │      │  WooCommerce    │
│          │      │  Server      │      │  Store          │
└────┬─────┘      └──────┬───────┘      └────────┬────────┘
     │                   │                       │
     │ 1. POST /api/oauth/initiate              │
     │   { storeUrl }    │                       │
     │──────────────────►│                       │
     │                   │                       │
     │ 2. Build OAuth URL│                       │
     │   Store URL in    │                       │
     │   session         │                       │
     │◄──────────────────│                       │
     │ { authUrl }       │                       │
     │                   │                       │
     │ 3. Redirect to WooCommerce               │
     │──────────────────────────────────────────►│
     │                   │                       │
     │                   │    4. User approves   │
     │                   │       connection      │
     │                   │                       │
     │                   │ 5. POST callback with │
     │                   │    credentials        │
     │                   │◄──────────────────────│
     │                   │                       │
     │                   │ 6. Store credentials  │
     │                   │    in session         │
     │                   │                       │
     │ 7. Redirect to app│                       │
     │   with success    │                       │
     │◄──────────────────│                       │
     │                   │                       │
```

### 5.2 Generation Flow

```
┌──────────┐      ┌──────────────┐      ┌─────────────────┐
│  Browser │      │  Test Gen    │      │  WooCommerce    │
│          │      │  Server      │      │  Store          │
└────┬─────┘      └──────┬───────┘      └────────┬────────┘
     │                   │                       │
     │ 1. POST /api/generate                    │
     │   (SSE connection)│                       │
     │──────────────────►│                       │
     │                   │                       │
     │                   │ 2. Create categories  │
     │                   │──────────────────────►│
     │                   │◄──────────────────────│
     │ 3. SSE: progress  │                       │
     │◄──────────────────│                       │
     │                   │                       │
     │                   │ 4. Create simple      │
     │                   │    products (batch)   │
     │                   │──────────────────────►│
     │                   │◄──────────────────────│
     │ 5. SSE: progress  │                       │
     │◄──────────────────│                       │
     │                   │                       │
     │                   │ 6. Create variable    │
     │                   │    products           │
     │                   │──────────────────────►│
     │                   │◄──────────────────────│
     │ 7. SSE: progress  │                       │
     │◄──────────────────│                       │
     │                   │                       │
     │                   │ 8. Create variations  │
     │                   │    (batch per product)│
     │                   │──────────────────────►│
     │                   │◄──────────────────────│
     │ 9. SSE: progress  │                       │
     │◄──────────────────│                       │
     │                   │                       │
     │                   │ 10. Create grouped    │
     │                   │     products          │
     │                   │──────────────────────►│
     │                   │◄──────────────────────│
     │ 11. SSE: complete │                       │
     │◄──────────────────│                       │
     │                   │                       │
```

### 5.3 Cleanup Flow

```
┌──────────┐      ┌──────────────┐      ┌─────────────────┐
│  Browser │      │  Test Gen    │      │  WooCommerce    │
│          │      │  Server      │      │  Store          │
└────┬─────┘      └──────┬───────┘      └────────┬────────┘
     │                   │                       │
     │ 1. POST /api/cleanup                     │
     │   (SSE connection)│                       │
     │──────────────────►│                       │
     │                   │                       │
     │                   │ 2. Query products     │
     │                   │    with meta field    │
     │                   │──────────────────────►│
     │                   │◄──────────────────────│
     │ 3. SSE: found X   │                       │
     │◄──────────────────│                       │
     │                   │                       │
     │                   │ 4. Delete products    │
     │                   │    (batch)            │
     │                   │──────────────────────►│
     │                   │◄──────────────────────│
     │ 5. SSE: progress  │                       │
     │◄──────────────────│                       │
     │                   │                       │
     │                   │ 6. Query categories   │
     │                   │    with meta field    │
     │                   │──────────────────────►│
     │                   │◄──────────────────────│
     │                   │                       │
     │                   │ 7. Delete categories  │
     │                   │──────────────────────►│
     │                   │◄──────────────────────│
     │ 8. SSE: complete  │                       │
     │◄──────────────────│                       │
     │                   │                       │
```

---

## 6. API Specification

### 6.1 OAuth Initiate

**Endpoint:** `POST /api/oauth/initiate`

**Request:**
```typescript
interface OAuthInitiateRequest {
  storeUrl: string; // e.g., "https://mystore.com"
}
```

**Response:**
```typescript
interface OAuthInitiateResponse {
  success: boolean;
  authUrl?: string;  // WooCommerce OAuth URL
  error?: string;
}
```

**Logic:**
1. Validate URL format (must be valid HTTPS URL)
2. Store URL in session
3. Build OAuth URL with parameters:
   - `app_name`: "WooCommerce Test Data Generator"
   - `scope`: "read_write"
   - `user_id`: Random session ID
   - `return_url`: `{APP_URL}/?connected=true`
   - `callback_url`: `{APP_URL}/api/oauth/callback`
4. Return auth URL for redirect

---

### 6.2 OAuth Callback

**Endpoint:** `GET /api/oauth/callback`

**Query Parameters:**
```typescript
interface OAuthCallbackParams {
  consumer_key: string;
  consumer_secret: string;
  // OR in POST body for some WooCommerce versions
}
```

**Response:** Redirect to `/?connected=true` or `/?error=...`

**Logic:**
1. Extract credentials from query or body
2. Validate credentials are strings (not arrays)
3. Test connection to WooCommerce API
4. Fetch store settings (currency, units)
5. Store all in encrypted session
6. Redirect to app with success/error

---

### 6.3 Status Check

**Endpoint:** `GET /api/status`

**Response:**
```typescript
interface StatusResponse {
  connected: boolean;
  storeUrl?: string;
  storeInfo?: {
    currency: string;
    dimensionUnit: string;
    weightUnit: string;
  };
  connectedAt?: number;
}
```

---

### 6.4 Generate Products

**Endpoint:** `POST /api/generate`

**Response:** Server-Sent Events stream

**SSE Configuration:**
- Heartbeat interval: 30 seconds
- Connection timeout: None (kept alive by heartbeat)
- Reconnection: Client should auto-reconnect on disconnect

**SSE Event Types:**
```typescript
// Heartbeat (sent every 30 seconds to keep connection alive)
interface HeartbeatEvent {
  type: 'heartbeat';
  timestamp: number;
}

// Progress update
interface ProgressEvent {
  type: 'progress';
  phase: 'checking' | 'brands' | 'categories' | 'simple' | 'variable' | 'variations' | 'grouped';
  current: number;
  total: number;
  message: string;
  details?: {
    brandsCreated?: number;
    categoriesCreated?: number;
    simpleCreated?: number;
    variableCreated?: number;
    variationsCreated?: number;
    groupedCreated?: number;
  };
}

// Completion
interface CompleteEvent {
  type: 'complete';
  summary: {
    totalProducts: number;
    brandsCreated: number;
    categoriesCreated: number;
    simpleProducts: number;
    variableProducts: number;
    totalVariations: number;
    groupedProducts: number;
    duration: number; // milliseconds
    brandDistribution?: {
      taxonomy: number;   // Products using pa_brand taxonomy
      attribute: number;  // Products using Brand attribute
      meta: number;       // Products using _brand meta
      none: number;       // Products with no brand
    };
  };
}

// Error
interface ErrorEvent {
  type: 'error';
  error: string;
  phase?: string;
  productSku?: string;
}
```

**Heartbeat Implementation:**
```typescript
// Send heartbeat every 30 seconds during long operations
const HEARTBEAT_INTERVAL_MS = 30000;

async function* generateWithHeartbeat(): AsyncGenerator<GeneratorEvent> {
  const heartbeatTimer = setInterval(() => {
    // Heartbeat will be interleaved with progress events
  }, HEARTBEAT_INTERVAL_MS);

  try {
    yield* this.generate();
  } finally {
    clearInterval(heartbeatTimer);
  }
}
```

---

### 6.5 Cleanup Products

**Endpoint:** `POST /api/cleanup`

**Response:** Server-Sent Events stream

**SSE Event Types:**
```typescript
// Progress update
interface CleanupProgressEvent {
  type: 'progress';
  phase: 'finding' | 'deleting-products' | 'deleting-categories';
  current: number;
  total: number;
  message: string;
}

// Completion
interface CleanupCompleteEvent {
  type: 'complete';
  summary: {
    productsDeleted: number;
    categoriesDeleted: number;
    duration: number;
  };
}

// Error
interface CleanupErrorEvent {
  type: 'error';
  error: string;
}
```

---

## 7. Data Models

### 7.1 Session Data

```typescript
interface SessionData {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  connectedAt: number;
  storeInfo?: StoreInfo;
}

interface StoreInfo {
  currency: string;        // e.g., "USD"
  dimensionUnit: string;   // e.g., "in"
  weightUnit: string;      // e.g., "lbs"
}
```

### 7.2 Product Definitions

```typescript
// Category definition
interface CategoryDefinition {
  slug: string;           // Unique identifier
  name: string;
  parent?: string;        // Parent slug
  description?: string;
}

// Brand storage method - determines how brand is stored in WooCommerce
// Covers edge cases EC-BRD-01 through EC-BRD-04
type BrandStorageMethod =
  | 'taxonomy'   // EC-BRD-01: pa_brand taxonomy (like WooCommerce Brands plugin)
  | 'attribute'  // EC-BRD-02: Visible product attribute named "Brand"
  | 'meta'       // EC-BRD-03: Product meta_data with key "_brand"
  | 'none';      // EC-BRD-04: No brand information stored

// Base product definition
interface ProductDefinitionBase {
  sku: string;
  name: string;
  brand: string;
  brandStorageMethod: BrandStorageMethod;  // How brand is stored in WooCommerce
  categorySlug: string;
  description?: string;
  shortDescription?: string;
  regularPrice: string;
  salePrice?: string;
  saleDateFrom?: string;
  saleDateTo?: string;
  stockStatus: 'instock' | 'outofstock' | 'onbackorder';
  stockQuantity?: number;
  manageStock?: boolean;
  weight?: string;
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };
  images?: string[];       // Placeholder URLs
  metaData?: MetaDataItem[];
  edgeCase?: string;       // Description of edge case being tested
}

// Simple product
interface SimpleProductDefinition extends ProductDefinitionBase {
  type: 'simple';
}

// Variable product
interface VariableProductDefinition extends ProductDefinitionBase {
  type: 'variable';
  attributes: AttributeDefinition[];
  variations: VariationDefinition[];
}

// Grouped product
interface GroupedProductDefinition extends ProductDefinitionBase {
  type: 'grouped';
  groupedProductSkus: string[];  // SKUs of child products
}

// Attribute definition
interface AttributeDefinition {
  name: string;           // e.g., "Color", "Size"
  options: string[];      // e.g., ["Red", "Blue", "Green"]
  variation: boolean;     // true if used for variations
  visible: boolean;
}

// Variation definition
interface VariationDefinition {
  sku: string;
  attributes: { name: string; option: string }[];
  regularPrice: string;
  salePrice?: string;
  stockStatus?: string;
  stockQuantity?: number;
  weight?: string;
  dimensions?: { length: string; width: string; height: string };
  image?: string;
}

// Meta data
interface MetaDataItem {
  key: string;
  value: string;
}
```

### 7.3 WooCommerce API Models

```typescript
// Category input for WooCommerce API
interface WooCategoryInput {
  name: string;
  slug?: string;
  parent?: number;
  description?: string;
  meta_data?: MetaDataItem[];
}

// Product input for WooCommerce API
interface WooProductInput {
  name: string;
  type: 'simple' | 'variable' | 'grouped';
  status: 'publish';
  sku?: string;
  regular_price?: string;
  sale_price?: string;
  date_on_sale_from?: string;
  date_on_sale_to?: string;
  description?: string;
  short_description?: string;
  categories?: { id: number }[];
  images?: { src: string; alt?: string }[];
  attributes?: WooAttributeInput[];
  manage_stock?: boolean;
  stock_status?: string;
  stock_quantity?: number;
  weight?: string;
  dimensions?: { length: string; width: string; height: string };
  meta_data?: MetaDataItem[];
  grouped_products?: number[];
}

// Attribute input
interface WooAttributeInput {
  name: string;
  options: string[];
  variation: boolean;
  visible: boolean;
}

// Variation input
interface WooVariationInput {
  sku?: string;
  regular_price: string;
  sale_price?: string;
  attributes: { name: string; option: string }[];
  manage_stock?: boolean;
  stock_status?: string;
  stock_quantity?: number;
  weight?: string;
  dimensions?: { length: string; width: string; height: string };
  image?: { src: string };
  meta_data?: MetaDataItem[];
}
```

---

## 8. Security Architecture

### 8.1 Credential Security

| Aspect | Implementation |
|--------|----------------|
| **Storage** | Encrypted cookies via iron-session |
| **Encryption** | AES-256-GCM (iron-session default) |
| **Transport** | HTTPS only in production |
| **Lifetime** | 1 hour TTL |
| **Access** | HTTP-only, SameSite=Lax |

### 8.2 Session Configuration

```typescript
// lib/session.ts
import { getIronSession } from 'iron-session';

export const sessionOptions = {
  password: process.env.SESSION_SECRET!, // Min 32 chars
  cookieName: 'woo-test-gen-session',
  ttl: 3600, // 1 hour
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  },
};
```

### 8.3 Input Validation

| Input | Validation |
|-------|------------|
| Store URL | Must be valid HTTPS URL, no localhost in production |
| OAuth credentials | Must be strings, not arrays |
| API responses | Type-check before processing |

### 8.4 Security Headers

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
];
```

### 8.5 Rate Limiting Considerations

- WooCommerce API has rate limits (varies by host)
- Use batch operations to minimize API calls
- Implement exponential backoff on 429 responses
- Target: ~50 API calls for full generation

---

## 9. Error Handling

### 9.1 Error Categories

| Category | Examples | Handling |
|----------|----------|----------|
| **Connection** | Network timeout, DNS failure | Show error, allow retry |
| **Authentication** | Invalid credentials, expired token | Clear session, re-auth |
| **API Errors** | 400, 500 from WooCommerce | Stop generation, show details |
| **Validation** | Invalid URL, missing data | Show validation message |
| **Rate Limiting** | 429 Too Many Requests | Exponential backoff, retry |

### 9.2 Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;        // Machine-readable code
    message: string;     // Human-readable message
    details?: unknown;   // Additional context
  };
}
```

### 9.3 Error Codes

| Code | Description |
|------|-------------|
| `INVALID_URL` | Store URL format invalid |
| `CONNECTION_FAILED` | Cannot reach WooCommerce store |
| `AUTH_FAILED` | OAuth authentication failed |
| `AUTH_EXPIRED` | Session expired |
| `API_ERROR` | WooCommerce API returned error |
| `RATE_LIMITED` | Too many requests |
| `GENERATION_FAILED` | Product creation failed |
| `CLEANUP_FAILED` | Product deletion failed |

### 9.4 Fail-Fast Strategy

Per PRD requirement, generation stops immediately on any error:

```typescript
async function* generate(): AsyncGenerator<ProgressEvent> {
  try {
    await createCategories();
    yield { type: 'progress', phase: 'categories', ... };

    await createSimpleProducts();
    yield { type: 'progress', phase: 'simple', ... };

    // ... continues if no errors

  } catch (error) {
    // Immediately emit error and stop
    yield {
      type: 'error',
      error: formatError(error),
      phase: currentPhase
    };
    return; // Stop generation
  }
}
```

---

## 10. Performance Considerations

### 10.1 API Call Optimization

| Operation | Without Batch | With Batch | Improvement |
|-----------|---------------|------------|-------------|
| Create categories | 14 calls | 2 calls | 7x |
| Create simple products | 180 calls | 2 calls | 90x |
| Create variable products | 270 calls | 3 calls | 90x |
| Create variations | ~1800 calls | ~27 calls | 67x |
| **Total** | ~2264 calls | ~34 calls | **67x** |

### 10.2 Batch Size Strategy

```typescript
const BATCH_CONFIG = {
  categories: 100,      // WooCommerce limit
  products: 100,        // WooCommerce limit
  variations: 100,      // WooCommerce limit
  cleanup: 100,         // Delete batch size
};
```

### 10.3 Estimated Generation Time

| Phase | Products | Batches | Est. Time |
|-------|----------|---------|-----------|
| Categories | 14 | 1 | ~2s |
| Simple products | 180 | 2 | ~10s |
| Variable products | 270 | 3 | ~15s |
| Variations | ~1800 | ~27 | ~120s |
| Grouped products | 50 | 1 | ~5s |
| **Total** | **500** | **~34** | **~2.5 min** |

### 10.4 Memory Considerations

| Data | Estimated Size |
|------|----------------|
| Product definitions | ~50KB (gzipped) |
| Category ID map | ~1KB |
| Product ID map | ~10KB |
| **Total runtime memory** | **<1MB** |

---

## 11. Deployment Architecture

### 11.1 Railway Configuration

```toml
# railway.toml
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/status"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3

[service]
internalPort = 3000
```

### 11.2 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | Yes | 32+ char secret for session encryption |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL of the app |
| `NODE_ENV` | Auto | Set by Railway |

### 11.3 Build Configuration

```json
// package.json
{
  "name": "test-generator",
  "scripts": {
    "dev": "next dev -p 3002",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### 11.4 Monorepo Workspace

```json
// Root package.json addition
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev:test-gen": "npm run dev --workspace=apps/test-generator",
    "build:test-gen": "npm run build --workspace=apps/test-generator"
  }
}
```

---

## 12. Development Guidelines

### 12.1 Code Organization Rules

1. **One component per file** - Each React component in its own file
2. **Barrel exports** - Use `index.ts` for clean imports
3. **Types separate** - Keep types in `/types` directory
4. **Data separate** - Product definitions in `/data` directory
5. **Lib for utilities** - Shared logic in `/lib` directory

### 12.2 Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ConnectForm.tsx` |
| Hooks | camelCase with `use` | `useSession.ts` |
| Utilities | camelCase | `woo-client.ts` |
| Types | PascalCase | `ProductDefinition` |
| Constants | SCREAMING_SNAKE | `GENERATOR_META_KEY` |

### 12.3 Type Safety

```typescript
// Always type API responses
const response = await fetch('/api/status');
const data: StatusResponse = await response.json();

// Always type component props
interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

// Always type hook returns
function useSession(): {
  session: SessionData | null;
  isLoading: boolean;
  error: Error | null;
}
```

### 12.4 Testing Strategy

| Level | Tool | Coverage Target |
|-------|------|-----------------|
| Unit | Vitest | Utility functions, data transforms |
| Integration | Vitest + MSW | API routes with mocked WooCommerce |
| E2E | Playwright | Critical user flows |

### 12.5 Error Boundaries

```typescript
// Wrap main content in error boundary
<ErrorBoundary fallback={<ErrorFallback />}>
  <MainContent />
</ErrorBoundary>
```

---

## Appendix A: Product Creation Order

The following order ensures all dependencies are satisfied:

```
1. CATEGORIES (14 total)
   └── Create in hierarchical order (parents first)
       ├── Apparel (root)
       ├── Tops, Bottoms, Footwear, Accessories (level 1)
       └── T-Shirts, Hoodies, ... (level 2)

2. SIMPLE PRODUCTS (180 total)
   └── Create in batches of 100
       ├── Batch 1: Products 1-100
       └── Batch 2: Products 101-180

3. VARIABLE PRODUCTS (270 total)
   └── For each variable product:
       ├── Create parent product
       └── Create variations in batch

4. GROUPED PRODUCTS (50 total)
   └── Create after all children exist
       └── Reference children by WooCommerce ID
```

---

## Appendix B: Meta Field Schema

All generated content includes tracking meta fields:

```typescript
// Products
{
  meta_data: [
    { key: '_generated_by', value: 'woo-test-generator' },
    { key: '_generator_batch_id', value: '2026-01-11T10:30:00.000Z' },
    { key: '_generator_version', value: '1.0.0' }
  ]
}

// Categories
{
  meta_data: [
    { key: '_generated_by', value: 'woo-test-generator' },
    { key: '_generator_batch_id', value: '2026-01-11T10:30:00.000Z' }
  ]
}
```

---

## Appendix C: Placeholder Image Strategy

```typescript
const PLACEHOLDER_CONFIG = {
  baseUrl: 'https://via.placeholder.com',
  sizes: {
    main: '800x800',
    thumbnail: '300x300',
    gallery: '600x600',
  },
  colors: {
    'T-Shirts': 'E8E8E8',
    'Hoodies': 'D0D0D0',
    'Jackets': 'B8B8B8',
    'Pants': 'C8C8C8',
    'Shorts': 'E0E0E0',
    'Sneakers': 'F0F0F0',
    'Boots': 'A8A8A8',
    'Sandals': 'F8F8F8',
    'Hats': 'D8D8D8',
    'Bags': 'C0C0C0',
    'Belts': 'B0B0B0',
  },
};

// Generate URL: https://via.placeholder.com/800x800/E8E8E8/333333?text=TSH-001
function getPlaceholderUrl(sku: string, category: string, size: string): string {
  const color = PLACEHOLDER_CONFIG.colors[category] || 'CCCCCC';
  return `${PLACEHOLDER_CONFIG.baseUrl}/${size}/${color}/333333?text=${encodeURIComponent(sku)}`;
}
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-11 | Architect Agent | Initial draft |

---

**End of Document**
