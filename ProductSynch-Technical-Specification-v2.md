# ProductSynch - Technical Specification Document

**Version:** 2.1  
**Last Updated:** December 2025  
**Purpose:** Technical specification for AI coding agent implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [OpenAI Product Feed Complete Specification](#4-openai-product-feed-complete-specification)
5. [Database Schema](#5-database-schema)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [WooCommerce Integration & Auto-Mapping](#7-woocommerce-integration--auto-mapping)
8. [AI Enrichment Engine](#8-ai-enrichment-engine)
9. [Feed Generation & Validation](#9-feed-generation--validation)
10. [API Specification](#10-api-specification)
11. [Frontend Specification](#11-frontend-specification)
12. [Background Jobs & Scheduling](#12-background-jobs--scheduling)
13. [Analytics & Tracking](#13-analytics--tracking)
14. [Security Requirements](#14-security-requirements)
15. [Deployment & Infrastructure](#15-deployment--infrastructure)

---

## 1. Executive Summary

### 1.1 Product Overview

**ProductSynch** is a SaaS application that enables e-commerce merchants to automatically synchronize their WooCommerce product catalogs with OpenAI's ChatGPT Product Feed system. The application provides a transparent, user-controlled interface showing ALL OpenAI feed attributes, auto-filled with WooCommerce data where available, and enhanced with AI suggestions for enrichable fields.

### 1.2 Core Features

1. **One-Click WooCommerce Connection** - OAuth-based connection to WooCommerce stores
2. **Complete OpenAI Spec Visibility** - Display all 63+ OpenAI feed attributes with full metadata
3. **Intelligent Auto-Mapping** - Automatically fill OpenAI fields from WooCommerce data
4. **Manual Edit Capability** - Edit any mapped field directly in the UI
5. **AI-Powered Enrichment** - GPT-4 suggestions for title, description, category, and Q&A
6. **Per-Field Source Selection** - Choose between WooCommerce data or AI suggestion
7. **Real-Time Validation** - Show validation status for each field based on OpenAI rules
8. **Performance Analytics** - Track ChatGPT impressions, clicks, and conversions

### 1.3 User Flow Overview

```
1. User creates account (email/password)
2. User clicks "Connect WooCommerce Store"
3. User enters store URL → OAuth redirect → Authorization
4. System imports product catalog from WooCommerce
5. System AUTO-FILLS OpenAI attributes from WooCommerce data
6. User views product list with validation status
7. User clicks on product → Opens 3-column mapping view:

   ┌──────────────────────────────────────────────────────────────────────────┐
   │  OPENAI SPECIFICATION      │  WOOCOMMERCE DATA      │  AI ENRICHMENT     │
   │  (All 63+ attributes)      │  (Auto-filled/Edit)    │  (Where applicable)│
   │                            │                        │                    │
   │  • Attribute name          │  • Mapped value     ✏️ │  • AI suggestion   │
   │  • Data type               │  • Source field        │  • Select to use   │
   │  • Supported values        │  • Edit override       │                    │
   │  • Description             │  • Validation status   │                    │
   │  • Example                 │                        │                    │
   │  • Requirement level       │                        │                    │
   │  • Dependencies            │                        │                    │
   │  • Validation rules        │                        │                    │
   └──────────────────────────────────────────────────────────────────────────┘

8. User can manually edit any WooCommerce-mapped value
9. User clicks "AI Enrich" → System fills AI column for enrichable fields
10. User selects source per enrichable field (WooCommerce or AI)
11. User clicks "Sync to ChatGPT" → Generates feed from final values
12. Dashboard shows sync status and analytics
```

### 1.4 Key Differentiator: Complete Transparency

| Feature | Benefit |
|---------|---------|
| All 63+ OpenAI Attributes | See every field ChatGPT expects |
| Full Field Metadata | Data type, requirements, validation rules visible |
| Smart Auto-Fill | WooCommerce data mapped automatically |
| Targeted AI Enrichment | AI only for fields where it adds value |
| Per-Field Control | Choose best source for each attribute |
| Real-Time Validation | Instant feedback on field compliance |

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
│  │  │ (3-Column)│  │     │         │         │  • Webhook Handler   │  │   │
│  │  ├───────────┤  │     │         ▼         │  • Feed Generator    │  │   │
│  │  │ Analytics │  │     │  ┌──────────────┐ │  • Validator         │  │   │
│  │  └───────────┘  │     │  │   Service    │ └──────────────────────┘  │   │
│  │                 │     │  │   Layer      │                           │   │
│  └─────────────────┘     │  └──────────────┘                           │   │
│                          └─────────────────────────────────────────────┘   │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        DATA LAYER                                     │ │
│  │   ┌─────────────┐    ┌──────────────────┐    ┌───────────────────┐   │ │
│  │   │  PostgreSQL │    │      Redis       │    │   S3 / Storage    │   │ │
│  │   │  (Products, │    │  (Cache, Queue)  │    │   (Feed Files)    │   │ │
│  │   │   Mappings) │    │                  │    │                   │   │ │
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

### 2.2 Three-Column Data Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRODUCT DATA ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  COLUMN 1: OpenAI Specification (Static Reference)                          │
│  ─────────────────────────────────────────────────                          │
│  Complete spec for all 63+ attributes stored in code                        │
│  Each attribute includes:                                                   │
│    - attribute (field name)                                                 │
│    - dataType                                                               │
│    - supportedValues                                                        │
│    - description                                                            │
│    - example                                                                │
│    - requirement (Required/Recommended/Optional)                            │
│    - dependencies                                                           │
│    - validationRules                                                        │
│    - wooCommerceMapping (which WooCommerce field maps here)                 │
│    - isAiEnrichable (boolean)                                               │
│                                                                             │
│  COLUMN 2: WooCommerce Data (Auto-filled + Editable)                        │
│  ───────────────────────────────────────────────────                        │
│  For each OpenAI attribute:                                                 │
│    - autoFilledValue: Value from WooCommerce (via mapping)                  │
│    - editedValue: User's manual override (if any)                           │
│    - effectiveValue: editedValue ?? autoFilledValue                         │
│    - sourceField: Which WooCommerce field it came from                      │
│    - isValid: Passes OpenAI validation rules                                │
│                                                                             │
│  COLUMN 3: AI Enrichment (Only for enrichable fields)                       │
│  ─────────────────────────────────────────────────────                      │
│  Only 5 fields are AI-enrichable:                                           │
│    - title                                                                  │
│    - description                                                            │
│    - product_category                                                       │
│    - q_and_a                                                                │
│    - (internal: keywords for optimization)                                  │
│  Contains:                                                                  │
│    - aiValue: GPT-4 generated suggestion                                    │
│    - isSelected: User chose to use AI value                                 │
│                                                                             │
│  FINAL VALUE RESOLUTION                                                     │
│  ──────────────────────                                                     │
│  For enrichable fields:                                                     │
│    if (selectedSource === 'ai' && aiValue) return aiValue                   │
│    else return effectiveValue (edited ?? autoFilled)                        │
│  For non-enrichable fields:                                                 │
│    return effectiveValue (edited ?? autoFilled)                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
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
| AWS S3 / Cloudflare R2 | Feed file storage |

### 3.4 External Services
| Service | Purpose |
|---------|---------|
| OpenAI API | AI enrichment (GPT-4) |
| OpenAI Product Feed | Feed submission endpoint |
| WooCommerce REST API | Product data source |
| SendGrid / Resend | Transactional emails |
| Stripe | Subscription billing |

---

## 4. OpenAI Product Feed Complete Specification

This section defines ALL OpenAI feed attributes that will be displayed in Column 1 of the product editor. Each attribute includes complete metadata plus WooCommerce mapping information.

### 4.1 Field Specification Type Definition

```typescript
// src/config/openai-feed-spec.ts

export interface OpenAIFieldSpec {
  // OpenAI Specification (Column 1)
  attribute: string;
  dataType: string;
  supportedValues: string | null;
  description: string;
  example: string;
  requirement: 'Required' | 'Recommended' | 'Optional' | 'Conditional';
  dependencies: string | null;
  validationRules: string[];
  
  // WooCommerce Mapping (Column 2)
  wooCommerceMapping: WooCommerceMapping | null;
  
  // AI Enrichment (Column 3)
  isAiEnrichable: boolean;
  
  // UI Grouping
  category: OpenAIFieldCategory;
}

export interface WooCommerceMapping {
  field: string;           // WooCommerce field path (e.g., "name", "price", "meta.gtin")
  transform?: string;      // Transformation function name
  fallback?: string;       // Fallback field if primary is empty
  shopField?: string;      // Shop-level field (e.g., "sellerName")
}

export type OpenAIFieldCategory = 
  | 'flags'
  | 'basic_product_data'
  | 'item_information'
  | 'media'
  | 'price_promotions'
  | 'availability_inventory'
  | 'variants'
  | 'fulfillment'
  | 'merchant_info'
  | 'returns'
  | 'performance_signals'
  | 'compliance'
  | 'reviews_qanda'
  | 'related_products'
  | 'geo_tagging';
```

### 4.2 Complete OpenAI Feed Specification

```typescript
// src/config/openai-feed-spec.ts

export const OPENAI_FEED_SPEC: OpenAIFieldSpec[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: OpenAI FLAGS
  // ═══════════════════════════════════════════════════════════════════════════
  
  {
    attribute: 'enable_search',
    dataType: 'Enum',
    supportedValues: 'true, false',
    description: 'Controls whether the product can be surfaced in ChatGPT search results.',
    example: 'true',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Must be lowercase string "true" or "false"'],
    wooCommerceMapping: null, // User setting only
    isAiEnrichable: false,
    category: 'flags',
  },
  {
    attribute: 'enable_checkout',
    dataType: 'Enum',
    supportedValues: 'true, false',
    description: 'Allows direct purchase inside ChatGPT. enable_search must be true for this to work.',
    example: 'true',
    requirement: 'Required',
    dependencies: 'enable_search must be true',
    validationRules: ['Must be lowercase string "true" or "false"'],
    wooCommerceMapping: null, // User setting only
    isAiEnrichable: false,
    category: 'flags',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: BASIC PRODUCT DATA
  // ═══════════════════════════════════════════════════════════════════════════
  
  {
    attribute: 'id',
    dataType: 'String (alphanumeric)',
    supportedValues: null,
    description: 'Merchant product ID (unique). Must remain stable over time.',
    example: 'SKU12345',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Max 100 characters', 'Must remain stable over time', 'Alphanumeric'],
    wooCommerceMapping: {
      field: 'id',
      transform: 'generateStableId', // Combines shop prefix + woo ID + SKU
    },
    isAiEnrichable: false,
    category: 'basic_product_data',
  },
  {
    attribute: 'gtin',
    dataType: 'String (numeric)',
    supportedValues: 'GTIN, UPC, ISBN',
    description: 'Universal product identifier (barcode).',
    example: '123456789543',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['8-14 digits', 'No dashes or spaces'],
    wooCommerceMapping: {
      field: 'meta_data',
      transform: 'extractGtin', // Looks for _gtin, gtin, barcode, upc, ean, isbn in meta
    },
    isAiEnrichable: false,
    category: 'basic_product_data',
  },
  {
    attribute: 'mpn',
    dataType: 'String (alphanumeric)',
    supportedValues: null,
    description: 'Manufacturer part number.',
    example: 'GPT5',
    requirement: 'Conditional',
    dependencies: 'Required if gtin is missing',
    validationRules: ['Max 70 characters'],
    wooCommerceMapping: {
      field: 'sku',
      fallback: 'meta_data._mpn',
    },
    isAiEnrichable: false,
    category: 'basic_product_data',
  },
  {
    attribute: 'title',
    dataType: 'String (UTF-8 text)',
    supportedValues: null,
    description: 'Product title. Avoid all-caps.',
    example: "Men's Trail Running Shoes Black",
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Max 150 characters', 'Avoid ALL CAPS'],
    wooCommerceMapping: {
      field: 'name',
    },
    isAiEnrichable: true, // ✅ AI CAN ENRICH
    category: 'basic_product_data',
  },
  {
    attribute: 'description',
    dataType: 'String (UTF-8 text)',
    supportedValues: null,
    description: 'Full product description. Plain text only.',
    example: 'Waterproof trail shoe with cushioned sole…',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Max 5000 characters', 'Plain text only (no HTML)'],
    wooCommerceMapping: {
      field: 'description',
      transform: 'stripHtml',
      fallback: 'short_description',
    },
    isAiEnrichable: true, // ✅ AI CAN ENRICH
    category: 'basic_product_data',
  },
  {
    attribute: 'link',
    dataType: 'URL',
    supportedValues: 'RFC 1738',
    description: 'Product detail page URL.',
    example: 'https://example.com/product/SKU12345',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Must resolve with HTTP 200', 'HTTPS preferred'],
    wooCommerceMapping: {
      field: 'permalink',
    },
    isAiEnrichable: false,
    category: 'basic_product_data',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: ITEM INFORMATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  {
    attribute: 'condition',
    dataType: 'Enum',
    supportedValues: 'new, refurbished, used',
    description: 'Condition of product.',
    example: 'new',
    requirement: 'Conditional',
    dependencies: 'Required if product condition differs from new',
    validationRules: ['Must be lowercase string'],
    wooCommerceMapping: {
      field: 'meta_data._condition',
      transform: 'defaultToNew', // Default to "new" if not specified
    },
    isAiEnrichable: false,
    category: 'item_information',
  },
  {
    attribute: 'product_category',
    dataType: 'String',
    supportedValues: 'Category taxonomy',
    description: 'Category path using > separator.',
    example: 'Apparel & Accessories > Shoes',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Use ">" separator between levels'],
    wooCommerceMapping: {
      field: 'categories',
      transform: 'buildCategoryPath', // Joins category names with " > "
    },
    isAiEnrichable: true, // ✅ AI CAN ENRICH
    category: 'item_information',
  },
  {
    attribute: 'brand',
    dataType: 'String',
    supportedValues: null,
    description: 'Product brand.',
    example: 'OpenAI',
    requirement: 'Conditional',
    dependencies: 'Required for all except movies, books, musical recordings',
    validationRules: ['Max 70 characters'],
    wooCommerceMapping: {
      field: 'brands', // WooCommerce Brands plugin
      fallback: 'attributes.brand',
      transform: 'extractBrand',
    },
    isAiEnrichable: false,
    category: 'item_information',
  },
  {
    attribute: 'material',
    dataType: 'String',
    supportedValues: null,
    description: 'Primary material(s).',
    example: 'Leather',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Max 100 characters'],
    wooCommerceMapping: {
      field: 'attributes.material',
      fallback: 'meta_data._material',
    },
    isAiEnrichable: false,
    category: 'item_information',
  },
  {
    attribute: 'dimensions',
    dataType: 'String',
    supportedValues: 'LxWxH unit',
    description: 'Overall dimensions.',
    example: '12x8x5 in',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Units required if provided'],
    wooCommerceMapping: {
      field: 'dimensions',
      transform: 'formatDimensions', // Combines length, width, height
    },
    isAiEnrichable: false,
    category: 'item_information',
  },
  {
    attribute: 'length',
    dataType: 'Number + unit',
    supportedValues: null,
    description: 'Individual length dimension.',
    example: '10 mm',
    requirement: 'Optional',
    dependencies: 'Provide all three (length, width, height) if using individual fields',
    validationRules: ['Units required'],
    wooCommerceMapping: {
      field: 'dimensions.length',
      transform: 'addUnit',
    },
    isAiEnrichable: false,
    category: 'item_information',
  },
  {
    attribute: 'width',
    dataType: 'Number + unit',
    supportedValues: null,
    description: 'Individual width dimension.',
    example: '10 mm',
    requirement: 'Optional',
    dependencies: 'Provide all three (length, width, height) if using individual fields',
    validationRules: ['Units required'],
    wooCommerceMapping: {
      field: 'dimensions.width',
      transform: 'addUnit',
    },
    isAiEnrichable: false,
    category: 'item_information',
  },
  {
    attribute: 'height',
    dataType: 'Number + unit',
    supportedValues: null,
    description: 'Individual height dimension.',
    example: '10 mm',
    requirement: 'Optional',
    dependencies: 'Provide all three (length, width, height) if using individual fields',
    validationRules: ['Units required'],
    wooCommerceMapping: {
      field: 'dimensions.height',
      transform: 'addUnit',
    },
    isAiEnrichable: false,
    category: 'item_information',
  },
  {
    attribute: 'weight',
    dataType: 'Number + unit',
    supportedValues: null,
    description: 'Product weight.',
    example: '1.5 lb',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Positive number with unit'],
    wooCommerceMapping: {
      field: 'weight',
      transform: 'addWeightUnit',
    },
    isAiEnrichable: false,
    category: 'item_information',
  },
  {
    attribute: 'age_group',
    dataType: 'Enum',
    supportedValues: 'newborn, infant, toddler, kids, adult',
    description: 'Target demographic.',
    example: 'adult',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Must be lowercase string'],
    wooCommerceMapping: {
      field: 'attributes.age_group',
      fallback: 'meta_data._age_group',
    },
    isAiEnrichable: false,
    category: 'item_information',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: MEDIA
  // ═══════════════════════════════════════════════════════════════════════════
  
  {
    attribute: 'image_link',
    dataType: 'URL',
    supportedValues: 'RFC 1738',
    description: 'Main product image URL.',
    example: 'https://example.com/image1.jpg',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['JPEG/PNG format', 'HTTPS preferred'],
    wooCommerceMapping: {
      field: 'images[0].src',
    },
    isAiEnrichable: false,
    category: 'media',
  },
  {
    attribute: 'additional_image_link',
    dataType: 'URL array',
    supportedValues: 'RFC 1738',
    description: 'Extra product images.',
    example: 'https://example.com/image2.jpg,https://example.com/image3.jpg',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Comma-separated or array format'],
    wooCommerceMapping: {
      field: 'images',
      transform: 'extractAdditionalImages', // images[1+].src
    },
    isAiEnrichable: false,
    category: 'media',
  },
  {
    attribute: 'video_link',
    dataType: 'URL',
    supportedValues: 'RFC 1738',
    description: 'Product video.',
    example: 'https://youtu.be/12345',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Must be publicly accessible'],
    wooCommerceMapping: {
      field: 'meta_data._video_url',
      fallback: 'meta_data.video_link',
    },
    isAiEnrichable: false,
    category: 'media',
  },
  {
    attribute: 'model_3d_link',
    dataType: 'URL',
    supportedValues: 'RFC 1738',
    description: '3D model URL.',
    example: 'https://example.com/model.glb',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['GLB/GLTF format preferred'],
    wooCommerceMapping: {
      field: 'meta_data._3d_model',
    },
    isAiEnrichable: false,
    category: 'media',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: PRICE & PROMOTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  {
    attribute: 'price',
    dataType: 'Number + currency',
    supportedValues: 'ISO 4217',
    description: 'Regular price.',
    example: '79.99 USD',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Must include ISO 4217 currency code'],
    wooCommerceMapping: {
      field: 'regular_price',
      fallback: 'price',
      transform: 'formatPriceWithCurrency',
    },
    isAiEnrichable: false,
    category: 'price_promotions',
  },
  {
    attribute: 'sale_price',
    dataType: 'Number + currency',
    supportedValues: 'ISO 4217',
    description: 'Discounted price.',
    example: '59.99 USD',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Must be ≤ price', 'Must include currency code'],
    wooCommerceMapping: {
      field: 'sale_price',
      transform: 'formatPriceWithCurrency',
    },
    isAiEnrichable: false,
    category: 'price_promotions',
  },
  {
    attribute: 'sale_price_effective_date',
    dataType: 'Date range',
    supportedValues: 'ISO 8601',
    description: 'Sale window start and end dates.',
    example: '2025-07-01 / 2025-07-15',
    requirement: 'Optional',
    dependencies: 'Required if sale_price is provided',
    validationRules: ['Start must precede end', 'ISO 8601 format'],
    wooCommerceMapping: {
      field: 'date_on_sale_from',
      transform: 'formatSaleDateRange', // Combines date_on_sale_from and date_on_sale_to
    },
    isAiEnrichable: false,
    category: 'price_promotions',
  },
  {
    attribute: 'unit_pricing_measure',
    dataType: 'Number + unit',
    supportedValues: null,
    description: 'Unit price measure.',
    example: '16 oz',
    requirement: 'Optional',
    dependencies: 'Both unit_pricing_measure and unit_pricing_base_measure required together',
    validationRules: [],
    wooCommerceMapping: {
      field: 'meta_data._unit_pricing_measure',
    },
    isAiEnrichable: false,
    category: 'price_promotions',
  },
  {
    attribute: 'unit_pricing_base_measure',
    dataType: 'Number + unit',
    supportedValues: null,
    description: 'Unit price base measure.',
    example: '1 oz',
    requirement: 'Optional',
    dependencies: 'Both fields required together',
    validationRules: [],
    wooCommerceMapping: {
      field: 'meta_data._unit_pricing_base_measure',
    },
    isAiEnrichable: false,
    category: 'price_promotions',
  },
  {
    attribute: 'pricing_trend',
    dataType: 'String',
    supportedValues: null,
    description: 'Lowest price information.',
    example: 'Lowest price in 6 months',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Max 80 characters'],
    wooCommerceMapping: null, // External data source
    isAiEnrichable: false,
    category: 'price_promotions',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: AVAILABILITY & INVENTORY
  // ═══════════════════════════════════════════════════════════════════════════
  
  {
    attribute: 'availability',
    dataType: 'Enum',
    supportedValues: 'in_stock, out_of_stock, preorder',
    description: 'Product availability status.',
    example: 'in_stock',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Must be lowercase string'],
    wooCommerceMapping: {
      field: 'stock_status',
      transform: 'mapStockStatus', // instock→in_stock, outofstock→out_of_stock, onbackorder→preorder
    },
    isAiEnrichable: false,
    category: 'availability_inventory',
  },
  {
    attribute: 'availability_date',
    dataType: 'Date',
    supportedValues: 'ISO 8601',
    description: 'Availability date if preorder.',
    example: '2025-12-01',
    requirement: 'Conditional',
    dependencies: 'Required if availability = preorder',
    validationRules: ['Must be future date', 'ISO 8601 format'],
    wooCommerceMapping: {
      field: 'meta_data._availability_date',
      fallback: 'backorders_allowed',
    },
    isAiEnrichable: false,
    category: 'availability_inventory',
  },
  {
    attribute: 'inventory_quantity',
    dataType: 'Integer',
    supportedValues: null,
    description: 'Stock count.',
    example: '25',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Non-negative integer'],
    wooCommerceMapping: {
      field: 'stock_quantity',
      transform: 'defaultToZero',
    },
    isAiEnrichable: false,
    category: 'availability_inventory',
  },
  {
    attribute: 'expiration_date',
    dataType: 'Date',
    supportedValues: 'ISO 8601',
    description: 'Remove product after this date.',
    example: '2025-12-01',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Must be future date'],
    wooCommerceMapping: {
      field: 'meta_data._expiration_date',
    },
    isAiEnrichable: false,
    category: 'availability_inventory',
  },
  {
    attribute: 'pickup_method',
    dataType: 'Enum',
    supportedValues: 'in_store, reserve, not_supported',
    description: 'Pickup options.',
    example: 'in_store',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Must be lowercase string'],
    wooCommerceMapping: {
      field: 'meta_data._pickup_method',
    },
    isAiEnrichable: false,
    category: 'availability_inventory',
  },
  {
    attribute: 'pickup_sla',
    dataType: 'Number + duration',
    supportedValues: null,
    description: 'Pickup SLA timeframe.',
    example: '1 day',
    requirement: 'Optional',
    dependencies: 'Requires pickup_method',
    validationRules: ['Positive integer + unit'],
    wooCommerceMapping: {
      field: 'meta_data._pickup_sla',
    },
    isAiEnrichable: false,
    category: 'availability_inventory',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: VARIANTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  {
    attribute: 'item_group_id',
    dataType: 'String',
    supportedValues: null,
    description: 'Variant group ID. Same value for all variants of a product.',
    example: 'SHOE123GROUP',
    requirement: 'Conditional',
    dependencies: 'Required if variants exist',
    validationRules: ['Max 70 characters'],
    wooCommerceMapping: {
      field: 'parent_id',
      transform: 'generateGroupId', // Uses parent_id for variations, or id for simple products
    },
    isAiEnrichable: false,
    category: 'variants',
  },
  {
    attribute: 'item_group_title',
    dataType: 'String (UTF-8 text)',
    supportedValues: null,
    description: 'Group product title.',
    example: "Men's Trail Running Shoes",
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Max 150 characters', 'Avoid all-caps'],
    wooCommerceMapping: {
      field: 'parent.name', // For variations, use parent product name
      fallback: 'name',
    },
    isAiEnrichable: false,
    category: 'variants',
  },
  {
    attribute: 'color',
    dataType: 'String',
    supportedValues: null,
    description: 'Variant color.',
    example: 'Blue',
    requirement: 'Recommended',
    dependencies: 'Recommended for apparel',
    validationRules: ['Max 40 characters'],
    wooCommerceMapping: {
      field: 'attributes.color',
      fallback: 'attributes.pa_color',
    },
    isAiEnrichable: false,
    category: 'variants',
  },
  {
    attribute: 'size',
    dataType: 'String',
    supportedValues: null,
    description: 'Variant size.',
    example: '10',
    requirement: 'Recommended',
    dependencies: 'Recommended for apparel',
    validationRules: ['Max 20 characters'],
    wooCommerceMapping: {
      field: 'attributes.size',
      fallback: 'attributes.pa_size',
    },
    isAiEnrichable: false,
    category: 'variants',
  },
  {
    attribute: 'size_system',
    dataType: 'Country code',
    supportedValues: 'ISO 3166',
    description: 'Size system.',
    example: 'US',
    requirement: 'Recommended',
    dependencies: 'Recommended for apparel',
    validationRules: ['2-letter country code'],
    wooCommerceMapping: {
      field: 'meta_data._size_system',
    },
    isAiEnrichable: false,
    category: 'variants',
  },
  {
    attribute: 'gender',
    dataType: 'Enum',
    supportedValues: 'male, female, unisex',
    description: 'Gender target.',
    example: 'male',
    requirement: 'Recommended',
    dependencies: 'Recommended for apparel',
    validationRules: ['Must be lowercase string'],
    wooCommerceMapping: {
      field: 'attributes.gender',
      fallback: 'meta_data._gender',
    },
    isAiEnrichable: false,
    category: 'variants',
  },
  {
    attribute: 'offer_id',
    dataType: 'String',
    supportedValues: null,
    description: 'Offer ID (SKU+seller+price).',
    example: 'SKU12345-Blue-79.99',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['Unique within feed'],
    wooCommerceMapping: {
      field: 'sku',
      transform: 'generateOfferId',
    },
    isAiEnrichable: false,
    category: 'variants',
  },
  {
    attribute: 'custom_variant1_category',
    dataType: 'String',
    supportedValues: null,
    description: 'Custom variant dimension 1 name.',
    example: 'Size_Type',
    requirement: 'Optional',
    dependencies: null,
    validationRules: [],
    wooCommerceMapping: {
      field: 'attributes[0].name',
      transform: 'extractCustomVariant',
    },
    isAiEnrichable: false,
    category: 'variants',
  },
  {
    attribute: 'custom_variant1_option',
    dataType: 'String',
    supportedValues: null,
    description: 'Custom variant 1 option value.',
    example: 'Petite',
    requirement: 'Optional',
    dependencies: null,
    validationRules: [],
    wooCommerceMapping: {
      field: 'attributes[0].option',
      transform: 'extractCustomVariantOption',
    },
    isAiEnrichable: false,
    category: 'variants',
  },
  {
    attribute: 'custom_variant2_category',
    dataType: 'String',
    supportedValues: null,
    description: 'Custom variant dimension 2 name.',
    example: 'Wood_Type',
    requirement: 'Optional',
    dependencies: null,
    validationRules: [],
    wooCommerceMapping: {
      field: 'attributes[1].name',
    },
    isAiEnrichable: false,
    category: 'variants',
  },
  {
    attribute: 'custom_variant2_option',
    dataType: 'String',
    supportedValues: null,
    description: 'Custom variant 2 option value.',
    example: 'Oak',
    requirement: 'Optional',
    dependencies: null,
    validationRules: [],
    wooCommerceMapping: {
      field: 'attributes[1].option',
    },
    isAiEnrichable: false,
    category: 'variants',
  },
  {
    attribute: 'custom_variant3_category',
    dataType: 'String',
    supportedValues: null,
    description: 'Custom variant dimension 3 name.',
    example: 'Cap_Type',
    requirement: 'Optional',
    dependencies: null,
    validationRules: [],
    wooCommerceMapping: {
      field: 'attributes[2].name',
    },
    isAiEnrichable: false,
    category: 'variants',
  },
  {
    attribute: 'custom_variant3_option',
    dataType: 'String',
    supportedValues: null,
    description: 'Custom variant 3 option value.',
    example: 'Snapback',
    requirement: 'Optional',
    dependencies: null,
    validationRules: [],
    wooCommerceMapping: {
      field: 'attributes[2].option',
    },
    isAiEnrichable: false,
    category: 'variants',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: FULFILLMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  {
    attribute: 'shipping',
    dataType: 'String',
    supportedValues: 'country:region:service_class:price',
    description: 'Shipping method/cost/region.',
    example: 'US:CA:Overnight:16.00 USD',
    requirement: 'Conditional',
    dependencies: 'Required where applicable',
    validationRules: ['Use colon separators', 'Multiple entries allowed'],
    wooCommerceMapping: {
      field: 'shipping_class',
      transform: 'buildShippingString',
    },
    isAiEnrichable: false,
    category: 'fulfillment',
  },
  {
    attribute: 'delivery_estimate',
    dataType: 'Date',
    supportedValues: 'ISO 8601',
    description: 'Estimated arrival date.',
    example: '2025-08-12',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Must be future date'],
    wooCommerceMapping: {
      field: 'meta_data._delivery_estimate',
    },
    isAiEnrichable: false,
    category: 'fulfillment',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: MERCHANT INFO
  // ═══════════════════════════════════════════════════════════════════════════
  
  {
    attribute: 'seller_name',
    dataType: 'String',
    supportedValues: null,
    description: 'Seller name.',
    example: 'Example Store',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Max 70 characters'],
    wooCommerceMapping: {
      shopField: 'sellerName',
      fallback: 'shopName',
    },
    isAiEnrichable: false,
    category: 'merchant_info',
  },
  {
    attribute: 'seller_url',
    dataType: 'URL',
    supportedValues: 'RFC 1738',
    description: 'Seller page URL.',
    example: 'https://example.com/store',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['HTTPS preferred'],
    wooCommerceMapping: {
      shopField: 'sellerUrl',
      fallback: 'wooStoreUrl',
    },
    isAiEnrichable: false,
    category: 'merchant_info',
  },
  {
    attribute: 'seller_privacy_policy',
    dataType: 'URL',
    supportedValues: 'RFC 1738',
    description: 'Seller-specific privacy policy.',
    example: 'https://example.com/privacy',
    requirement: 'Conditional',
    dependencies: 'Required if enable_checkout is true',
    validationRules: ['HTTPS preferred'],
    wooCommerceMapping: {
      shopField: 'sellerPrivacyPolicy',
    },
    isAiEnrichable: false,
    category: 'merchant_info',
  },
  {
    attribute: 'seller_tos',
    dataType: 'URL',
    supportedValues: 'RFC 1738',
    description: 'Seller-specific terms of service.',
    example: 'https://example.com/terms',
    requirement: 'Conditional',
    dependencies: 'Required if enable_checkout is true',
    validationRules: ['HTTPS preferred'],
    wooCommerceMapping: {
      shopField: 'sellerTos',
    },
    isAiEnrichable: false,
    category: 'merchant_info',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: RETURNS
  // ═══════════════════════════════════════════════════════════════════════════
  
  {
    attribute: 'return_policy',
    dataType: 'URL',
    supportedValues: 'RFC 1738',
    description: 'Return policy URL.',
    example: 'https://example.com/returns',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['HTTPS preferred'],
    wooCommerceMapping: {
      shopField: 'returnPolicy',
    },
    isAiEnrichable: false,
    category: 'returns',
  },
  {
    attribute: 'return_window',
    dataType: 'Integer',
    supportedValues: 'Days',
    description: 'Days allowed for return.',
    example: '30',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Positive integer'],
    wooCommerceMapping: {
      shopField: 'returnWindow',
    },
    isAiEnrichable: false,
    category: 'returns',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: PERFORMANCE SIGNALS
  // ═══════════════════════════════════════════════════════════════════════════
  
  {
    attribute: 'popularity_score',
    dataType: 'Number',
    supportedValues: null,
    description: 'Popularity indicator.',
    example: '4.7',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['0-5 scale or merchant-defined'],
    wooCommerceMapping: {
      field: 'total_sales',
      transform: 'calculatePopularityScore',
    },
    isAiEnrichable: false,
    category: 'performance_signals',
  },
  {
    attribute: 'return_rate',
    dataType: 'Number',
    supportedValues: 'Percentage',
    description: 'Return rate.',
    example: '2%',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['0-100%'],
    wooCommerceMapping: null, // External data
    isAiEnrichable: false,
    category: 'performance_signals',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: COMPLIANCE
  // ═══════════════════════════════════════════════════════════════════════════
  
  {
    attribute: 'warning',
    dataType: 'String',
    supportedValues: null,
    description: 'Product disclaimers or warnings.',
    example: 'Contains lithium battery',
    requirement: 'Recommended',
    dependencies: 'Recommended for Checkout',
    validationRules: [],
    wooCommerceMapping: {
      field: 'meta_data._warning',
    },
    isAiEnrichable: false,
    category: 'compliance',
  },
  {
    attribute: 'warning_url',
    dataType: 'URL',
    supportedValues: null,
    description: 'URL to warning/disclaimer page.',
    example: 'https://example.com/prop65',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['If URL, must resolve HTTP 200'],
    wooCommerceMapping: {
      field: 'meta_data._warning_url',
    },
    isAiEnrichable: false,
    category: 'compliance',
  },
  {
    attribute: 'age_restriction',
    dataType: 'Number',
    supportedValues: null,
    description: 'Minimum purchase age.',
    example: '21',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['Positive integer'],
    wooCommerceMapping: {
      field: 'meta_data._age_restriction',
    },
    isAiEnrichable: false,
    category: 'compliance',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: REVIEWS AND Q&A
  // ═══════════════════════════════════════════════════════════════════════════
  
  {
    attribute: 'product_review_count',
    dataType: 'Integer',
    supportedValues: null,
    description: 'Number of product reviews.',
    example: '254',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['Non-negative integer'],
    wooCommerceMapping: {
      field: 'rating_count',
    },
    isAiEnrichable: false,
    category: 'reviews_qanda',
  },
  {
    attribute: 'product_review_rating',
    dataType: 'Number',
    supportedValues: null,
    description: 'Average review score.',
    example: '4.6',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['0-5 scale'],
    wooCommerceMapping: {
      field: 'average_rating',
    },
    isAiEnrichable: false,
    category: 'reviews_qanda',
  },
  {
    attribute: 'store_review_count',
    dataType: 'Integer',
    supportedValues: null,
    description: 'Number of brand/store reviews.',
    example: '2000',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Non-negative integer'],
    wooCommerceMapping: {
      shopField: 'storeReviewCount',
    },
    isAiEnrichable: false,
    category: 'reviews_qanda',
  },
  {
    attribute: 'store_review_rating',
    dataType: 'Number',
    supportedValues: null,
    description: 'Average store rating.',
    example: '4.8',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['0-5 scale'],
    wooCommerceMapping: {
      shopField: 'storeReviewRating',
    },
    isAiEnrichable: false,
    category: 'reviews_qanda',
  },
  {
    attribute: 'q_and_a',
    dataType: 'String',
    supportedValues: null,
    description: 'FAQ content.',
    example: 'Q: Is this waterproof? A: Yes',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['Plain text format'],
    wooCommerceMapping: {
      field: 'meta_data._faq',
      transform: 'formatQAndA',
    },
    isAiEnrichable: true, // ✅ AI CAN ENRICH
    category: 'reviews_qanda',
  },
  {
    attribute: 'raw_review_data',
    dataType: 'String',
    supportedValues: null,
    description: 'Raw review payload.',
    example: '{"reviews": [...]}',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['May include JSON blob'],
    wooCommerceMapping: {
      field: 'meta_data._reviews_json',
    },
    isAiEnrichable: false,
    category: 'reviews_qanda',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: RELATED PRODUCTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  {
    attribute: 'related_product_id',
    dataType: 'String',
    supportedValues: null,
    description: 'Associated product IDs.',
    example: 'SKU67890',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['Comma-separated list allowed'],
    wooCommerceMapping: {
      field: 'related_ids',
      transform: 'formatRelatedIds',
      fallback: 'upsell_ids',
    },
    isAiEnrichable: false,
    category: 'related_products',
  },
  {
    attribute: 'relationship_type',
    dataType: 'Enum',
    supportedValues: 'part_of_set, required_part, often_bought_with, substitute, different_brand, accessory',
    description: 'Relationship type.',
    example: 'often_bought_with',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['Must be lowercase string'],
    wooCommerceMapping: {
      field: 'meta_data._relationship_type',
    },
    isAiEnrichable: false,
    category: 'related_products',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: GEO TAGGING
  // ═══════════════════════════════════════════════════════════════════════════
  
  {
    attribute: 'geo_price',
    dataType: 'Number + currency',
    supportedValues: 'Region-specific price',
    description: 'Price by region.',
    example: '79.99 USD (California)',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['Must include ISO 4217 currency'],
    wooCommerceMapping: null, // External/manual data
    isAiEnrichable: false,
    category: 'geo_tagging',
  },
  {
    attribute: 'geo_availability',
    dataType: 'String',
    supportedValues: 'Region-specific availability',
    description: 'Availability per region.',
    example: 'in_stock (Texas), out_of_stock (New York)',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['Regions must be valid ISO 3166 codes'],
    wooCommerceMapping: null, // External/manual data
    isAiEnrichable: false,
    category: 'geo_tagging',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

// Get all enrichable fields
export const AI_ENRICHABLE_FIELDS = OPENAI_FEED_SPEC.filter(f => f.isAiEnrichable);
// Result: ['title', 'description', 'product_category', 'q_and_a']

// Get required fields
export const REQUIRED_FIELDS = OPENAI_FEED_SPEC.filter(f => f.requirement === 'Required');

// Get fields by category
export const getFieldsByCategory = (category: OpenAIFieldCategory) => 
  OPENAI_FEED_SPEC.filter(f => f.category === category);

// Category display order and labels
export const CATEGORY_CONFIG: Record<OpenAIFieldCategory, { label: string; order: number }> = {
  flags: { label: 'OpenAI Flags', order: 1 },
  basic_product_data: { label: 'Basic Product Data', order: 2 },
  item_information: { label: 'Item Information', order: 3 },
  media: { label: 'Media', order: 4 },
  price_promotions: { label: 'Price & Promotions', order: 5 },
  availability_inventory: { label: 'Availability & Inventory', order: 6 },
  variants: { label: 'Variants', order: 7 },
  fulfillment: { label: 'Fulfillment', order: 8 },
  merchant_info: { label: 'Merchant Info', order: 9 },
  returns: { label: 'Returns', order: 10 },
  performance_signals: { label: 'Performance Signals', order: 11 },
  compliance: { label: 'Compliance', order: 12 },
  reviews_qanda: { label: 'Reviews & Q&A', order: 13 },
  related_products: { label: 'Related Products', order: 14 },
  geo_tagging: { label: 'Geo Tagging', order: 15 },
};
```

### 4.3 Field Statistics Summary

| Category | Total Fields | Required | AI Enrichable |
|----------|-------------|----------|---------------|
| OpenAI Flags | 2 | 2 | 0 |
| Basic Product Data | 6 | 4 | 2 (title, description) |
| Item Information | 9 | 3 | 1 (product_category) |
| Media | 4 | 1 | 0 |
| Price & Promotions | 6 | 1 | 0 |
| Availability & Inventory | 6 | 2 | 0 |
| Variants | 13 | 0 | 0 |
| Fulfillment | 2 | 0 | 0 |
| Merchant Info | 4 | 2 | 0 |
| Returns | 2 | 2 | 0 |
| Performance Signals | 2 | 0 | 0 |
| Compliance | 3 | 0 | 0 |
| Reviews & Q&A | 6 | 0 | 1 (q_and_a) |
| Related Products | 2 | 0 | 0 |
| Geo Tagging | 2 | 0 | 0 |
| **TOTAL** | **63** | **17** | **4** |

---

## 5. Database Schema

### 5.1 Core Tables

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// USER & AUTHENTICATION
// ============================================

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

model UserSettings {
  id                    String   @id @default(cuid())
  userId                String   @unique @map("user_id")
  notificationsEmail    Boolean  @default(true)
  timezone              String   @default("UTC")
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ============================================
// SHOP & WOOCOMMERCE CONNECTION
// ============================================

model Shop {
  id                  String      @id @default(cuid())
  userId              String      @map("user_id")
  
  // WooCommerce Connection
  wooStoreUrl         String      @map("woo_store_url")
  wooConsumerKey      String      @map("woo_consumer_key")
  wooConsumerSecret   String      @map("woo_consumer_secret") // Encrypted
  
  // Shop Info (from WooCommerce)
  shopName            String      @map("shop_name")
  shopCurrency        String      @default("USD") @map("shop_currency")
  shopWeightUnit      String      @default("kg") @map("shop_weight_unit")
  shopDimensionUnit   String      @default("cm") @map("shop_dimension_unit")
  isConnected         Boolean     @default(false)
  
  // Sync Configuration
  lastSyncAt          DateTime?   @map("last_sync_at")
  syncStatus          SyncStatus  @default(PENDING)
  syncEnabled         Boolean     @default(true)
  
  // Webhooks
  webhookId           String?     @map("webhook_id")
  webhookSecret       String?     @map("webhook_secret")
  
  // OpenAI Configuration
  openaiMerchantId    String?     @map("openai_merchant_id")
  openaiEndpoint      String?     @map("openai_endpoint")
  openaiToken         String?     @map("openai_token") // Encrypted
  openaiEnabled       Boolean     @default(false)
  
  // ─────────────────────────────────────────────────────────────
  // MERCHANT INFO (Used across all products - Shop level)
  // Maps to: seller_name, seller_url, seller_privacy_policy, seller_tos
  // ─────────────────────────────────────────────────────────────
  sellerName          String?     @map("seller_name")
  sellerUrl           String?     @map("seller_url")
  sellerPrivacyPolicy String?     @map("seller_privacy_policy")
  sellerTos           String?     @map("seller_tos")
  
  // ─────────────────────────────────────────────────────────────
  // RETURNS (Shop level - applies to all products)
  // Maps to: return_policy, return_window
  // ─────────────────────────────────────────────────────────────
  returnPolicy        String?     @map("return_policy")
  returnWindow        Int?        @map("return_window") // Days
  
  // ─────────────────────────────────────────────────────────────
  // STORE REVIEWS (Shop level)
  // Maps to: store_review_count, store_review_rating
  // ─────────────────────────────────────────────────────────────
  storeReviewCount    Int?        @map("store_review_count")
  storeReviewRating   Decimal?    @map("store_review_rating") @db.Decimal(2, 1)
  
  // ─────────────────────────────────────────────────────────────
  // DEFAULT SHIPPING (Can be overridden per product)
  // ─────────────────────────────────────────────────────────────
  defaultShipping     String?     @map("default_shipping")
  
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt

  user                User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  products            Product[]
  syncBatches         SyncBatch[]
  analytics           ShopAnalytics[]

  @@unique([userId, wooStoreUrl])
}

enum SyncStatus {
  PENDING
  SYNCING
  COMPLETED
  FAILED
  PAUSED
}

// ============================================
// PRODUCTS - THREE COLUMN DATA MODEL
// ============================================

model Product {
  id                  String      @id @default(cuid())
  shopId              String      @map("shop_id")
  wooProductId        Int         @map("woo_product_id")
  wooParentId         Int?        @map("woo_parent_id") // For variations
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RAW WOOCOMMERCE DATA (Imported from WooCommerce API)
  // This is the source data used to auto-fill OpenAI attributes
  // ═══════════════════════════════════════════════════════════════════════════
  
  wooName                 String      @map("woo_name")
  wooSlug                 String?     @map("woo_slug")
  wooPermalink            String?     @map("woo_permalink")
  wooType                 String?     @map("woo_type") // simple, variable, variation
  wooStatus               String?     @map("woo_status")
  wooDescription          String?     @map("woo_description") @db.Text
  wooShortDescription     String?     @map("woo_short_description") @db.Text
  wooSku                  String?     @map("woo_sku")
  wooPrice                String?     @map("woo_price")
  wooRegularPrice         String?     @map("woo_regular_price")
  wooSalePrice            String?     @map("woo_sale_price")
  wooDateOnSaleFrom       DateTime?   @map("woo_date_on_sale_from")
  wooDateOnSaleTo         DateTime?   @map("woo_date_on_sale_to")
  wooStockStatus          String?     @map("woo_stock_status")
  wooStockQuantity        Int?        @map("woo_stock_quantity")
  wooWeight               String?     @map("woo_weight")
  wooDimensionsLength     String?     @map("woo_dimensions_length")
  wooDimensionsWidth      String?     @map("woo_dimensions_width")
  wooDimensionsHeight     String?     @map("woo_dimensions_height")
  wooCategories           Json?       @map("woo_categories")
  wooTags                 Json?       @map("woo_tags")
  wooImages               Json?       @map("woo_images")
  wooAttributes           Json?       @map("woo_attributes")
  wooMetaData             Json?       @map("woo_meta_data")
  wooRelatedIds           Json?       @map("woo_related_ids")
  wooUpsellIds            Json?       @map("woo_upsell_ids")
  wooCrossSellIds         Json?       @map("woo_cross_sell_ids")
  wooRatingCount          Int?        @map("woo_rating_count")
  wooAverageRating        String?     @map("woo_average_rating")
  wooTotalSales           Int?        @map("woo_total_sales")
  wooShippingClass        String?     @map("woo_shipping_class")
  wooRawJson              Json?       @map("woo_raw_json")
  
  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO-FILLED VALUES (Computed from WooCommerce data via mapping transforms)
  // These are the values shown in Column 2 before any user edits
  // ═══════════════════════════════════════════════════════════════════════════
  
  autoId                  String?     @map("auto_id")
  autoGtin                String?     @map("auto_gtin")
  autoMpn                 String?     @map("auto_mpn")
  autoTitle               String?     @map("auto_title")
  autoDescription         String?     @map("auto_description") @db.Text
  autoLink                String?     @map("auto_link")
  autoCondition           String?     @map("auto_condition")
  autoProductCategory     String?     @map("auto_product_category")
  autoBrand               String?     @map("auto_brand")
  autoMaterial            String?     @map("auto_material")
  autoDimensions          String?     @map("auto_dimensions")
  autoLength              String?     @map("auto_length")
  autoWidth               String?     @map("auto_width")
  autoHeight              String?     @map("auto_height")
  autoWeight              String?     @map("auto_weight")
  autoAgeGroup            String?     @map("auto_age_group")
  autoImageLink           String?     @map("auto_image_link")
  autoAdditionalImageLink String?     @map("auto_additional_image_link") @db.Text
  autoVideoLink           String?     @map("auto_video_link")
  autoModel3dLink         String?     @map("auto_model_3d_link")
  autoPrice               String?     @map("auto_price")
  autoSalePrice           String?     @map("auto_sale_price")
  autoSalePriceEffective  String?     @map("auto_sale_price_effective")
  autoAvailability        String?     @map("auto_availability")
  autoAvailabilityDate    String?     @map("auto_availability_date")
  autoInventoryQuantity   Int?        @map("auto_inventory_quantity")
  autoItemGroupId         String?     @map("auto_item_group_id")
  autoItemGroupTitle      String?     @map("auto_item_group_title")
  autoColor               String?     @map("auto_color")
  autoSize                String?     @map("auto_size")
  autoSizeSystem          String?     @map("auto_size_system")
  autoGender              String?     @map("auto_gender")
  autoOfferId             String?     @map("auto_offer_id")
  autoShipping            String?     @map("auto_shipping")
  autoProductReviewCount  Int?        @map("auto_product_review_count")
  autoProductReviewRating String?     @map("auto_product_review_rating")
  autoRelatedProductId    String?     @map("auto_related_product_id")
  autoPopularityScore     String?     @map("auto_popularity_score")
  
  // ═══════════════════════════════════════════════════════════════════════════
  // USER EDITS (Manual overrides in Column 2)
  // When set, these override the auto-filled values
  // ═══════════════════════════════════════════════════════════════════════════
  
  editId                  String?     @map("edit_id")
  editGtin                String?     @map("edit_gtin")
  editMpn                 String?     @map("edit_mpn")
  editTitle               String?     @map("edit_title")
  editDescription         String?     @map("edit_description") @db.Text
  editLink                String?     @map("edit_link")
  editCondition           String?     @map("edit_condition")
  editProductCategory     String?     @map("edit_product_category")
  editBrand               String?     @map("edit_brand")
  editMaterial            String?     @map("edit_material")
  editDimensions          String?     @map("edit_dimensions")
  editLength              String?     @map("edit_length")
  editWidth               String?     @map("edit_width")
  editHeight              String?     @map("edit_height")
  editWeight              String?     @map("edit_weight")
  editAgeGroup            String?     @map("edit_age_group")
  editImageLink           String?     @map("edit_image_link")
  editAdditionalImageLink String?     @map("edit_additional_image_link") @db.Text
  editVideoLink           String?     @map("edit_video_link")
  editModel3dLink         String?     @map("edit_model_3d_link")
  editPrice               String?     @map("edit_price")
  editSalePrice           String?     @map("edit_sale_price")
  editSalePriceEffective  String?     @map("edit_sale_price_effective")
  editAvailability        String?     @map("edit_availability")
  editAvailabilityDate    String?     @map("edit_availability_date")
  editInventoryQuantity   Int?        @map("edit_inventory_quantity")
  editExpirationDate      String?     @map("edit_expiration_date")
  editPickupMethod        String?     @map("edit_pickup_method")
  editPickupSla           String?     @map("edit_pickup_sla")
  editItemGroupId         String?     @map("edit_item_group_id")
  editItemGroupTitle      String?     @map("edit_item_group_title")
  editColor               String?     @map("edit_color")
  editSize                String?     @map("edit_size")
  editSizeSystem          String?     @map("edit_size_system")
  editGender              String?     @map("edit_gender")
  editOfferId             String?     @map("edit_offer_id")
  editShipping            String?     @map("edit_shipping")
  editDeliveryEstimate    String?     @map("edit_delivery_estimate")
  editProductReviewCount  Int?        @map("edit_product_review_count")
  editProductReviewRating String?     @map("edit_product_review_rating")
  editQAndA               String?     @map("edit_q_and_a") @db.Text
  editRelatedProductId    String?     @map("edit_related_product_id")
  editRelationshipType    String?     @map("edit_relationship_type")
  editGeoPrice            String?     @map("edit_geo_price")
  editGeoAvailability     String?     @map("edit_geo_availability")
  editWarning             String?     @map("edit_warning")
  editWarningUrl          String?     @map("edit_warning_url")
  editAgeRestriction      Int?        @map("edit_age_restriction")
  editPopularityScore     String?     @map("edit_popularity_score")
  editReturnRate          String?     @map("edit_return_rate")
  editPricingTrend        String?     @map("edit_pricing_trend")
  editUnitPricingMeasure  String?     @map("edit_unit_pricing_measure")
  editUnitPricingBase     String?     @map("edit_unit_pricing_base")
  editRawReviewData       String?     @map("edit_raw_review_data") @db.Text
  editCustomVariant1Cat   String?     @map("edit_custom_variant1_cat")
  editCustomVariant1Opt   String?     @map("edit_custom_variant1_opt")
  editCustomVariant2Cat   String?     @map("edit_custom_variant2_cat")
  editCustomVariant2Opt   String?     @map("edit_custom_variant2_opt")
  editCustomVariant3Cat   String?     @map("edit_custom_variant3_cat")
  editCustomVariant3Opt   String?     @map("edit_custom_variant3_opt")
  editLastModified        DateTime?   @map("edit_last_modified")
  
  // ═══════════════════════════════════════════════════════════════════════════
  // AI ENRICHMENT (Column 3 - Only for enrichable fields)
  // Generated by GPT-4 on demand
  // ═══════════════════════════════════════════════════════════════════════════
  
  aiTitle               String?     @map("ai_title")
  aiDescription         String?     @map("ai_description") @db.Text
  aiProductCategory     String?     @map("ai_product_category")
  aiQAndA               String?     @map("ai_q_and_a") @db.Text
  aiKeywords            String[]    @map("ai_keywords") // Internal optimization
  aiEnrichedAt          DateTime?   @map("ai_enriched_at")
  aiEnrichmentError     String?     @map("ai_enrichment_error")
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SOURCE SELECTION (Which source to use for AI-enrichable fields)
  // Values: "woocommerce" (uses auto/edit) | "ai" (uses ai_*)
  // ═══════════════════════════════════════════════════════════════════════════
  
  selectedSources       Json        @default("{}") @map("selected_sources")
  // Example: { "title": "ai", "description": "woocommerce", "product_category": "ai", "q_and_a": "ai" }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // OPENAI FLAGS (User settings - Column 2)
  // ═══════════════════════════════════════════════════════════════════════════
  
  enableSearch          Boolean     @default(true) @map("enable_search")
  enableCheckout        Boolean     @default(false) @map("enable_checkout")
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS & VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  status                ProductStatus @default(DRAFT)
  syncStatus            SyncStatus  @default(PENDING) @map("sync_status")
  lastSyncedAt          DateTime?   @map("last_synced_at")
  syncError             String?     @map("sync_error")
  checksum              String?     // Hash for change detection
  isValid               Boolean     @default(false) @map("is_valid")
  validationErrors      Json?       @map("validation_errors") // Per-field validation results
  
  createdAt             DateTime    @default(now()) @map("created_at")
  updatedAt             DateTime    @updatedAt @map("updated_at")

  shop                  Shop        @relation(fields: [shopId], references: [id], onDelete: Cascade)
  analytics             ProductAnalytics[]

  @@unique([shopId, wooProductId])
  @@index([shopId, status])
  @@index([shopId, syncStatus])
  @@index([shopId, isValid])
}

enum ProductStatus {
  DRAFT           // Newly imported, not reviewed
  PENDING_REVIEW  // Has validation errors or needs attention
  READY           // Valid and ready to sync
  SYNCED          // Successfully synced to OpenAI
  EXCLUDED        // User excluded from sync
  ERROR           // Failed to sync
}

// ============================================
// SYNC MANAGEMENT
// ============================================

model SyncBatch {
  id                String      @id @default(cuid())
  shopId            String      @map("shop_id")
  status            SyncStatus  @default(PENDING)
  syncType          SyncType    @map("sync_type")
  totalProducts     Int         @default(0)
  processedProducts Int         @default(0) @map("processed_products")
  validProducts     Int         @default(0) @map("valid_products")
  failedProducts    Int         @default(0) @map("failed_products")
  startedAt         DateTime?
  completedAt       DateTime?
  errorLog          Json?
  feedFileUrl       String?     @map("feed_file_url")
  triggeredBy       String?     // user, webhook, schedule
  createdAt         DateTime    @default(now())

  shop Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)
}

enum SyncType {
  FULL
  INCREMENTAL
  SINGLE_PRODUCT
  MANUAL
}

model WebhookEvent {
  id          String    @id @default(cuid())
  shopId      String    @map("shop_id")
  eventType   String    @map("event_type")
  resourceId  Int?      @map("resource_id")
  payload     Json
  processed   Boolean   @default(false)
  processedAt DateTime? @map("processed_at")
  error       String?
  createdAt   DateTime  @default(now())

  @@index([shopId, processed])
}

// ============================================
// ANALYTICS
// ============================================

model ProductAnalytics {
  id                  String    @id @default(cuid())
  productId           String    @map("product_id")
  date                DateTime  @db.Date
  chatgptImpressions  Int       @default(0)
  chatgptClicks       Int       @default(0)
  chatgptConversions  Int       @default(0)
  chatgptRevenue      Decimal?  @db.Decimal(10, 2)
  
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@unique([productId, date])
}

model ShopAnalytics {
  id                  String    @id @default(cuid())
  shopId              String    @map("shop_id")
  date                DateTime  @db.Date
  totalProducts       Int       @default(0)
  validProducts       Int       @default(0)
  syncedProducts      Int       @default(0)
  enrichedProducts    Int       @default(0)
  chatgptImpressions  Int       @default(0)
  chatgptClicks       Int       @default(0)
  chatgptConversions  Int       @default(0)
  chatgptRevenue      Decimal?  @db.Decimal(10, 2)
  
  shop Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)
  
  @@unique([shopId, date])
}
```

---

## 6. Authentication & Authorization

### 6.1 Authentication Flow

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
```

### 6.2 JWT Token Structure

```typescript
interface AccessTokenPayload {
  sub: string;           // User ID
  email: string;
  tier: SubscriptionTier;
  iat: number;
  exp: number;           // 15 minutes
  type: 'access';
}

interface RefreshTokenPayload {
  sub: string;
  jti: string;           // Unique ID for revocation
  iat: number;
  exp: number;           // 7 days
  type: 'refresh';
}
```

---

## 7. WooCommerce Integration & Auto-Mapping

### 7.1 WooCommerce Client

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
  
  async fetchAllProducts(): Promise<WooProduct[]> {
    const allProducts: WooProduct[] = [];
    let page = 1;
    
    while (true) {
      const response = await this.api.get('products', {
        page,
        per_page: 100,
        status: 'publish',
      });
      
      allProducts.push(...response.data);
      
      const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1');
      if (page >= totalPages) break;
      page++;
    }
    
    return allProducts;
  }
  
  async getShopSettings(): Promise<ShopSettings> {
    const response = await this.api.get('settings/general');
    return {
      currency: response.data.find(s => s.id === 'woocommerce_currency')?.value,
      weightUnit: response.data.find(s => s.id === 'woocommerce_weight_unit')?.value,
      dimensionUnit: response.data.find(s => s.id === 'woocommerce_dimension_unit')?.value,
    };
  }
}
```

### 7.2 Auto-Fill Transform Functions

```typescript
// src/services/woocommerce/transforms.ts

import { Shop, Prisma } from '@prisma/client';
import { OPENAI_FEED_SPEC } from '../../config/openai-feed-spec';
import { stripHtml } from '../../lib/utils';

export class WooCommerceTransformer {
  constructor(private shop: Shop) {}
  
  // Main function to auto-fill all OpenAI attributes from WooCommerce data
  autoFillProduct(wooProd: WooProduct): Partial<Prisma.ProductCreateInput> {
    return {
      // Generate stable ID
      autoId: this.generateStableId(wooProd),
      
      // Basic Product Data
      autoGtin: this.extractGtin(wooProd),
      autoMpn: wooProd.sku || this.getMetaValue(wooProd, '_mpn'),
      autoTitle: wooProd.name,
      autoDescription: stripHtml(wooProd.description || wooProd.short_description || ''),
      autoLink: wooProd.permalink,
      
      // Item Information
      autoCondition: this.getMetaValue(wooProd, '_condition') || 'new',
      autoProductCategory: this.buildCategoryPath(wooProd.categories),
      autoBrand: this.extractBrand(wooProd),
      autoMaterial: this.extractAttribute(wooProd, 'material'),
      autoDimensions: this.formatDimensions(wooProd.dimensions),
      autoLength: this.addUnit(wooProd.dimensions?.length, this.shop.shopDimensionUnit),
      autoWidth: this.addUnit(wooProd.dimensions?.width, this.shop.shopDimensionUnit),
      autoHeight: this.addUnit(wooProd.dimensions?.height, this.shop.shopDimensionUnit),
      autoWeight: this.addUnit(wooProd.weight, this.shop.shopWeightUnit),
      autoAgeGroup: this.extractAttribute(wooProd, 'age_group'),
      
      // Media
      autoImageLink: wooProd.images?.[0]?.src || null,
      autoAdditionalImageLink: this.extractAdditionalImages(wooProd.images),
      autoVideoLink: this.getMetaValue(wooProd, '_video_url'),
      autoModel3dLink: this.getMetaValue(wooProd, '_3d_model'),
      
      // Price & Promotions
      autoPrice: this.formatPrice(wooProd.regular_price || wooProd.price),
      autoSalePrice: wooProd.sale_price ? this.formatPrice(wooProd.sale_price) : null,
      autoSalePriceEffective: this.formatSaleDateRange(wooProd),
      
      // Availability & Inventory
      autoAvailability: this.mapStockStatus(wooProd.stock_status),
      autoAvailabilityDate: this.getMetaValue(wooProd, '_availability_date'),
      autoInventoryQuantity: wooProd.stock_quantity ?? 0,
      
      // Variants
      autoItemGroupId: this.generateGroupId(wooProd),
      autoItemGroupTitle: wooProd.name,
      autoColor: this.extractAttribute(wooProd, 'color', 'pa_color'),
      autoSize: this.extractAttribute(wooProd, 'size', 'pa_size'),
      autoSizeSystem: this.getMetaValue(wooProd, '_size_system'),
      autoGender: this.extractAttribute(wooProd, 'gender'),
      autoOfferId: this.generateOfferId(wooProd),
      
      // Fulfillment
      autoShipping: this.buildShippingString(wooProd),
      
      // Reviews
      autoProductReviewCount: wooProd.rating_count ?? 0,
      autoProductReviewRating: wooProd.average_rating,
      
      // Related Products
      autoRelatedProductId: this.formatRelatedIds(wooProd),
      
      // Performance
      autoPopularityScore: this.calculatePopularityScore(wooProd),
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSFORM HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  private generateStableId(prod: WooProduct): string {
    // Format: SHOP_WOO{id}_{sku}
    const sku = prod.sku ? `_${prod.sku}` : '';
    return `${this.shop.id.slice(0, 8)}_WOO${prod.id}${sku}`;
  }
  
  private extractGtin(prod: WooProduct): string | null {
    const gtinFields = ['_gtin', 'gtin', '_barcode', 'barcode', '_upc', 'upc', '_ean', 'ean', '_isbn', 'isbn'];
    for (const field of gtinFields) {
      const value = this.getMetaValue(prod, field);
      if (value && /^\d{8,14}$/.test(value)) return value;
    }
    return null;
  }
  
  private extractBrand(prod: WooProduct): string | null {
    // Try WooCommerce Brands plugin
    if (prod.brands?.[0]?.name) return prod.brands[0].name;
    // Try attribute
    const brandAttr = this.extractAttribute(prod, 'brand', 'pa_brand');
    if (brandAttr) return brandAttr;
    // Try meta
    return this.getMetaValue(prod, '_brand');
  }
  
  private buildCategoryPath(categories: WooCategory[]): string {
    if (!categories?.length) return '';
    // Sort by parent to build hierarchy, then join
    const sorted = [...categories].sort((a, b) => (a.id || 0) - (b.id || 0));
    return sorted.map(c => c.name).join(' > ');
  }
  
  private formatDimensions(dims: WooDimensions | null): string | null {
    if (!dims?.length && !dims?.width && !dims?.height) return null;
    const unit = this.shop.shopDimensionUnit;
    return `${dims.length || 0}x${dims.width || 0}x${dims.height || 0} ${unit}`;
  }
  
  private addUnit(value: string | null | undefined, unit: string): string | null {
    if (!value || value === '0') return null;
    return `${value} ${unit}`;
  }
  
  private formatPrice(price: string | null | undefined): string | null {
    if (!price) return null;
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return null;
    return `${numPrice.toFixed(2)} ${this.shop.shopCurrency}`;
  }
  
  private formatSaleDateRange(prod: WooProduct): string | null {
    if (!prod.date_on_sale_from && !prod.date_on_sale_to) return null;
    const from = prod.date_on_sale_from?.split('T')[0] || '';
    const to = prod.date_on_sale_to?.split('T')[0] || '';
    if (!from || !to) return null;
    return `${from} / ${to}`;
  }
  
  private mapStockStatus(status: string | null): string {
    switch (status) {
      case 'instock': return 'in_stock';
      case 'outofstock': return 'out_of_stock';
      case 'onbackorder': return 'preorder';
      default: return 'in_stock';
    }
  }
  
  private generateGroupId(prod: WooProduct): string | null {
    // For variations, use parent_id; for variable products, use own id
    if (prod.parent_id && prod.parent_id > 0) {
      return `${this.shop.id.slice(0, 8)}_GRP${prod.parent_id}`;
    }
    if (prod.type === 'variable') {
      return `${this.shop.id.slice(0, 8)}_GRP${prod.id}`;
    }
    return null;
  }
  
  private generateOfferId(prod: WooProduct): string {
    const parts = [prod.sku || prod.id];
    const color = this.extractAttribute(prod, 'color');
    const size = this.extractAttribute(prod, 'size');
    if (color) parts.push(color);
    if (size) parts.push(size);
    parts.push(prod.price || '0');
    return parts.join('-');
  }
  
  private extractAdditionalImages(images: WooImage[] | null): string | null {
    if (!images || images.length <= 1) return null;
    return images.slice(1).map(img => img.src).join(',');
  }
  
  private extractAttribute(prod: WooProduct, ...names: string[]): string | null {
    for (const name of names) {
      const attr = prod.attributes?.find(a => 
        a.name?.toLowerCase() === name.toLowerCase() ||
        a.slug?.toLowerCase() === name.toLowerCase()
      );
      if (attr?.options?.[0]) return attr.options[0];
    }
    return null;
  }
  
  private getMetaValue(prod: WooProduct, key: string): string | null {
    const meta = prod.meta_data?.find(m => m.key === key);
    return meta?.value?.toString() || null;
  }
  
  private buildShippingString(prod: WooProduct): string | null {
    if (this.shop.defaultShipping) return this.shop.defaultShipping;
    if (prod.shipping_class) return prod.shipping_class;
    return null;
  }
  
  private formatRelatedIds(prod: WooProduct): string | null {
    const ids = [
      ...(prod.related_ids || []),
      ...(prod.upsell_ids || []),
    ];
    if (!ids.length) return null;
    // Convert to our ID format
    return ids.map(id => `${this.shop.id.slice(0, 8)}_WOO${id}`).join(',');
  }
  
  private calculatePopularityScore(prod: WooProduct): string | null {
    // Simple algorithm: combine sales and rating
    const sales = prod.total_sales || 0;
    const rating = parseFloat(prod.average_rating || '0');
    if (sales === 0 && rating === 0) return null;
    // Normalize to 0-5 scale
    const salesScore = Math.min(sales / 100, 5); // Cap at 500 sales = 5
    const combined = (salesScore + rating) / 2;
    return combined.toFixed(1);
  }
}
```

---

## 8. AI Enrichment Engine

### 8.1 Enrichment Service

The AI enrichment generates suggestions for the 4 enrichable fields only:

```typescript
// src/services/ai-enrichment/enrichmentService.ts

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface EnrichmentResult {
  title: string;
  description: string;
  productCategory: string;
  qAndA: string;
  keywords: string[];
}

export class AIEnrichmentService {
  
  async enrichProduct(product: Product, shop: Shop): Promise<EnrichmentResult> {
    // Get the current effective values (auto-filled or edited)
    const currentTitle = product.editTitle || product.autoTitle || product.wooName;
    const currentDescription = product.editDescription || product.autoDescription || '';
    const currentCategory = product.editProductCategory || product.autoProductCategory || '';
    
    const prompt = this.buildPrompt({
      title: currentTitle,
      description: currentDescription,
      category: currentCategory,
      price: product.autoPrice,
      brand: product.editBrand || product.autoBrand,
      attributes: product.wooAttributes,
      images: product.wooImages,
    });
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a product content specialist optimizing listings for ChatGPT Shopping.
          
Your task is to enhance 4 specific fields to maximize discoverability and conversion:

1. TITLE (max 150 chars): Clear, descriptive, includes key attributes. No ALL CAPS.
2. DESCRIPTION (max 5000 chars): Compelling, answers questions, plain text only.
3. PRODUCT_CATEGORY: Use ">" separator (e.g., "Apparel & Accessories > Shoes > Running")
4. Q_AND_A: 3-5 realistic questions customers ask, with helpful answers.

Also extract 5-10 search KEYWORDS for internal optimization.

Output valid JSON only, no markdown.`
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2500,
    });
    
    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    return {
      title: result.title || currentTitle,
      description: result.description || currentDescription,
      productCategory: result.product_category || currentCategory,
      qAndA: this.formatQAndA(result.q_and_a),
      keywords: result.keywords || [],
    };
  }
  
  private buildPrompt(data: any): string {
    return `Enhance this product listing for ChatGPT Shopping:

CURRENT DATA:
- Title: ${data.title}
- Description: ${data.description || '[No description]'}
- Category: ${data.category || '[No category]'}
- Price: ${data.price || 'Not specified'}
- Brand: ${data.brand || 'Unknown'}
- Attributes: ${JSON.stringify(data.attributes || [])}

Return JSON:
{
  "title": "Enhanced title (max 150 chars, no ALL CAPS)",
  "description": "Enhanced description (max 5000 chars, plain text)",
  "product_category": "Main Category > Subcategory > Sub-subcategory",
  "q_and_a": [
    {"q": "Question 1?", "a": "Answer 1"},
    {"q": "Question 2?", "a": "Answer 2"},
    {"q": "Question 3?", "a": "Answer 3"}
  ],
  "keywords": ["keyword1", "keyword2", "keyword3"]
}`;
  }
  
  private formatQAndA(qAndA: any[]): string {
    if (!qAndA || !Array.isArray(qAndA)) return '';
    return qAndA.map(item => `Q: ${item.q} A: ${item.a}`).join('\n');
  }
  
  async saveEnrichment(productId: string, result: EnrichmentResult): Promise<void> {
    await prisma.product.update({
      where: { id: productId },
      data: {
        aiTitle: result.title,
        aiDescription: result.description,
        aiProductCategory: result.productCategory,
        aiQAndA: result.qAndA,
        aiKeywords: result.keywords,
        aiEnrichedAt: new Date(),
        aiEnrichmentError: null,
      },
    });
  }
}
```

---

## 9. Feed Generation & Validation

### 9.1 Feed Value Resolver

Resolves the final value for each OpenAI attribute:

```typescript
// src/services/feed/valueResolver.ts

import { Product, Shop } from '@prisma/client';
import { OPENAI_FEED_SPEC, OpenAIFieldSpec } from '../../config/openai-feed-spec';

export class FeedValueResolver {
  private selectedSources: Record<string, string>;
  
  constructor(
    private product: Product,
    private shop: Shop
  ) {
    this.selectedSources = (product.selectedSources as Record<string, string>) || {};
  }
  
  // Get final value for any OpenAI attribute
  resolveAttribute(attribute: string): any {
    const spec = OPENAI_FEED_SPEC.find(f => f.attribute === attribute);
    if (!spec) return null;
    
    // For AI-enrichable fields, check source selection
    if (spec.isAiEnrichable) {
      const source = this.selectedSources[attribute] || 'woocommerce';
      if (source === 'ai') {
        const aiValue = this.getAiValue(attribute);
        if (aiValue) return aiValue;
      }
    }
    
    // For shop-level fields
    if (spec.wooCommerceMapping?.shopField) {
      return this.shop[spec.wooCommerceMapping.shopField as keyof Shop];
    }
    
    // For product fields: edit overrides auto
    return this.getEffectiveValue(attribute);
  }
  
  private getAiValue(attribute: string): any {
    const aiFieldMap: Record<string, keyof Product> = {
      'title': 'aiTitle',
      'description': 'aiDescription',
      'product_category': 'aiProductCategory',
      'q_and_a': 'aiQAndA',
    };
    const field = aiFieldMap[attribute];
    return field ? this.product[field] : null;
  }
  
  private getEffectiveValue(attribute: string): any {
    // Map OpenAI attribute to database fields
    const fieldName = this.camelCase(attribute);
    const editField = `edit${this.pascalCase(fieldName)}` as keyof Product;
    const autoField = `auto${this.pascalCase(fieldName)}` as keyof Product;
    
    // Edit overrides auto
    const editValue = this.product[editField];
    if (editValue !== null && editValue !== undefined) {
      return editValue;
    }
    
    return this.product[autoField];
  }
  
  private camelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
  
  private pascalCase(str: string): string {
    const camel = this.camelCase(str);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  }
  
  // Resolve all attributes for feed generation
  resolveAllAttributes(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const spec of OPENAI_FEED_SPEC) {
      const value = this.resolveAttribute(spec.attribute);
      if (value !== null && value !== undefined) {
        result[spec.attribute] = value;
      }
    }
    
    // Add flags
    result.enable_search = this.product.enableSearch ? 'true' : 'false';
    result.enable_checkout = this.product.enableCheckout ? 'true' : 'false';
    
    return result;
  }
}
```

### 9.2 Feed Validator

```typescript
// src/services/feed/validator.ts

import { OPENAI_FEED_SPEC, OpenAIFieldSpec } from '../../config/openai-feed-spec';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  attribute: string;
  rule: string;
  message: string;
}

export interface ValidationWarning {
  attribute: string;
  message: string;
}

export class FeedValidator {
  
  validateProduct(feedData: Record<string, any>, enableCheckout: boolean): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    for (const spec of OPENAI_FEED_SPEC) {
      const value = feedData[spec.attribute];
      
      // Check required fields
      if (spec.requirement === 'Required') {
        if (value === null || value === undefined || value === '') {
          errors.push({
            attribute: spec.attribute,
            rule: 'required',
            message: `${spec.attribute} is required`,
          });
          continue;
        }
      }
      
      // Check conditional requirements
      if (spec.requirement === 'Conditional') {
        const isMissing = value === null || value === undefined || value === '';
        
        // Check specific dependencies
        if (spec.attribute === 'mpn' && !feedData.gtin && isMissing) {
          errors.push({
            attribute: 'mpn',
            rule: 'conditional',
            message: 'MPN is required when GTIN is not provided',
          });
        }
        
        if (spec.attribute === 'availability_date' && feedData.availability === 'preorder' && isMissing) {
          errors.push({
            attribute: 'availability_date',
            rule: 'conditional',
            message: 'Availability date is required for preorder items',
          });
        }
        
        if ((spec.attribute === 'seller_privacy_policy' || spec.attribute === 'seller_tos') && enableCheckout && isMissing) {
          errors.push({
            attribute: spec.attribute,
            rule: 'conditional',
            message: `${spec.attribute} is required when checkout is enabled`,
          });
        }
      }
      
      // Skip further validation if no value
      if (value === null || value === undefined) continue;
      
      // Validate based on rules
      for (const rule of spec.validationRules) {
        const error = this.checkRule(spec.attribute, value, rule);
        if (error) errors.push(error);
      }
      
      // Add warnings for recommended fields
      if (spec.requirement === 'Recommended' && !value) {
        warnings.push({
          attribute: spec.attribute,
          message: `${spec.attribute} is recommended for better discoverability`,
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  private checkRule(attribute: string, value: any, rule: string): ValidationError | null {
    // Max length check
    const maxLengthMatch = rule.match(/Max (\d+) char/);
    if (maxLengthMatch) {
      const maxLength = parseInt(maxLengthMatch[1]);
      if (typeof value === 'string' && value.length > maxLength) {
        return {
          attribute,
          rule: 'maxLength',
          message: `${attribute} exceeds maximum length of ${maxLength} characters (current: ${value.length})`,
        };
      }
    }
    
    // Enum validation
    const enumMatch = rule.match(/Must be lowercase string/);
    if (enumMatch && typeof value === 'string' && value !== value.toLowerCase()) {
      return {
        attribute,
        rule: 'lowercase',
        message: `${attribute} must be lowercase`,
      };
    }
    
    // GTIN format
    if (rule.includes('8-14 digits')) {
      if (!/^\d{8,14}$/.test(value)) {
        return {
          attribute,
          rule: 'gtin_format',
          message: `${attribute} must be 8-14 digits with no dashes or spaces`,
        };
      }
    }
    
    // URL validation
    if (rule.includes('HTTPS preferred') || rule.includes('HTTP 200')) {
      try {
        const url = new URL(value);
        if (rule.includes('HTTPS') && url.protocol !== 'https:') {
          // Warning only, not error
        }
      } catch {
        return {
          attribute,
          rule: 'url_format',
          message: `${attribute} must be a valid URL`,
        };
      }
    }
    
    // All-caps check
    if (rule.includes('Avoid ALL CAPS') || rule.includes('avoid all-caps')) {
      if (typeof value === 'string' && value === value.toUpperCase() && value.length > 3) {
        return {
          attribute,
          rule: 'all_caps',
          message: `${attribute} should not be in ALL CAPS`,
        };
      }
    }
    
    // Non-negative integer
    if (rule.includes('Non-negative integer')) {
      if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
        return {
          attribute,
          rule: 'non_negative_integer',
          message: `${attribute} must be a non-negative integer`,
        };
      }
    }
    
    // Sale price validation
    if (rule.includes('Must be ≤ price')) {
      // This requires access to price field - handled separately
    }
    
    return null;
  }
}
```

### 9.3 Feed Generator

```typescript
// src/services/feed/generator.ts

import { Product, Shop } from '@prisma/client';
import { FeedValueResolver } from './valueResolver';
import { FeedValidator } from './validator';

export class FeedGenerator {
  
  async generateFeed(
    shop: Shop,
    products: Product[],
    format: 'json' | 'tsv' | 'csv' | 'xml' = 'json'
  ): Promise<GenerateFeedResult> {
    const feedItems: Record<string, any>[] = [];
    const errors: string[] = [];
    const validator = new FeedValidator();
    
    for (const product of products) {
      // Skip excluded products
      if (product.status === 'EXCLUDED') continue;
      
      // Resolve all attribute values
      const resolver = new FeedValueResolver(product, shop);
      const feedData = resolver.resolveAllAttributes();
      
      // Validate
      const validation = validator.validateProduct(feedData, product.enableCheckout);
      
      if (!validation.isValid) {
        errors.push(`Product ${product.id}: ${validation.errors.map(e => e.message).join(', ')}`);
        continue;
      }
      
      feedItems.push(feedData);
    }
    
    // Generate file in requested format
    let content: string;
    switch (format) {
      case 'tsv':
        content = this.generateTSV(feedItems);
        break;
      case 'csv':
        content = this.generateCSV(feedItems);
        break;
      case 'xml':
        content = this.generateXML(feedItems);
        break;
      default:
        content = JSON.stringify(feedItems, null, 2);
    }
    
    // Upload to storage
    const fileName = `feeds/${shop.id}/${Date.now()}.${format}`;
    const fileUrl = await uploadToStorage(fileName, content);
    
    return {
      fileUrl,
      productCount: feedItems.length,
      errors,
      format,
    };
  }
  
  private generateTSV(items: Record<string, any>[]): string {
    if (items.length === 0) return '';
    const headers = Object.keys(items[0]);
    const rows = items.map(item => 
      headers.map(h => this.escapeTSV(item[h])).join('\t')
    );
    return [headers.join('\t'), ...rows].join('\n');
  }
  
  private generateCSV(items: Record<string, any>[]): string {
    if (items.length === 0) return '';
    const headers = Object.keys(items[0]);
    const rows = items.map(item => 
      headers.map(h => this.escapeCSV(item[h])).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }
  
  private generateXML(items: Record<string, any>[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<products>\n';
    for (const item of items) {
      xml += '  <product>\n';
      for (const [key, value] of Object.entries(item)) {
        if (value !== null && value !== undefined) {
          xml += `    <${key}>${this.escapeXML(value)}</${key}>\n`;
        }
      }
      xml += '  </product>\n';
    }
    xml += '</products>';
    return xml;
  }
  
  private escapeTSV(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\t/g, ' ').replace(/\n/g, ' ');
  }
  
  private escapeCSV(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
  
  private escapeXML(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
```

---

## 10. API Specification

### 10.1 REST API Endpoints

```yaml
# Authentication
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me

# Shops
GET    /api/v1/shops
POST   /api/v1/shops
GET    /api/v1/shops/:id
PATCH  /api/v1/shops/:id
DELETE /api/v1/shops/:id
POST   /api/v1/shops/:id/oauth/callback
POST   /api/v1/shops/:id/verify
PUT    /api/v1/shops/:id/openai-config
PUT    /api/v1/shops/:id/merchant-info     # Update seller info, returns, etc.

# Products
GET    /api/v1/shops/:id/products                # List with filters
GET    /api/v1/shops/:id/products/:pid           # Full 3-column data
PATCH  /api/v1/shops/:id/products/:pid           # Update edits
PUT    /api/v1/shops/:id/products/:pid/sources   # Update source selection
POST   /api/v1/shops/:id/products/:pid/enrich    # Trigger AI enrichment
GET    /api/v1/shops/:id/products/:pid/preview   # Preview feed output
POST   /api/v1/shops/:id/products/:pid/validate  # Validate single product
POST   /api/v1/shops/:id/products/bulk-enrich    # Bulk AI enrichment
POST   /api/v1/shops/:id/products/bulk-update    # Bulk update

# OpenAI Spec Reference
GET    /api/v1/openai-spec                       # Get full spec definition
GET    /api/v1/openai-spec/categories            # Get categories list

# Sync
POST   /api/v1/shops/:id/sync
GET    /api/v1/shops/:id/sync/status
GET    /api/v1/shops/:id/sync/history
POST   /api/v1/shops/:id/feed/generate           # Generate feed file
POST   /api/v1/shops/:id/feed/push               # Push to OpenAI
GET    /api/v1/shops/:id/feed/preview
GET    /api/v1/shops/:id/feed/download/:format

# Webhooks
POST   /api/v1/webhooks/woocommerce/:shopId

# Analytics
GET    /api/v1/shops/:id/analytics/overview
GET    /api/v1/shops/:id/analytics/products
GET    /api/v1/shops/:id/analytics/timeline
```

### 10.2 Key Endpoint: Get Product (3-Column Data)

```typescript
// GET /api/v1/shops/:id/products/:pid

// Response
{
  "id": "prod_abc123",
  "shopId": "shop_xyz",
  "wooProductId": 456,
  "status": "READY",
  "isValid": true,
  
  // Organized by OpenAI categories
  "attributes": {
    "flags": [
      {
        "spec": {
          "attribute": "enable_search",
          "dataType": "Enum",
          "supportedValues": "true, false",
          "description": "Controls whether the product can be surfaced in ChatGPT search results.",
          "example": "true",
          "requirement": "Required",
          "dependencies": null,
          "validationRules": ["Must be lowercase string \"true\" or \"false\""]
        },
        "woocommerceData": {
          "autoFilled": null,
          "edited": null,
          "effective": "true",
          "sourceField": null,
          "isValid": true,
          "validationError": null
        },
        "aiEnrichment": null  // Not AI enrichable
      }
    ],
    "basic_product_data": [
      {
        "spec": {
          "attribute": "title",
          "dataType": "String (UTF-8 text)",
          "supportedValues": null,
          "description": "Product title. Avoid all-caps.",
          "example": "Men's Trail Running Shoes Black",
          "requirement": "Required",
          "dependencies": null,
          "validationRules": ["Max 150 characters", "Avoid ALL CAPS"]
        },
        "woocommerceData": {
          "autoFilled": "Running Shoe",
          "edited": null,
          "effective": "Running Shoe",
          "sourceField": "name",
          "isValid": true,
          "validationError": null
        },
        "aiEnrichment": {
          "value": "Men's Lightweight Trail Running Shoes - Breathable Athletic Sneakers",
          "isSelected": false,
          "generatedAt": "2025-12-13T10:00:00Z"
        }
      },
      // ... more fields
    ],
    // ... all 15 categories
  },
  
  // Summary
  "validationSummary": {
    "totalFields": 63,
    "validFields": 58,
    "invalidFields": 2,
    "missingRequired": 1,
    "warnings": 5
  },
  
  "selectedSources": {
    "title": "woocommerce",
    "description": "woocommerce", 
    "product_category": "ai",
    "q_and_a": "ai"
  },
  
  "timestamps": {
    "createdAt": "2025-12-01T00:00:00Z",
    "updatedAt": "2025-12-13T10:00:00Z",
    "lastSyncedAt": null,
    "aiEnrichedAt": "2025-12-13T10:00:00Z"
  }
}
```

---

## 11. Frontend Specification

### 11.1 Page Structure

```
/
├── (auth)/
│   ├── login/
│   ├── register/
│   └── forgot-password/
│
├── (dashboard)/
│   ├── page.tsx                      # Redirect to shops
│   ├── shops/
│   │   ├── page.tsx                  # Shop list
│   │   ├── new/                      # Connect wizard
│   │   └── [shopId]/
│   │       ├── page.tsx              # Shop overview
│   │       ├── products/
│   │       │   ├── page.tsx          # Product list
│   │       │   └── [productId]/
│   │       │       └── page.tsx      # 3-Column Product Editor
│   │       ├── merchant-info/        # Seller settings
│   │       ├── sync/                 # Sync status
│   │       ├── analytics/            # Analytics
│   │       └── settings/             # Shop settings
│   └── settings/                     # User settings
```

### 11.2 Three-Column Product Editor

```tsx
// app/(dashboard)/shops/[shopId]/products/[productId]/page.tsx

export default function ProductEditorPage({ params }) {
  const { data: product } = useProduct(params.productId);
  const [editedValues, setEditedValues] = useState({});
  const [selectedSources, setSelectedSources] = useState(product?.selectedSources || {});
  
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <PageHeader>
        <Breadcrumbs items={['Products', product.autoTitle]} />
        <div className="flex gap-2">
          <ValidationBadge 
            valid={product.validationSummary.invalidFields === 0}
            errors={product.validationSummary.invalidFields}
          />
          <Button variant="outline" onClick={handlePreview}>Preview Feed</Button>
          <Button onClick={handleSave} disabled={!hasChanges}>Save</Button>
        </div>
      </PageHeader>
      
      {/* Validation Summary */}
      <ValidationSummaryBar summary={product.validationSummary} />
      
      {/* Main 3-Column Layout */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-12 gap-0">
          
          {/* Column 1: OpenAI Specification (3 cols) */}
          <div className="col-span-3 border-r bg-gray-50 overflow-y-auto">
            <ColumnHeader title="OpenAI Specification" />
            <CategoryAccordion categories={product.attributes} />
          </div>
          
          {/* Column 2: WooCommerce Data (5 cols) */}
          <div className="col-span-5 border-r overflow-y-auto">
            <ColumnHeader 
              title="WooCommerce Data" 
              subtitle="Auto-filled • Editable"
            />
            <EditableFieldsList 
              categories={product.attributes}
              editedValues={editedValues}
              onEdit={setEditedValues}
              selectedSources={selectedSources}
              onSelectSource={(attr) => handleSelectSource(attr, 'woocommerce')}
            />
          </div>
          
          {/* Column 3: AI Enrichment (4 cols) */}
          <div className="col-span-4 bg-blue-50/30 overflow-y-auto">
            <ColumnHeader 
              title="AI Enrichment"
              action={
                <Button size="sm" onClick={handleEnrich} loading={isEnriching}>
                  <Sparkles className="w-4 h-4 mr-1" />
                  {product.timestamps.aiEnrichedAt ? 'Regenerate' : 'Generate'}
                </Button>
              }
            />
            <AIEnrichmentPanel
              categories={product.attributes}
              selectedSources={selectedSources}
              onSelectSource={(attr) => handleSelectSource(attr, 'ai')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 11.3 Category Accordion Component

```tsx
// components/product-editor/CategoryAccordion.tsx

export function CategoryAccordion({ categories }: Props) {
  return (
    <Accordion type="multiple" defaultValue={['flags', 'basic_product_data']}>
      {Object.entries(CATEGORY_CONFIG)
        .sort((a, b) => a[1].order - b[1].order)
        .map(([key, config]) => (
          <AccordionItem key={key} value={key}>
            <AccordionTrigger className="px-4">
              <div className="flex items-center gap-2">
                <span>{config.label}</span>
                <Badge variant="outline" className="text-xs">
                  {categories[key]?.length || 0}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 p-2">
                {categories[key]?.map(attr => (
                  <SpecFieldCard key={attr.spec.attribute} field={attr} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
    </Accordion>
  );
}
```

### 11.4 Spec Field Card (Column 1)

```tsx
// components/product-editor/SpecFieldCard.tsx

export function SpecFieldCard({ field }: { field: AttributeData }) {
  const { spec, woocommerceData } = field;
  
  return (
    <div className={cn(
      "p-3 rounded-lg border text-sm",
      !woocommerceData.isValid && "border-red-300 bg-red-50"
    )}>
      {/* Attribute Name + Requirement */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{spec.attribute}</span>
        <RequirementBadge requirement={spec.requirement} />
      </div>
      
      {/* Data Type */}
      <div className="text-xs text-gray-500 mb-1">
        Type: {spec.dataType}
      </div>
      
      {/* Supported Values */}
      {spec.supportedValues && (
        <div className="text-xs text-gray-500 mb-1">
          Values: {spec.supportedValues}
        </div>
      )}
      
      {/* Description */}
      <p className="text-xs text-gray-600 mb-2">{spec.description}</p>
      
      {/* Example */}
      <div className="text-xs">
        <span className="text-gray-500">Example: </span>
        <code className="bg-gray-100 px-1 rounded">{spec.example}</code>
      </div>
      
      {/* Validation Rules */}
      {spec.validationRules.length > 0 && (
        <div className="mt-2 text-xs">
          <span className="text-gray-500">Rules:</span>
          <ul className="list-disc list-inside text-gray-600">
            {spec.validationRules.map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Dependencies */}
      {spec.dependencies && (
        <div className="mt-2 text-xs text-amber-600">
          ⚠️ {spec.dependencies}
        </div>
      )}
      
      {/* Validation Error */}
      {!woocommerceData.isValid && woocommerceData.validationError && (
        <div className="mt-2 text-xs text-red-600">
          ❌ {woocommerceData.validationError}
        </div>
      )}
    </div>
  );
}
```

### 11.5 Editable Field Row (Column 2)

```tsx
// components/product-editor/EditableFieldRow.tsx

export function EditableFieldRow({ 
  field, 
  editedValue, 
  onEdit, 
  isSelected, 
  onSelect,
  showSourceSelector 
}: Props) {
  const { spec, woocommerceData } = field;
  const effectiveValue = editedValue ?? woocommerceData.effective;
  const hasEdit = editedValue !== undefined && editedValue !== null;
  
  return (
    <div className={cn(
      "p-3 border-b",
      isSelected && "bg-blue-50 border-l-4 border-l-blue-500",
      !woocommerceData.isValid && "bg-red-50"
    )}>
      {/* Header: Field name + Source selector */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{spec.attribute}</span>
          {hasEdit && (
            <Badge variant="outline" className="text-xs">Edited</Badge>
          )}
        </div>
        {showSourceSelector && (
          <RadioGroup value={isSelected ? 'woo' : ''} onValueChange={onSelect}>
            <RadioGroupItem value="woo" />
          </RadioGroup>
        )}
      </div>
      
      {/* Source indicator */}
      {woocommerceData.sourceField && (
        <div className="text-xs text-gray-400 mb-1">
          From: {woocommerceData.sourceField}
        </div>
      )}
      
      {/* Original value (if edited) */}
      {hasEdit && woocommerceData.autoFilled && (
        <div className="text-xs text-gray-400 mb-1 line-through">
          {truncate(woocommerceData.autoFilled, 50)}
        </div>
      )}
      
      {/* Input field */}
      <FieldInput
        spec={spec}
        value={effectiveValue}
        onChange={onEdit}
        isInvalid={!woocommerceData.isValid}
      />
      
      {/* Character count for text fields */}
      {spec.validationRules.some(r => r.includes('Max')) && (
        <CharacterCount 
          current={(effectiveValue || '').length}
          max={extractMaxLength(spec.validationRules)}
        />
      )}
    </div>
  );
}
```

### 11.6 AI Field Row (Column 3)

```tsx
// components/product-editor/AIFieldRow.tsx

export function AIFieldRow({ 
  field, 
  isSelected, 
  onSelect 
}: Props) {
  const { spec, aiEnrichment } = field;
  
  // Only render for AI-enrichable fields
  if (!spec.isAiEnrichable) {
    return (
      <div className="p-3 border-b bg-gray-50/50">
        <span className="text-xs text-gray-400">Not AI enrichable</span>
      </div>
    );
  }
  
  if (!aiEnrichment?.value) {
    return (
      <div className="p-3 border-b">
        <span className="text-xs text-gray-500">
          Click "Generate" to get AI suggestion
        </span>
      </div>
    );
  }
  
  return (
    <div className={cn(
      "p-3 border-b",
      isSelected && "bg-blue-100 border-l-4 border-l-blue-600"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <span className="font-medium text-sm">{spec.attribute}</span>
        </div>
        <RadioGroup value={isSelected ? 'ai' : ''} onValueChange={onSelect}>
          <RadioGroupItem value="ai" />
        </RadioGroup>
      </div>
      
      {/* AI Value Display */}
      {spec.attribute === 'q_and_a' ? (
        <QAndADisplay value={aiEnrichment.value} />
      ) : (
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {aiEnrichment.value}
        </p>
      )}
      
      {/* Timestamp */}
      <div className="text-xs text-gray-400 mt-2">
        Generated: {formatDate(aiEnrichment.generatedAt)}
      </div>
    </div>
  );
}
```

---

## 12. Background Jobs & Scheduling

### 12.1 Job Queues

```typescript
export const queues = {
  productImport: new Queue('product-import'),
  autoFill: new Queue('auto-fill'),
  aiEnrichment: new Queue('ai-enrichment'),
  feedGeneration: new Queue('feed-generation'),
  validation: new Queue('validation'),
  analytics: new Queue('analytics'),
  webhooks: new Queue('webhooks'),
};
```

### 12.2 Import & Auto-Fill Worker

```typescript
// src/workers/importWorker.ts

const importWorker = new Worker('product-import', async (job) => {
  const { shopId, type } = job.data;
  
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  const wooClient = new WooCommerceClient(shop);
  const transformer = new WooCommerceTransformer(shop);
  
  // Fetch products
  const wooProducts = type === 'incremental' && shop.lastSyncAt
    ? await wooClient.fetchModifiedProducts(shop.lastSyncAt)
    : await wooClient.fetchAllProducts();
  
  for (const wooProd of wooProducts) {
    // Store raw WooCommerce data
    const wooData = extractWooData(wooProd);
    
    // Auto-fill OpenAI attributes
    const autoFilledData = transformer.autoFillProduct(wooProd);
    
    // Upsert product
    await prisma.product.upsert({
      where: { shopId_wooProductId: { shopId, wooProductId: wooProd.id } },
      create: {
        shopId,
        wooProductId: wooProd.id,
        ...wooData,
        ...autoFilledData,
        selectedSources: {
          title: 'woocommerce',
          description: 'woocommerce',
          product_category: 'woocommerce',
          q_and_a: 'woocommerce',
        },
        status: 'DRAFT',
      },
      update: {
        ...wooData,
        ...autoFilledData,
        updatedAt: new Date(),
      },
    });
    
    // Queue validation
    await queues.validation.add('validate', { productId: product.id });
  }
});
```

---

## 13. Analytics & Tracking

(Same as before - overview, timeline, top products endpoints)

---

## 14. Security Requirements

- JWT authentication (15 min access, 7 day refresh)
- Password hashing (bcrypt cost 12)
- Encryption at rest for API keys
- Input validation (Zod)
- Rate limiting
- Webhook signature verification
- HTTPS only

---

## 15. Deployment & Infrastructure

### 15.1 Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### 15.2 Environment Variables

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
ENCRYPTION_KEY=...
OPENAI_API_KEY=sk-...
S3_BUCKET=...
```

---

## Appendix A: Complete OpenAI Field Summary

| # | Attribute | Category | Required | AI Enrichable | WooCommerce Mapping |
|---|-----------|----------|----------|---------------|-------------------|
| 1 | enable_search | Flags | ✅ | ❌ | User setting |
| 2 | enable_checkout | Flags | ✅ | ❌ | User setting |
| 3 | id | Basic | ✅ | ❌ | id + sku |
| 4 | gtin | Basic | Rec | ❌ | meta_data |
| 5 | mpn | Basic | Cond | ❌ | sku |
| 6 | title | Basic | ✅ | ✅ | name |
| 7 | description | Basic | ✅ | ✅ | description |
| 8 | link | Basic | ✅ | ❌ | permalink |
| 9 | condition | Item | Cond | ❌ | meta_data |
| 10 | product_category | Item | ✅ | ✅ | categories |
| 11 | brand | Item | Cond | ❌ | brands/attributes |
| 12 | material | Item | ✅ | ❌ | attributes |
| 13 | dimensions | Item | Opt | ❌ | dimensions |
| 14 | length | Item | Opt | ❌ | dimensions.length |
| 15 | width | Item | Opt | ❌ | dimensions.width |
| 16 | height | Item | Opt | ❌ | dimensions.height |
| 17 | weight | Item | ✅ | ❌ | weight |
| 18 | age_group | Item | Opt | ❌ | attributes |
| 19 | image_link | Media | ✅ | ❌ | images[0] |
| 20 | additional_image_link | Media | Opt | ❌ | images[1+] |
| 21 | video_link | Media | Opt | ❌ | meta_data |
| 22 | model_3d_link | Media | Opt | ❌ | meta_data |
| 23 | price | Price | ✅ | ❌ | regular_price |
| 24 | sale_price | Price | Opt | ❌ | sale_price |
| 25 | sale_price_effective_date | Price | Opt | ❌ | date_on_sale |
| 26 | unit_pricing_measure | Price | Opt | ❌ | meta_data |
| 27 | unit_pricing_base_measure | Price | Opt | ❌ | meta_data |
| 28 | pricing_trend | Price | Opt | ❌ | - |
| 29 | availability | Avail | ✅ | ❌ | stock_status |
| 30 | availability_date | Avail | Cond | ❌ | meta_data |
| 31 | inventory_quantity | Avail | ✅ | ❌ | stock_quantity |
| 32 | expiration_date | Avail | Opt | ❌ | meta_data |
| 33 | pickup_method | Avail | Opt | ❌ | meta_data |
| 34 | pickup_sla | Avail | Opt | ❌ | meta_data |
| 35 | item_group_id | Variants | Cond | ❌ | parent_id |
| 36 | item_group_title | Variants | Opt | ❌ | parent.name |
| 37 | color | Variants | Rec | ❌ | attributes |
| 38 | size | Variants | Rec | ❌ | attributes |
| 39 | size_system | Variants | Rec | ❌ | meta_data |
| 40 | gender | Variants | Rec | ❌ | attributes |
| 41 | offer_id | Variants | Rec | ❌ | sku |
| 42 | custom_variant1_category | Variants | Opt | ❌ | attributes |
| 43 | custom_variant1_option | Variants | Opt | ❌ | attributes |
| 44 | custom_variant2_category | Variants | Opt | ❌ | attributes |
| 45 | custom_variant2_option | Variants | Opt | ❌ | attributes |
| 46 | custom_variant3_category | Variants | Opt | ❌ | attributes |
| 47 | custom_variant3_option | Variants | Opt | ❌ | attributes |
| 48 | shipping | Fulfill | Cond | ❌ | shipping_class |
| 49 | delivery_estimate | Fulfill | Opt | ❌ | meta_data |
| 50 | seller_name | Merchant | ✅ | ❌ | Shop.sellerName |
| 51 | seller_url | Merchant | ✅ | ❌ | Shop.sellerUrl |
| 52 | seller_privacy_policy | Merchant | Cond | ❌ | Shop setting |
| 53 | seller_tos | Merchant | Cond | ❌ | Shop setting |
| 54 | return_policy | Returns | ✅ | ❌ | Shop.returnPolicy |
| 55 | return_window | Returns | ✅ | ❌ | Shop.returnWindow |
| 56 | popularity_score | Perf | Rec | ❌ | total_sales |
| 57 | return_rate | Perf | Rec | ❌ | - |
| 58 | warning | Compliance | Rec | ❌ | meta_data |
| 59 | warning_url | Compliance | Opt | ❌ | meta_data |
| 60 | age_restriction | Compliance | Rec | ❌ | meta_data |
| 61 | product_review_count | Reviews | Rec | ❌ | rating_count |
| 62 | product_review_rating | Reviews | Rec | ❌ | average_rating |
| 63 | store_review_count | Reviews | Opt | ❌ | Shop setting |
| 64 | store_review_rating | Reviews | Opt | ❌ | Shop setting |
| 65 | q_and_a | Reviews | Rec | ✅ | meta_data |
| 66 | raw_review_data | Reviews | Rec | ❌ | meta_data |
| 67 | related_product_id | Related | Rec | ❌ | related_ids |
| 68 | relationship_type | Related | Rec | ❌ | meta_data |
| 69 | geo_price | Geo | Rec | ❌ | - |
| 70 | geo_availability | Geo | Rec | ❌ | - |

**Summary: 70 total attributes, 17 required, 4 AI-enrichable**

---

**End of Technical Specification v2.1**
