# ProductSynch - Technical Specification Document

**Version:** 1.0  
**Last Updated:** December 2025  
**Purpose:** Technical specification for AI coding agent implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Schema](#4-database-schema)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [WooCommerce Integration](#6-woocommerce-integration)
7. [OpenAI Product Feed Integration](#7-openai-product-feed-integration)
8. [AI Enrichment Engine](#8-ai-enrichment-engine)
9. [API Specification](#9-api-specification)
10. [Frontend Specification](#10-frontend-specification)
11. [Background Jobs & Scheduling](#11-background-jobs--scheduling)
12. [Analytics & Tracking](#12-analytics--tracking)
13. [Error Handling & Logging](#13-error-handling--logging)
14. [Security Requirements](#14-security-requirements)
15. [Deployment & Infrastructure](#15-deployment--infrastructure)
16. [Testing Requirements](#16-testing-requirements)

---

## 1. Executive Summary

### 1.1 Product Overview

**ProductSynch** is a SaaS application that enables e-commerce merchants to automatically synchronize their WooCommerce product catalogs with OpenAI's ChatGPT Product Feed system. The application transforms, enriches, and maintains product data to maximize visibility in ChatGPT shopping experiences.

### 1.2 Core Features

1. **One-Click WooCommerce Connection** - OAuth-based connection to WooCommerce stores
2. **Automatic Data Transformation** - Convert WooCommerce products to OpenAI feed specification
3. **AI-Powered Enrichment** - GPT-4 enhanced titles, descriptions, and Q&A
4. **Manual Override Capability** - Edit any field before syncing
5. **Real-Time Synchronization** - Updates every 15 minutes via webhooks
6. **Performance Analytics Dashboard** - Track ChatGPT impressions, clicks, and conversions

### 1.3 User Flow Overview

```
1. User creates account (email/password)
2. User clicks "Connect WooCommerce Store"
3. User enters store URL → OAuth redirect → Authorization
4. System imports product catalog
5. System transforms data to OpenAI format
6. AI enriches product content (optional manual edits)
7. User clicks "Sync to ChatGPT"
8. Dashboard shows sync status and analytics
```

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCTSYNCH SYSTEM                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────────────────────────────────┐   │
│  │   FRONTEND      │     │              BACKEND SERVICES                │   │
│  │   (Next.js)     │     │                                             │   │
│  │                 │     │  ┌─────────────┐  ┌──────────────────────┐  │   │
│  │  ┌───────────┐  │     │  │   API       │  │   Background Workers │  │   │
│  │  │ Dashboard │  │◄────┼──┤   Gateway   │  │                      │  │   │
│  │  ├───────────┤  │     │  │  (Express)  │  │  • Sync Scheduler    │  │   │
│  │  │ Products  │  │     │  └──────┬──────┘  │  • AI Enrichment     │  │   │
│  │  ├───────────┤  │     │         │         │  • Webhook Handler   │  │   │
│  │  │ Settings  │  │     │         ▼         │  • Analytics Agg.    │  │   │
│  │  ├───────────┤  │     │  ┌──────────────┐ └──────────────────────┘  │   │
│  │  │ Analytics │  │     │  │   Service    │                           │   │
│  │  └───────────┘  │     │  │   Layer      │                           │   │
│  │                 │     │  └──────────────┘                           │   │
│  └─────────────────┘     └─────────────────────────────────────────────┘   │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        DATA LAYER                                     │ │
│  │   ┌─────────────┐    ┌──────────────────┐    ┌───────────────────┐   │ │
│  │   │  PostgreSQL │    │      Redis       │    │   S3 / Storage    │   │ │
│  │   └─────────────┘    └──────────────────┘    └───────────────────┘   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
    ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
    │  WooCommerce  │        │    OpenAI     │        │   OpenAI      │
    │   REST API    │        │  Product Feed │        │   API (GPT)   │
    └───────────────┘        └───────────────┘        └───────────────┘
```

### 2.2 Data Flow

```
INITIAL SYNC:
User → OAuth → WooCommerce API → Products JSON → Transform → AI Enrich → DB → Generate Feed → Push to OpenAI

WEBHOOK UPDATE:
WooCommerce → Webhook → Queue → Process Single Product → Delta Sync → OpenAI

SCHEDULED SYNC (Every 15 min):
Cron → Fetch Products → Diff Check → Update Changed → Generate Feed → Push to OpenAI
```

---

## 3. Technology Stack

### 3.1 Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React framework with App Router |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | Latest | UI component library |
| TanStack Query | 5.x | Server state management |
| Zustand | 4.x | Client state management |
| React Hook Form | 7.x | Form handling |
| Zod | 3.x | Schema validation |
| Recharts | 2.x | Analytics charts |

### 3.2 Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x LTS | Runtime |
| Express.js | 4.x | API framework |
| TypeScript | 5.x | Type safety |
| Prisma | 5.x | ORM |
| BullMQ | 4.x | Job queue |
| Passport.js | 0.7.x | Authentication |
| jsonwebtoken | 9.x | JWT handling |
| Winston | 3.x | Logging |
| node-cron | 3.x | Scheduling |

### 3.3 Database & Storage
| Technology | Purpose |
|------------|---------|
| PostgreSQL 15 | Primary database |
| Redis 7 | Caching, queues, sessions |
| AWS S3 / Cloudflare R2 | File storage |

### 3.4 External Services
| Service | Purpose |
|---------|---------|
| OpenAI API | AI enrichment (GPT-4) |
| OpenAI Product Feed | Feed submission endpoint |
| WooCommerce REST API | Product data source |
| SendGrid / Resend | Transactional emails |
| Stripe | Subscription billing |

---

## 4. Database Schema

### 4.1 Core Tables

```prisma
// prisma/schema.prisma

model User {
  id                String    @id @default(cuid())
  email             String    @unique
  passwordHash      String    @map("password_hash")
  name              String?
  emailVerified     Boolean   @default(false)
  subscriptionTier  SubscriptionTier @default(FREE)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  shops             Shop[]
  settings          UserSettings?
}

enum SubscriptionTier {
  FREE
  STARTER
  PROFESSIONAL
  ENTERPRISE
}

model Shop {
  id                  String      @id @default(cuid())
  userId              String      @map("user_id")
  
  // WooCommerce Connection
  wooStoreUrl         String      @map("woo_store_url")
  wooConsumerKey      String      @map("woo_consumer_key")
  wooConsumerSecret   String      @map("woo_consumer_secret") // Encrypted
  
  // Shop Info
  shopName            String      @map("shop_name")
  shopCurrency        String      @default("USD")
  isConnected         Boolean     @default(false)
  
  // Sync Configuration
  lastSyncAt          DateTime?   @map("last_sync_at")
  syncStatus          SyncStatus  @default(PENDING)
  syncEnabled         Boolean     @default(true)
  
  // OpenAI Configuration
  openaiMerchantId    String?     @map("openai_merchant_id")
  openaiEndpoint      String?     @map("openai_endpoint")
  openaiToken         String?     @map("openai_token") // Encrypted
  openaiEnabled       Boolean     @default(false)
  
  // Seller Info for Feed
  sellerName          String?     @map("seller_name")
  sellerUrl           String?     @map("seller_url")
  sellerPrivacyPolicy String?     @map("seller_privacy_policy")
  sellerTos           String?     @map("seller_tos")
  returnPolicy        String?     @map("return_policy")
  returnWindow        Int?        @map("return_window")
  
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt

  user                User        @relation(fields: [userId], references: [id])
  products            Product[]
  syncBatches         SyncBatch[]
  analytics           ShopAnalytics[]
}

model Product {
  id                  String      @id @default(cuid())
  shopId              String      @map("shop_id")
  
  // WooCommerce Original Data
  wooProductId        Int         @map("woo_product_id")
  wooTitle            String      @map("woo_title")
  wooDescription      String?     @map("woo_description") @db.Text
  wooSku              String?     @map("woo_sku")
  wooPrice            Decimal?    @map("woo_price")
  wooSalePrice        Decimal?    @map("woo_sale_price")
  wooStockStatus      String?     @map("woo_stock_status")
  wooStockQuantity    Int?        @map("woo_stock_quantity")
  wooCategories       Json?       @map("woo_categories")
  wooImages           Json?       @map("woo_images")
  wooAttributes       Json?       @map("woo_attributes")
  wooPermalink        String?     @map("woo_permalink")
  wooRawJson          Json?       @map("woo_raw_json")
  
  // OpenAI Feed Data (Computed/Transformed)
  feedId              String?     @map("feed_id")
  feedTitle           String?     @map("feed_title")
  feedDescription     String?     @map("feed_description") @db.Text
  feedPrice           String?     @map("feed_price")
  feedAvailability    String?     @map("feed_availability")
  feedCategory        String?     @map("feed_category")
  feedBrand           String?     @map("feed_brand")
  feedImageLink       String?     @map("feed_image_link")
  feedEnableSearch    Boolean     @default(true)
  feedEnableCheckout  Boolean     @default(false)
  feedDataJson        Json?       @map("feed_data_json")
  
  // AI Enrichment
  aiEnriched          Boolean     @default(false)
  aiTitle             String?     @map("ai_title")
  aiDescription       String?     @map("ai_description") @db.Text
  aiKeywords          String[]    @map("ai_keywords")
  aiQAndA             Json?       @map("ai_q_and_a")
  aiSuggestedCategory String?     @map("ai_suggested_category")
  aiEnrichedAt        DateTime?   @map("ai_enriched_at")
  
  // Manual Overrides
  manualOverride      Boolean     @default(false)
  manualTitle         String?     @map("manual_title")
  manualDescription   String?     @map("manual_description") @db.Text
  manualCategory      String?     @map("manual_category")
  manualKeywords      String[]    @map("manual_keywords")
  manualQAndA         Json?       @map("manual_q_and_a")
  manualEditedAt      DateTime?   @map("manual_edited_at")
  
  // Sync Status
  status              ProductStatus @default(DRAFT)
  syncStatus          SyncStatus  @default(PENDING)
  lastSyncedAt        DateTime?   @map("last_synced_at")
  syncError           String?     @map("sync_error")
  checksum            String?     // Hash for change detection
  isValid             Boolean     @default(false)
  validationErrors    Json?       @map("validation_errors")
  
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt

  shop                Shop        @relation(fields: [shopId], references: [id])
  variants            ProductVariant[]
  analytics           ProductAnalytics[]
}

enum ProductStatus {
  DRAFT
  PENDING_REVIEW
  APPROVED
  SYNCED
  EXCLUDED
  ERROR
}

enum SyncStatus {
  PENDING
  SYNCING
  COMPLETED
  FAILED
  PAUSED
}

model ProductAnalytics {
  id                  String    @id @default(cuid())
  productId           String    @map("product_id")
  date                DateTime  @db.Date
  chatgptImpressions  Int       @default(0)
  chatgptClicks       Int       @default(0)
  chatgptConversions  Int       @default(0)
  chatgptRevenue      Decimal?  @db.Decimal(10, 2)
  
  product Product @relation(fields: [productId], references: [id])
  
  @@unique([productId, date])
}

model ShopAnalytics {
  id                  String    @id @default(cuid())
  shopId              String    @map("shop_id")
  date                DateTime  @db.Date
  totalProducts       Int       @default(0)
  syncedProducts      Int       @default(0)
  enrichedProducts    Int       @default(0)
  chatgptImpressions  Int       @default(0)
  chatgptClicks       Int       @default(0)
  chatgptConversions  Int       @default(0)
  chatgptTraffic      Int       @default(0)
  chatgptRevenue      Decimal?  @db.Decimal(10, 2)
  
  shop Shop @relation(fields: [shopId], references: [id])
  
  @@unique([shopId, date])
}

model SyncBatch {
  id                String      @id @default(cuid())
  shopId            String      @map("shop_id")
  status            SyncStatus  @default(PENDING)
  syncType          SyncType    @map("sync_type")
  totalProducts     Int         @default(0)
  syncedProducts    Int         @default(0)
  failedProducts    Int         @default(0)
  startedAt         DateTime?
  completedAt       DateTime?
  errorLog          Json?
  feedFileUrl       String?
  triggeredBy       String?     // user, webhook, schedule
  createdAt         DateTime    @default(now())

  shop Shop @relation(fields: [shopId], references: [id])
}

enum SyncType {
  FULL
  INCREMENTAL
  SINGLE_PRODUCT
  MANUAL
}
```

---

## 5. Authentication & Authorization

### 5.1 Authentication Flow

```
EMAIL/PASSWORD REGISTRATION:
1. User submits email, password, name
2. Validate input (Zod schema)
3. Check email doesn't exist
4. Hash password (bcrypt, cost 12)
5. Create user record
6. Send verification email
7. Return JWT tokens (access + refresh)

LOGIN:
1. User submits email, password
2. Find user by email
3. Verify password hash
4. Generate JWT access token (15 min expiry)
5. Generate refresh token (7 days expiry)
6. Store refresh token in Redis
7. Return tokens

TOKEN REFRESH:
1. Receive refresh token
2. Verify token signature
3. Check token exists in Redis
4. Generate new access token
5. Return new access token
```

### 5.2 JWT Token Structure

```typescript
// Access Token Payload
interface AccessTokenPayload {
  sub: string;           // User ID
  email: string;
  name: string;
  tier: SubscriptionTier;
  iat: number;           // Issued at
  exp: number;           // Expiration (15 minutes)
  type: 'access';
}

// Refresh Token Payload
interface RefreshTokenPayload {
  sub: string;           // User ID
  jti: string;           // Unique token ID (for revocation)
  iat: number;
  exp: number;           // Expiration (7 days)
  type: 'refresh';
}
```

---

## 6. WooCommerce Integration

### 6.1 OAuth Connection Flow

```
1. User enters WooCommerce store URL
2. System validates URL is accessible
3. Generate OAuth authorization URL
4. Redirect user to WooCommerce
5. User authorizes ProductSynch app
6. WooCommerce redirects back with consumer_key and consumer_secret
7. System stores encrypted credentials
8. Verify connection works
9. Setup webhooks for real-time updates
```

### 6.2 WooCommerce Client Implementation

```typescript
// src/services/woocommerce/client.ts

import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

export class WooCommerceClient {
  private api: WooCommerceRestApi;
  
  constructor(config: WooCommerceClientConfig) {
    this.api = new WooCommerceRestApi({
      url: config.storeUrl,
      consumerKey: config.consumerKey,
      consumerSecret: decrypt(config.consumerSecret),
      version: 'wc/v3',
    });
  }
  
  // Fetch all products with pagination
  async fetchAllProducts(): Promise<WooProduct[]> {
    const allProducts: WooProduct[] = [];
    let page = 1;
    const perPage = 100;
    
    while (true) {
      const response = await this.api.get('products', {
        page,
        per_page: perPage,
        status: 'publish',
      });
      
      allProducts.push(...response.data);
      
      const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1');
      if (page >= totalPages) break;
      page++;
    }
    
    return allProducts;
  }
  
  // Fetch modified products for incremental sync
  async fetchModifiedProducts(after: Date): Promise<WooProduct[]> {
    return this.fetchAllProducts({
      filters: { modified_after: after.toISOString() },
    });
  }
  
  // Setup webhooks
  async setupWebhooks(callbackUrl: string, secret: string): Promise<void> {
    const topics = ['product.created', 'product.updated', 'product.deleted'];
    
    for (const topic of topics) {
      await this.api.post('webhooks', {
        name: `ProductSynch - ${topic}`,
        topic,
        delivery_url: callbackUrl,
        secret,
        status: 'active',
      });
    }
  }
}
```

### 6.3 Webhook Handler

```typescript
// src/services/woocommerce/webhookHandler.ts

export class WooCommerceWebhookHandler {
  
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('base64');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
  
  async handleWebhook(shopId: string, topic: string, payload: any): Promise<void> {
    // Log webhook event
    await prisma.webhookEvent.create({
      data: { shopId, eventType: topic, payload, processed: false },
    });
    
    // Queue for async processing
    await productSyncQueue.add('process-webhook', {
      shopId,
      topic,
      productId: payload.id,
    });
  }
}
```

---

## 7. OpenAI Product Feed Integration

### 7.1 Feed Specification (Required Fields)

```typescript
// OpenAI Product Feed - Required Fields
interface OpenAIProductFeed {
  // Flags (Required)
  enable_search: 'true' | 'false';
  enable_checkout: 'true' | 'false';
  
  // Basic Data (Required)
  id: string;                    // Max 100 chars, stable
  title: string;                 // Max 150 chars, no all-caps
  description: string;           // Max 5000 chars, plain text
  link: string;                  // Product URL
  
  // Identifiers
  gtin?: string;                 // 8-14 digits
  mpn?: string;                  // Required if no GTIN
  
  // Item Info
  product_category: string;      // "Category > Subcategory" format
  brand?: string;
  condition?: 'new' | 'refurbished' | 'used';
  weight?: string;               // e.g., "1.5 lb"
  
  // Media (Required: image_link)
  image_link: string;            // HTTPS, JPEG/PNG
  additional_image_link?: string[];
  
  // Pricing (Required)
  price: string;                 // "79.99 USD" format
  sale_price?: string;
  
  // Availability (Required)
  availability: 'in_stock' | 'out_of_stock' | 'preorder';
  inventory_quantity: number;
  
  // Merchant Info (Required)
  seller_name: string;
  seller_url: string;
  seller_privacy_policy?: string; // Required for checkout
  seller_tos?: string;            // Required for checkout
  
  // Returns (Required)
  return_policy: string;         // URL
  return_window: number;         // Days
  
  // Reviews & Q&A
  product_review_count?: number;
  product_review_rating?: number;
  q_and_a?: string;              // Plain text Q&A
}
```

### 7.2 Data Transformer

```typescript
// src/services/openai-feed/transformer.ts

export class ProductFeedTransformer {
  
  constructor(private shop: Shop) {}
  
  transformProduct(product: Product): OpenAIProductFeed {
    // Priority: manual > AI > WooCommerce
    const title = this.resolveField(product, 'title');
    const description = this.resolveField(product, 'description');
    
    return {
      enable_search: product.feedEnableSearch ? 'true' : 'false',
      enable_checkout: product.feedEnableCheckout ? 'true' : 'false',
      
      id: this.generateStableId(product),
      title: this.sanitizeTitle(title),
      description: this.sanitizeDescription(description),
      link: product.wooPermalink || '',
      
      gtin: product.wooGtin || undefined,
      mpn: product.wooSku || undefined,
      
      product_category: this.buildCategoryPath(product),
      brand: product.wooBrand || this.shop.shopName,
      condition: 'new',
      
      image_link: this.getPrimaryImage(product),
      additional_image_link: this.getAdditionalImages(product),
      
      price: this.formatPrice(product.wooPrice, this.shop.shopCurrency),
      sale_price: product.wooSalePrice 
        ? this.formatPrice(product.wooSalePrice, this.shop.shopCurrency)
        : undefined,
      
      availability: this.mapAvailability(product.wooStockStatus),
      inventory_quantity: product.wooStockQuantity || 0,
      
      seller_name: this.shop.sellerName || this.shop.shopName,
      seller_url: this.shop.sellerUrl || this.shop.wooStoreUrl,
      seller_privacy_policy: this.shop.sellerPrivacyPolicy,
      seller_tos: this.shop.sellerTos,
      
      return_policy: this.shop.returnPolicy || `${this.shop.wooStoreUrl}/returns`,
      return_window: this.shop.returnWindow || 30,
      
      q_and_a: this.formatQAndA(product),
    };
  }
  
  private resolveField(product: Product, field: 'title' | 'description'): string {
    // Manual override takes priority
    if (product.manualOverride && product[`manual${capitalize(field)}`]) {
      return product[`manual${capitalize(field)}`];
    }
    // Then AI enriched
    if (product.aiEnriched && product[`ai${capitalize(field)}`]) {
      return product[`ai${capitalize(field)}`];
    }
    // Finally WooCommerce original
    return product[`woo${capitalize(field)}`] || '';
  }
  
  private mapAvailability(status: string | null): 'in_stock' | 'out_of_stock' | 'preorder' {
    switch (status) {
      case 'instock': return 'in_stock';
      case 'outofstock': return 'out_of_stock';
      case 'onbackorder': return 'preorder';
      default: return 'in_stock';
    }
  }
  
  private formatPrice(price: any, currency: string): string {
    if (!price) return `0.00 ${currency}`;
    return `${parseFloat(price).toFixed(2)} ${currency}`;
  }
  
  private formatQAndA(product: Product): string | undefined {
    const qAndA = product.manualQAndA || product.aiQAndA;
    if (!qAndA || !Array.isArray(qAndA)) return undefined;
    return qAndA.map(item => `Q: ${item.q} A: ${item.a}`).join('\n');
  }
}
```

### 7.3 Feed Generator & Push

```typescript
// src/services/openai-feed/generator.ts

export class FeedGenerator {
  
  async generateFeed(
    shop: Shop,
    products: Product[],
    format: 'json' | 'csv' | 'xml' = 'json'
  ): Promise<{ fileUrl: string; productCount: number; errors: string[] }> {
    
    const transformer = new ProductFeedTransformer(shop);
    const feedItems: OpenAIProductFeed[] = [];
    const errors: string[] = [];
    
    for (const product of products) {
      if (product.status === 'EXCLUDED' || !product.isValid) continue;
      
      try {
        const feedItem = transformer.transformProduct(product);
        const validationErrors = this.validateFeedItem(feedItem);
        
        if (validationErrors.length > 0) {
          errors.push(`Product ${product.id}: ${validationErrors.join(', ')}`);
          continue;
        }
        
        feedItems.push(feedItem);
      } catch (error) {
        errors.push(`Product ${product.id}: ${error.message}`);
      }
    }
    
    // Generate file based on format
    const content = format === 'json' 
      ? JSON.stringify(feedItems, null, 2)
      : this.generateCSV(feedItems);
    
    // Upload to storage
    const fileName = `feeds/${shop.id}/${Date.now()}.${format}`;
    const fileUrl = await uploadToStorage(fileName, content);
    
    return { fileUrl, productCount: feedItems.length, errors };
  }
  
  private validateFeedItem(item: OpenAIProductFeed): string[] {
    const errors: string[] = [];
    
    if (!item.id) errors.push('Missing id');
    if (!item.title) errors.push('Missing title');
    if (!item.description) errors.push('Missing description');
    if (!item.link) errors.push('Missing link');
    if (!item.image_link) errors.push('Missing image_link');
    if (!item.price) errors.push('Missing price');
    if (!item.availability) errors.push('Missing availability');
    if (item.title && item.title.length > 150) errors.push('Title exceeds 150 chars');
    if (item.description && item.description.length > 5000) errors.push('Description exceeds 5000 chars');
    
    // Checkout requirements
    if (item.enable_checkout === 'true') {
      if (!item.seller_privacy_policy) errors.push('Checkout requires seller_privacy_policy');
      if (!item.seller_tos) errors.push('Checkout requires seller_tos');
    }
    
    return errors;
  }
}

export class FeedPusher {
  
  async pushFeed(shop: Shop, feedFileUrl: string): Promise<{ success: boolean; error?: string }> {
    if (!shop.openaiEndpoint || !shop.openaiToken) {
      return { success: false, error: 'OpenAI endpoint not configured' };
    }
    
    try {
      const feedContent = await fetch(feedFileUrl).then(r => r.text());
      
      const response = await fetch(shop.openaiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${decrypt(shop.openaiToken)}`,
          'Content-Type': 'application/json',
        },
        body: feedContent,
      });
      
      if (!response.ok) {
        return { success: false, error: `OpenAI API error: ${response.status}` };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

---

## 8. AI Enrichment Engine

### 8.1 Enrichment Service

```typescript
// src/services/ai-enrichment/enrichmentService.ts

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface EnrichmentResult {
  title: string;
  description: string;
  keywords: string[];
  qAndA: Array<{ q: string; a: string }>;
  suggestedCategory: string;
}

export class AIEnrichmentService {
  
  async enrichProduct(product: Product): Promise<EnrichmentResult> {
    const prompt = this.buildEnrichmentPrompt(product);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a product content specialist for e-commerce. 
Your task is to enhance product listings for better discoverability in AI-powered shopping experiences like ChatGPT.

Rules:
1. Write titles that are clear, descriptive, and include key attributes
2. Write descriptions that answer common customer questions
3. Generate natural Q&A pairs that shoppers would ask
4. Suggest appropriate product categories
5. Extract relevant keywords

Output must be valid JSON.`
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
    });
    
    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    return {
      title: result.enhanced_title || product.wooTitle,
      description: result.enhanced_description || product.wooDescription || '',
      keywords: result.keywords || [],
      qAndA: result.q_and_a || [],
      suggestedCategory: result.suggested_category || '',
    };
  }
  
  private buildEnrichmentPrompt(product: Product): string {
    return `Enhance this product listing for ChatGPT shopping discovery:

ORIGINAL PRODUCT DATA:
- Title: ${product.wooTitle}
- Description: ${product.wooDescription || 'No description'}
- Price: ${product.wooPrice}
- SKU: ${product.wooSku || 'None'}
- Categories: ${JSON.stringify(product.wooCategories)}
- Attributes: ${JSON.stringify(product.wooAttributes)}

Provide enhanced content in this JSON format:
{
  "enhanced_title": "Clear, descriptive title under 150 characters",
  "enhanced_description": "Compelling description under 5000 characters",
  "keywords": ["keyword1", "keyword2", "...up to 10"],
  "q_and_a": [
    {"q": "Customer question 1?", "a": "Helpful answer 1"},
    {"q": "Customer question 2?", "a": "Helpful answer 2"},
    {"q": "Customer question 3?", "a": "Helpful answer 3"}
  ],
  "suggested_category": "Main Category > Subcategory"
}`;
  }
}
```

---

## 9. API Specification

### 9.1 REST API Endpoints

```yaml
# Authentication
POST   /api/v1/auth/register        # Create new user
POST   /api/v1/auth/login           # Login with email/password
POST   /api/v1/auth/refresh         # Refresh access token
POST   /api/v1/auth/logout          # Logout
GET    /api/v1/auth/me              # Get current user

# Shops
GET    /api/v1/shops                # List user's shops
POST   /api/v1/shops                # Initiate shop connection
GET    /api/v1/shops/:id            # Get shop details
PATCH  /api/v1/shops/:id            # Update shop settings
DELETE /api/v1/shops/:id            # Disconnect shop
POST   /api/v1/shops/:id/oauth/callback  # OAuth callback
POST   /api/v1/shops/:id/verify     # Verify connection
PUT    /api/v1/shops/:id/openai-config   # Configure OpenAI settings

# Products
GET    /api/v1/shops/:id/products          # List products (paginated, filterable)
GET    /api/v1/shops/:id/products/:pid     # Get product details
PATCH  /api/v1/shops/:id/products/:pid     # Update product (manual edits)
POST   /api/v1/shops/:id/products/:pid/enrich  # Trigger AI enrichment
GET    /api/v1/shops/:id/products/:pid/preview-feed  # Preview feed format
POST   /api/v1/shops/:id/products/bulk     # Bulk actions

# Sync
POST   /api/v1/shops/:id/sync              # Trigger manual sync
GET    /api/v1/shops/:id/sync/status       # Get current sync status
GET    /api/v1/shops/:id/sync/history      # Get sync history
POST   /api/v1/shops/:id/sync/push         # Push feed to OpenAI
GET    /api/v1/shops/:id/feed/preview      # Preview full feed
GET    /api/v1/shops/:id/feed/download     # Download feed file

# Webhooks
POST   /api/v1/webhooks/woocommerce/:shopId  # WooCommerce webhook receiver

# Analytics
GET    /api/v1/shops/:id/analytics/overview   # Overview metrics
GET    /api/v1/shops/:id/analytics/products   # Product performance
GET    /api/v1/shops/:id/analytics/timeline   # Timeline data for charts
```

### 9.2 Request/Response Examples

```typescript
// POST /api/v1/shops
// Request:
{
  "storeUrl": "https://mystore.woocommerce.com"
}

// Response:
{
  "authUrl": "https://mystore.woocommerce.com/wc-auth/v1/authorize?...",
  "shopId": "shop_abc123"
}

// GET /api/v1/shops/:id/products
// Response:
{
  "products": [
    {
      "id": "prod_xyz",
      "wooProductId": 123,
      "title": "Product Name",
      "imageUrl": "https://...",
      "price": "29.99",
      "availability": "in_stock",
      "status": "SYNCED",
      "syncStatus": "COMPLETED",
      "aiEnriched": true,
      "feedEnableSearch": true,
      "feedEnableCheckout": false,
      "lastSyncedAt": "2025-12-13T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 234,
    "totalPages": 5
  }
}

// PATCH /api/v1/shops/:id/products/:pid
// Request:
{
  "manualTitle": "Custom Product Title",
  "manualDescription": "Custom description...",
  "manualQAndA": [
    {"q": "Is this product durable?", "a": "Yes, built to last."}
  ],
  "feedEnableSearch": true,
  "feedEnableCheckout": true
}

// GET /api/v1/shops/:id/analytics/overview?period=30d
// Response:
{
  "period": "30d",
  "totalProducts": 500,
  "syncedProducts": 485,
  "enrichedProducts": 450,
  "chatgpt": {
    "impressions": 15000,
    "clicks": 750,
    "conversions": 45,
    "traffic": 680,
    "revenue": 4500.00
  },
  "changes": {
    "impressions": 12.5,
    "clicks": 8.3,
    "conversions": 15.2
  }
}
```

---

## 10. Frontend Specification

### 10.1 Page Structure

```
/
├── (auth)/                          # Auth layout (no sidebar)
│   ├── login/
│   ├── register/
│   └── forgot-password/
│
├── (dashboard)/                     # Dashboard layout (with sidebar)
│   ├── page.tsx                     # Dashboard overview
│   ├── shops/
│   │   ├── page.tsx                 # List of shops
│   │   ├── new/                     # Connect new shop wizard
│   │   └── [shopId]/
│   │       ├── page.tsx             # Shop overview
│   │       ├── products/
│   │       │   ├── page.tsx         # Product list
│   │       │   └── [productId]/     # Product detail/edit
│   │       ├── sync/                # Sync status & history
│   │       ├── analytics/           # Analytics dashboard
│   │       └── settings/            # Shop settings
│   └── settings/                    # User settings
```

### 10.2 Key UI Components

```typescript
// Dashboard Stats Grid
<StatsGrid>
  <StatCard title="Total Products" value={500} icon={Package} />
  <StatCard title="Synced to ChatGPT" value={485} percentage={97} icon={CheckCircle} />
  <StatCard title="AI Enriched" value={450} percentage={90} icon={Sparkles} />
  <StatCard title="ChatGPT Impressions" value={15000} change={+12.5} icon={Eye} />
</StatsGrid>

// Products Table
<ProductsTable>
  <TableHeader>
    <Checkbox /> Product | Price | Availability | AI Enriched | ChatGPT | Status | Actions
  </TableHeader>
  <TableBody>
    {products.map(product => (
      <ProductRow 
        key={product.id}
        product={product}
        onEdit={openEditModal}
        onEnrich={triggerEnrichment}
      />
    ))}
  </TableBody>
</ProductsTable>

// Product Edit Modal - Tabs
<Tabs>
  <Tab label="WooCommerce Data">
    <ReadOnlyFields data={product.wooData} />
  </Tab>
  <Tab label="AI Enriched">
    <AIEnrichmentView data={product.aiData} onReEnrich={handleReEnrich} />
  </Tab>
  <Tab label="Manual Edits">
    <ManualEditForm 
      values={product.manualData}
      onChange={handleChange}
    />
  </Tab>
  <Tab label="Feed Preview">
    <FeedPreview data={product.feedData} />
  </Tab>
</Tabs>

// Connect Shop Wizard
<WizardSteps steps={['Enter URL', 'Authorize', 'Configure', 'Initial Sync']} />

// Analytics Dashboard
<AnalyticsPage>
  <DateRangePicker value={dateRange} onChange={setDateRange} />
  <StatsGrid cols={5}>
    <StatCard title="Products Synced" value={485} />
    <StatCard title="Impressions" value={15000} change={+12.5} />
    <StatCard title="Clicks" value={750} change={+8.3} />
    <StatCard title="Conversions" value={45} change={+15.2} />
    <StatCard title="Revenue" value="$4,500" change={+22.1} />
  </StatsGrid>
  <AreaChart data={timelineData} metric={selectedMetric} />
  <TopProductsTable products={topProducts} />
</AnalyticsPage>
```

---

## 11. Background Jobs & Scheduling

### 11.1 Job Queues (BullMQ)

```typescript
// Queue definitions
export const queues = {
  productSync: new Queue('product-sync'),      // WooCommerce sync
  aiEnrichment: new Queue('ai-enrichment'),    // AI enrichment
  feedGeneration: new Queue('feed-generation'),// Feed generation & push
  analytics: new Queue('analytics'),           // Analytics aggregation
  webhooks: new Queue('webhooks'),             // Webhook processing
};
```

### 11.2 Scheduled Jobs

```typescript
// Cron Schedule
cron.schedule('*/15 * * * *', syncAllShops);       // Every 15 minutes - Product sync
cron.schedule('0 1 * * *', aggregateDailyAnalytics); // 1 AM UTC - Analytics
cron.schedule('0 * * * *', checkConnectionHealth);   // Every hour - Health check
cron.schedule('0 3 * * *', cleanupStaleData);        // 3 AM UTC - Cleanup
```

### 11.3 Product Sync Worker

```typescript
// src/workers/productSyncWorker.ts

const productSyncWorker = new Worker('product-sync', async (job) => {
  const { shopId, type, triggeredBy } = job.data;
  
  // 1. Get shop
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  
  // 2. Create sync batch
  const batch = await prisma.syncBatch.create({
    data: { shopId, status: 'SYNCING', syncType: type, triggeredBy },
  });
  
  // 3. Fetch products from WooCommerce
  const wooClient = new WooCommerceClient(shop);
  const wooProducts = type === 'incremental' && shop.lastSyncAt
    ? await wooClient.fetchModifiedProducts(shop.lastSyncAt)
    : await wooClient.fetchAllProducts();
  
  // 4. Process each product
  for (const wooProd of wooProducts) {
    const checksum = createHash('md5').update(JSON.stringify(wooProd)).digest('hex');
    
    // Skip if unchanged
    const existing = await prisma.product.findUnique({...});
    if (existing?.checksum === checksum) continue;
    
    // Upsert product
    await prisma.product.upsert({
      where: { shopId_wooProductId: { shopId, wooProductId: wooProd.id } },
      create: { ...transformWooProduct(wooProd), checksum },
      update: { ...transformWooProduct(wooProd), checksum },
    });
  }
  
  // 5. Generate and push feed if OpenAI enabled
  if (shop.openaiEnabled) {
    const products = await prisma.product.findMany({ where: { shopId, status: { not: 'EXCLUDED' } } });
    const feedResult = await feedGenerator.generateFeed(shop, products);
    await feedPusher.pushFeed(shop, feedResult.fileUrl);
  }
  
  // 6. Complete batch
  await prisma.syncBatch.update({
    where: { id: batch.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
});
```

---

## 12. Analytics & Tracking

### 12.1 Metrics Collected

| Metric | Source | Frequency |
|--------|--------|-----------|
| Products Synced | Internal | Real-time |
| Products Enriched | Internal | Real-time |
| ChatGPT Impressions | OpenAI (future API) | Daily |
| ChatGPT Clicks | UTM tracking / OpenAI | Real-time |
| ChatGPT Conversions | WooCommerce orders | Real-time |
| Sync Success Rate | Internal | Per sync |
| Sync Duration | Internal | Per sync |

### 12.2 Analytics Service

```typescript
// src/services/analytics/queryService.ts

export class AnalyticsQueryService {
  
  async getOverview(shopId: string, period: '7d' | '30d' | '90d' | '1y') {
    const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[period];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const currentPeriod = await prisma.shopAnalytics.aggregate({
      where: { shopId, date: { gte: startDate } },
      _sum: { chatgptImpressions: true, chatgptClicks: true, chatgptConversions: true },
    });
    
    // Get previous period for comparison
    const prevPeriod = await prisma.shopAnalytics.aggregate({
      where: { shopId, date: { gte: prevStartDate, lt: startDate } },
      _sum: { chatgptImpressions: true, chatgptClicks: true, chatgptConversions: true },
    });
    
    return {
      period,
      chatgpt: currentPeriod._sum,
      changes: {
        impressions: calcPercentChange(currentPeriod._sum.chatgptImpressions, prevPeriod._sum.chatgptImpressions),
        clicks: calcPercentChange(currentPeriod._sum.chatgptClicks, prevPeriod._sum.chatgptClicks),
        conversions: calcPercentChange(currentPeriod._sum.chatgptConversions, prevPeriod._sum.chatgptConversions),
      },
    };
  }
  
  async getTopProducts(shopId: string, sortBy: 'impressions' | 'clicks', limit = 10) {
    return prisma.productAnalytics.groupBy({
      by: ['productId'],
      where: { product: { shopId } },
      _sum: { chatgptImpressions: true, chatgptClicks: true },
      orderBy: { _sum: { [`chatgpt${capitalize(sortBy)}`]: 'desc' } },
      take: limit,
    });
  }
}
```

---

## 13. Security Requirements

### 13.1 Security Checklist

- [x] JWT-based authentication with short-lived tokens (15 min)
- [x] Refresh token rotation
- [x] Password hashing with bcrypt (cost 12)
- [x] Rate limiting on auth endpoints
- [x] Encryption at rest for sensitive fields (API keys, tokens)
- [x] TLS 1.3 for all connections
- [x] Input validation on all endpoints (Zod)
- [x] SQL injection prevention (Prisma ORM)
- [x] CSRF protection
- [x] Security headers (helmet.js)
- [x] Webhook signature verification

### 13.2 Encryption Service

```typescript
// src/lib/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
}
```

---

## 14. Deployment & Infrastructure

### 14.1 Docker Configuration

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npm run build
RUN npx prisma generate

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports: ["3000:3000"]
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/productsynch
      - REDIS_URL=redis://redis:6379
    depends_on: [db, redis]
    
  worker:
    build: .
    command: node dist/workers/index.js
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/productsynch
      - REDIS_URL=redis://redis:6379
    depends_on: [db, redis]
    
  db:
    image: postgres:15-alpine
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=productsynch
      
  redis:
    image: redis:7-alpine
    volumes: [redis_data:/data]

volumes:
  postgres_data:
  redis_data:
```

### 14.2 Environment Variables

```bash
# .env.example
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/productsynch
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret
ENCRYPTION_KEY=your-32-byte-hex-key
OPENAI_API_KEY=sk-...
S3_BUCKET=productsynch-feeds
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

---

## 15. Testing Requirements

### 15.1 Coverage Targets

| Category | Target |
|----------|--------|
| Unit Tests | 80% |
| Integration Tests | 70% |
| E2E Tests | Critical paths |

### 15.2 Key Test Areas

- Feed transformer logic
- Validation rules
- API endpoints
- OAuth flow
- Webhook handling
- Sync worker logic
- Analytics calculations

---

## 16. File Structure

```
productsynch/
├── apps/
│   ├── api/                    # Express API server
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── lib/
│   │   │   ├── queues/
│   │   │   ├── workers/
│   │   │   └── server.ts
│   │   └── prisma/
│   │
│   └── web/                    # Next.js frontend
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── hooks/
│       │   └── lib/
│       └── package.json
│
├── packages/
│   └── shared/                 # Shared types
│
├── docker-compose.yml
└── package.json
```

---

## Appendix: WooCommerce to OpenAI Field Mapping

| WooCommerce Field | OpenAI Feed Field | Transform |
|-------------------|-------------------|-----------|
| `id` | `id` | Prefix with shop ID |
| `name` | `title` | Sanitize, max 150 chars |
| `description` | `description` | Strip HTML, max 5000 |
| `permalink` | `link` | Direct use |
| `images[0].src` | `image_link` | Direct use |
| `price` | `price` | Format: "XX.XX USD" |
| `sale_price` | `sale_price` | Format: "XX.XX USD" |
| `stock_status` | `availability` | Map: instock→in_stock |
| `stock_quantity` | `inventory_quantity` | Direct use |
| `sku` | `mpn` | Direct use |
| `categories` | `product_category` | Join with " > " |

---

**End of Technical Specification**

*This document serves as the primary reference for implementing ProductSynch. Use it to guide development of all system components.*
