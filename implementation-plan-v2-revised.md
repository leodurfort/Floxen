# Implementation Plan: OpenAI Feed Complete Specification V2

## Overview

Implement complete OpenAI Product Feed specification with **63 attributes** across **15 categories**, featuring a transparent 3-column interface that shows:

1. **Column 1**: OpenAI Specification (all field metadata)
2. **Column 2**: WooCommerce Data (auto-filled + manually editable)
3. **Column 3**: AI Enrichment (only for 4 enrichable fields)

**Current State**: Basic 5-field enrichment system
**Target State**: Complete 63-attribute OpenAI feed with full transparency and control

---

## 1. Key Insights from V2 Specification

### 1.1 Attribute Breakdown

**Total Fields**: 63 OpenAI feed attributes

**AI-Enrichable Fields**: Only 4 fields
- `title`
- `description`
- `product_category`
- `q_and_a`

**Required Fields**: 17 fields that must be present in feed

**All Other Fields** (59 fields):
- Auto-filled from WooCommerce using mapping logic
- Users can manually edit any auto-filled value
- No AI enrichment (just data mapping)

### 1.2 Categories (15 total)

1. OpenAI Flags (2 fields)
2. Basic Product Data (6 fields) - 2 AI-enrichable
3. Item Information (9 fields) - 1 AI-enrichable
4. Media (4 fields)
5. Price & Promotions (6 fields)
6. Availability & Inventory (6 fields)
7. Variants (13 fields)
8. Fulfillment (2 fields)
9. Merchant Info (4 fields)
10. Returns (2 fields)
11. Performance Signals (2 fields)
12. Compliance (3 fields)
13. Reviews & Q&A (6 fields) - 1 AI-enrichable
14. Related Products (2 fields)
15. Geo Tagging (2 fields)

### 1.3 Three-Column Data Model

```
┌─────────────────────────────────────────────────────────────────┐
│ COLUMN 1: OpenAI Spec      │ COLUMN 2: WooCommerce │ COLUMN 3: │
│ (Static Reference)          │ (Auto + Edit)         │ AI        │
├─────────────────────────────┼───────────────────────┼───────────┤
│ • attribute name            │ • auto-filled value   │ Only for  │
│ • dataType                  │ • edited value        │ 4 fields: │
│ • supportedValues           │ • effective value     │ - title   │
│ • description               │ • source field        │ - desc    │
│ • example                   │ • validation status   │ - category│
│ • requirement               │ • [Edit] button       │ - q_and_a │
│ • dependencies              │ • [Use] button        │           │
│ • validationRules           │                       │ AI value  │
│ • wooCommerceMapping        │                       │ [Use]     │
└─────────────────────────────┴───────────────────────┴───────────┘
```

**Value Resolution Logic**:
```typescript
For AI-enrichable fields (4 fields):
  if (selectedSource === 'ai' && aiValue) return aiValue;
  else return effectiveValue (editedValue ?? autoFilledValue);

For non-enrichable fields (59 fields):
  return effectiveValue (editedValue ?? autoFilledValue);
```

---

## 2. Implementation Phases

### PHASE 1: Core Data Structure (Days 1-2)

#### Task 1.1: Create OpenAI Feed Specification File

**File**: `apps/api/src/config/openai-feed-spec.ts` (NEW)

**Content**: Complete specification for all 63 attributes based on V2 spec

```typescript
export interface OpenAIFieldSpec {
  attribute: string;
  dataType: string;
  supportedValues: string | null;
  description: string;
  example: string;
  requirement: 'Required' | 'Recommended' | 'Optional' | 'Conditional';
  dependencies: string | null;
  validationRules: string[];
  wooCommerceMapping: WooCommerceMapping | null;
  isAiEnrichable: boolean;
  category: OpenAIFieldCategory;
}

export interface WooCommerceMapping {
  field: string;           // e.g., "name", "price", "meta_data.gtin"
  transform?: string;      // Transform function name
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

export const OPENAI_FEED_SPEC: OpenAIFieldSpec[] = [
  // Copy all 63 field definitions from V2 spec
  // ... (full specification)
];

export const AI_ENRICHABLE_FIELDS = OPENAI_FEED_SPEC.filter(f => f.isAiEnrichable);
export const REQUIRED_FIELDS = OPENAI_FEED_SPEC.filter(f => f.requirement === 'Required');
export const getFieldsByCategory = (category: OpenAIFieldCategory) =>
  OPENAI_FEED_SPEC.filter(f => f.category === category);
```

**Mirror file for frontend**: `packages/shared/src/openai-feed-spec.ts`

#### Task 1.2: Update Database Schema

**File**: `apps/api/prisma/schema.prisma`

**Changes**: Store ALL 63 OpenAI attributes with auto-filled and edited values

```prisma
model Product {
  id                  String      @id @default(cuid())
  shopId              String      @map("shop_id")

  // WooCommerce Raw Data (for mapping)
  wooProductId        Int         @map("woo_product_id")
  wooRawJson          Json?       @map("woo_raw_json") // Full WooCommerce API response

  // OpenAI Feed Attributes (Auto-filled + Edited)
  // Stored as JSON for flexibility with 63 fields
  openaiAutoFilled    Json        @default("{}") @map("openai_auto_filled")
  openaiEdited        Json        @default("{}") @map("openai_edited")

  // AI Enrichment (Only 4 fields)
  aiTitle             String?     @map("ai_title")
  aiDescription       String?     @map("ai_description") @db.Text
  aiCategory          String?     @map("ai_category")
  aiQAndA             Json?       @map("ai_q_and_a")
  aiEnrichedAt        DateTime?   @map("ai_enriched_at")

  // Source Selection (Only 4 fields)
  selectedSources     Json        @default("{}") @map("selected_sources")
  // Format: { "title": "ai"|"woo", "description": "ai"|"woo", ... }

  // Validation Status
  validationErrors    Json?       @map("validation_errors")
  isValid             Boolean     @default(false)

  // Sync Status
  status              ProductStatus @default(DRAFT)
  syncStatus          SyncStatus  @default(PENDING)
  lastSyncedAt        DateTime?   @map("last_synced_at")
  feedEnableSearch    Boolean     @default(true)
  feedEnableCheckout  Boolean     @default(false)

  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt

  shop                Shop        @relation(fields: [shopId], references: [id])

  @@unique([shopId, wooProductId])
  @@index([shopId, status])
}
```

**Rationale for JSON storage**:
- Avoids creating 63+ individual columns
- Flexible schema for future OpenAI spec changes
- Auto-filled and edited values stored separately
- Easy to compute effectiveValue = edited ?? autoFilled

**Migration**:
```bash
cd apps/api
npx prisma migrate dev --name add_openai_feed_complete_spec
npx prisma generate
```

---

### PHASE 2: Auto-Fill Mapping Engine (Days 3-4)

#### Task 2.1: Create Transform Functions

**File**: `apps/api/src/services/woocommerce/transforms.ts` (NEW)

**Purpose**: Transform WooCommerce data to OpenAI format

```typescript
// Transform function registry
export const TRANSFORMS: Record<string, (value: any, wooProduct: any, shop: Shop) => any> = {

  generateStableId: (_, wooProduct, shop) => {
    return `${shop.id}-${wooProduct.id}-${wooProduct.sku || ''}`;
  },

  stripHtml: (value) => {
    return value?.replace(/<[^>]*>/g, '') || '';
  },

  buildCategoryPath: (categories) => {
    if (!categories || !Array.isArray(categories)) return '';
    return categories.map(cat => cat.name).join(' > ');
  },

  extractGtin: (metaData) => {
    // Look for gtin, barcode, upc, ean, isbn in meta_data
    const gtin = metaData?.find((m: any) =>
      ['_gtin', 'gtin', '_upc', 'upc', '_ean', 'ean', '_isbn', 'isbn'].includes(m.key)
    );
    return gtin?.value || null;
  },

  formatPrice: (price, _, shop) => {
    if (!price) return `0.00 ${shop.shopCurrency}`;
    return `${parseFloat(price).toFixed(2)} ${shop.shopCurrency}`;
  },

  mapAvailability: (stockStatus) => {
    const map: Record<string, string> = {
      'instock': 'in_stock',
      'outofstock': 'out_of_stock',
      'onbackorder': 'preorder',
    };
    return map[stockStatus] || 'in_stock';
  },

  formatDimensions: (dimensions) => {
    if (!dimensions) return null;
    const { length, width, height, unit } = dimensions;
    return `${length}x${width}x${height} ${unit || 'in'}`;
  },

  addWeightUnit: (weight, _, shop) => {
    if (!weight) return null;
    // Get weight unit from shop settings or default
    const unit = shop.weightUnit || 'lb';
    return `${weight} ${unit}`;
  },

  extractAdditionalImages: (images) => {
    if (!Array.isArray(images) || images.length <= 1) return [];
    return images.slice(1).map(img => img.src).filter(Boolean);
  },

  extractBrand: (brands, wooProduct) => {
    // WooCommerce Brands plugin support
    if (brands && Array.isArray(brands) && brands.length > 0) {
      return brands[0].name;
    }
    // Fallback to attributes
    const brandAttr = wooProduct.attributes?.find((a: any) =>
      a.name.toLowerCase() === 'brand'
    );
    return brandAttr?.options?.[0] || null;
  },

  defaultToNew: (value) => {
    return value || 'new';
  },

  // ... add all other transform functions
};
```

#### Task 2.2: Create Auto-Fill Service

**File**: `apps/api/src/services/autoFillService.ts` (NEW)

**Purpose**: Apply mapping logic to fill OpenAI attributes from WooCommerce data

```typescript
import { OPENAI_FEED_SPEC } from '../config/openai-feed-spec';
import { TRANSFORMS } from './woocommerce/transforms';

export class AutoFillService {

  constructor(private shop: Shop) {}

  /**
   * Auto-fill all OpenAI attributes from WooCommerce product data
   */
  autoFillProduct(wooProduct: any): Record<string, any> {
    const autoFilled: Record<string, any> = {};

    for (const spec of OPENAI_FEED_SPEC) {
      const value = this.fillField(spec, wooProduct);
      if (value !== null && value !== undefined) {
        autoFilled[spec.attribute] = value;
      }
    }

    return autoFilled;
  }

  /**
   * Fill a single field based on its mapping spec
   */
  private fillField(spec: OpenAIFieldSpec, wooProduct: any): any {
    const mapping = spec.wooCommerceMapping;

    // No mapping = null (user must provide manually)
    if (!mapping) return null;

    // Shop-level field (e.g., seller_name)
    if (mapping.shopField) {
      return this.shop[mapping.shopField as keyof Shop] || null;
    }

    // Extract value from WooCommerce product
    let value = this.extractValue(wooProduct, mapping.field);

    // Try fallback if primary is empty
    if (!value && mapping.fallback) {
      value = this.extractValue(wooProduct, mapping.fallback);
    }

    // Apply transform function if specified
    if (value && mapping.transform) {
      const transformFn = TRANSFORMS[mapping.transform];
      if (transformFn) {
        value = transformFn(value, wooProduct, this.shop);
      }
    }

    return value;
  }

  /**
   * Extract nested value from object using dot notation
   * e.g., "meta_data.gtin", "dimensions.length", "images[0].src"
   */
  private extractValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) return null;

      // Handle array indexing (e.g., images[0])
      const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayKey, index] = arrayMatch;
        current = current[arrayKey]?.[parseInt(index)];
      } else {
        current = current[key];
      }
    }

    return current;
  }
}
```

#### Task 2.3: Update WooCommerce Sync Worker

**File**: `apps/api/src/workers/productSyncWorker.ts`

**Changes**: Use AutoFillService when importing products

```typescript
import { AutoFillService } from '../services/autoFillService';

const productSyncWorker = new Worker('product-sync', async (job) => {
  const { shopId } = job.data;
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });

  const wooClient = new WooCommerceClient(shop);
  const wooProducts = await wooClient.fetchAllProducts();

  const autoFillService = new AutoFillService(shop);

  for (const wooProd of wooProducts) {
    // Auto-fill OpenAI attributes
    const openaiAutoFilled = autoFillService.autoFillProduct(wooProd);

    // Upsert product
    await prisma.product.upsert({
      where: {
        shopId_wooProductId: { shopId, wooProductId: wooProd.id }
      },
      create: {
        shopId,
        wooProductId: wooProd.id,
        wooRawJson: wooProd,
        openaiAutoFilled,
        openaiEdited: {},
        selectedSources: {},
      },
      update: {
        wooRawJson: wooProd,
        openaiAutoFilled,
        // Preserve existing edited values
      },
    });
  }

  logger.info('Product sync complete', { shopId, count: wooProducts.length });
});
```

---

### PHASE 3: Validation Engine (Day 5)

#### Task 3.1: Create Validator

**File**: `apps/api/src/services/validationService.ts` (NEW)

**Purpose**: Validate OpenAI fields based on spec rules

```typescript
import { OPENAI_FEED_SPEC, REQUIRED_FIELDS } from '../config/openai-feed-spec';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>; // field -> error messages
}

export class ValidationService {

  /**
   * Validate all OpenAI fields for a product
   */
  validateProduct(
    autoFilled: Record<string, any>,
    edited: Record<string, any>,
    aiValues: { title?: string; description?: string; category?: string; qAndA?: any },
    selectedSources: Record<string, 'ai' | 'woo'>
  ): ValidationResult {

    const errors: Record<string, string[]> = {};

    // Compute effective values
    const effectiveValues = this.computeEffectiveValues(
      autoFilled,
      edited,
      aiValues,
      selectedSources
    );

    // Validate each field
    for (const spec of OPENAI_FEED_SPEC) {
      const value = effectiveValues[spec.attribute];
      const fieldErrors = this.validateField(spec, value, effectiveValues);

      if (fieldErrors.length > 0) {
        errors[spec.attribute] = fieldErrors;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Validate a single field
   */
  private validateField(
    spec: OpenAIFieldSpec,
    value: any,
    allValues: Record<string, any>
  ): string[] {
    const errors: string[] = [];

    // Required field check
    if (spec.requirement === 'Required' && !value) {
      errors.push(`${spec.attribute} is required`);
      return errors; // No point checking other rules if missing
    }

    // Conditional requirement check
    if (spec.requirement === 'Conditional' && spec.dependencies) {
      // TODO: Parse and evaluate dependency conditions
    }

    // Skip validation if field is empty and optional
    if (!value) return errors;

    // Apply validation rules
    for (const rule of spec.validationRules) {
      const error = this.applyValidationRule(rule, value, spec);
      if (error) errors.push(error);
    }

    return errors;
  }

  /**
   * Apply a single validation rule
   */
  private applyValidationRule(
    rule: string,
    value: any,
    spec: OpenAIFieldSpec
  ): string | null {

    // Max character rules
    if (rule.startsWith('Max ') && rule.includes('characters')) {
      const match = rule.match(/Max (\d+) characters/);
      if (match) {
        const max = parseInt(match[1]);
        if (typeof value === 'string' && value.length > max) {
          return `Exceeds maximum ${max} characters`;
        }
      }
    }

    // Enum validation
    if (spec.dataType === 'Enum' && spec.supportedValues) {
      const allowed = spec.supportedValues.split(',').map(v => v.trim());
      if (!allowed.includes(value)) {
        return `Must be one of: ${spec.supportedValues}`;
      }
    }

    // URL validation
    if (spec.dataType === 'URL') {
      try {
        new URL(value);
      } catch {
        return 'Invalid URL format';
      }
    }

    // Number validation
    if (spec.dataType.includes('Number')) {
      if (isNaN(parseFloat(value))) {
        return 'Must be a valid number';
      }
    }

    // Add more validation rules as needed

    return null;
  }

  /**
   * Compute effective values (resolved from auto-fill, edited, and AI)
   */
  private computeEffectiveValues(
    autoFilled: Record<string, any>,
    edited: Record<string, any>,
    aiValues: any,
    selectedSources: Record<string, 'ai' | 'woo'>
  ): Record<string, any> {

    const effective: Record<string, any> = {};

    for (const spec of OPENAI_FEED_SPEC) {
      const attr = spec.attribute;

      // For AI-enrichable fields, check selectedSource
      if (spec.isAiEnrichable) {
        const source = selectedSources[attr] || 'woo';
        if (source === 'ai' && aiValues[attr]) {
          effective[attr] = aiValues[attr];
        } else {
          effective[attr] = edited[attr] ?? autoFilled[attr];
        }
      } else {
        // For non-enrichable fields, edited takes priority
        effective[attr] = edited[attr] ?? autoFilled[attr];
      }
    }

    return effective;
  }
}
```

---

### PHASE 4: Backend API Updates (Days 6-7)

#### Task 4.1: Update Product Controller

**File**: `apps/api/src/controllers/productController.ts`

**New Endpoint**: Get product with 3-column data

```typescript
export async function getProductWithColumns(req: Request, res: Response) {
  const { id, pid } = req.params;

  const product = await prisma.product.findUnique({
    where: { id: pid },
    include: { shop: true },
  });

  if (!product) return res.status(404).json({ error: 'Product not found' });

  // Column 1: OpenAI Spec (static)
  const openaiSpec = OPENAI_FEED_SPEC;

  // Column 2: WooCommerce data (auto-filled + edited)
  const autoFilled = product.openaiAutoFilled as Record<string, any>;
  const edited = product.openaiEdited as Record<string, any>;

  // Compute effective values
  const effectiveValues: Record<string, any> = {};
  for (const spec of OPENAI_FEED_SPEC) {
    effectiveValues[spec.attribute] = edited[spec.attribute] ?? autoFilled[spec.attribute];
  }

  // Column 3: AI enrichment (only 4 fields)
  const aiValues = {
    title: product.aiTitle,
    description: product.aiDescription,
    product_category: product.aiCategory,
    q_and_a: product.aiQAndA,
  };

  // Selected sources
  const selectedSources = product.selectedSources as Record<string, 'ai' | 'woo'>;

  // Validation
  const validator = new ValidationService();
  const validation = validator.validateProduct(
    autoFilled,
    edited,
    aiValues,
    selectedSources
  );

  // Response with 3-column data
  res.json({
    product: {
      id: product.id,
      wooProductId: product.wooProductId,
      shopId: product.shopId,

      // Column 1: Spec (frontend will use this to display all metadata)
      openaiSpec,

      // Column 2: WooCommerce data
      autoFilled,
      edited,
      effectiveValues,

      // Column 3: AI
      aiValues,
      aiEnrichedAt: product.aiEnrichedAt,

      // Source selection
      selectedSources,

      // Validation
      validation,

      // Flags
      feedEnableSearch: product.feedEnableSearch,
      feedEnableCheckout: product.feedEnableCheckout,

      // Status
      status: product.status,
      syncStatus: product.syncStatus,
      lastSyncedAt: product.lastSyncedAt,
    },
  });
}
```

**New Endpoint**: Update edited field

```typescript
export async function updateEditedField(req: Request, res: Response) {
  const { id, pid } = req.params;
  const { attribute, value } = req.body;

  // Validate attribute exists in spec
  const spec = OPENAI_FEED_SPEC.find(f => f.attribute === attribute);
  if (!spec) {
    return res.status(400).json({ error: 'Invalid attribute' });
  }

  // Get product
  const product = await prisma.product.findUnique({ where: { id: pid } });
  if (!product) return res.status(404).json({ error: 'Product not found' });

  // Update edited field
  const edited = product.openaiEdited as Record<string, any>;
  edited[attribute] = value;

  // Validate
  const validator = new ValidationService();
  const validation = validator.validateProduct(
    product.openaiAutoFilled as any,
    edited,
    { /* AI values */ },
    product.selectedSources as any
  );

  // Update database
  await prisma.product.update({
    where: { id: pid },
    data: {
      openaiEdited: edited,
      validationErrors: validation.errors,
      isValid: validation.isValid,
    },
  });

  res.json({ success: true, validation });
}
```

**Existing Endpoints to Update**:
- `triggerEnrichment` - only enriches 4 fields
- `updateSelectedSource` - only for 4 enrichable fields

#### Task 4.2: Update Feed Service

**File**: `apps/api/src/services/feedService.ts`

**Changes**: Generate feed using effective values

```typescript
export function generateFeedPayload(shop: Shop, products: Product[]) {
  const items = products
    .filter(p => p.feedEnableSearch)
    .map(p => {
      const autoFilled = p.openaiAutoFilled as Record<string, any>;
      const edited = p.openaiEdited as Record<string, any>;
      const selectedSources = p.selectedSources as Record<string, 'ai' | 'woo'>;

      // AI values
      const aiValues = {
        title: p.aiTitle,
        description: p.aiDescription,
        product_category: p.aiCategory,
        q_and_a: p.aiQAndA,
      };

      // Compute final values
      const finalValues: Record<string, any> = {};

      for (const spec of OPENAI_FEED_SPEC) {
        const attr = spec.attribute;

        if (spec.isAiEnrichable) {
          // Check selected source
          const source = selectedSources[attr] || 'woo';
          if (source === 'ai' && aiValues[attr as keyof typeof aiValues]) {
            finalValues[attr] = aiValues[attr as keyof typeof aiValues];
          } else {
            finalValues[attr] = edited[attr] ?? autoFilled[attr];
          }
        } else {
          // Non-enrichable: edited takes priority
          finalValues[attr] = edited[attr] ?? autoFilled[attr];
        }
      }

      return finalValues;
    });

  return {
    version: '1.0',
    items,
  };
}
```

---

### PHASE 5: Frontend - Shared Config (Day 8)

#### Task 5.1: Create Shared Spec File

**File**: `packages/shared/src/openai-feed-spec.ts` (NEW)

Copy the entire spec from backend (`apps/api/src/config/openai-feed-spec.ts`) to frontend for type safety and UI rendering.

#### Task 5.2: Update Shared Types

**File**: `packages/shared/src/index.ts`

```typescript
export interface Product {
  id: string;
  wooProductId: number;
  shopId: string;

  // OpenAI Feed Data
  openaiAutoFilled: Record<string, any>;
  openaiEdited: Record<string, any>;

  // AI Enrichment (only 4 fields)
  aiTitle?: string | null;
  aiDescription?: string | null;
  aiCategory?: string | null;
  aiQAndA?: Array<{ q: string; a: string }> | null;
  aiEnrichedAt?: string | null;

  // Source selection (only 4 enrichable fields)
  selectedSources: Record<string, 'ai' | 'woo'>;

  // Validation
  validationErrors: Record<string, string[]>;
  isValid: boolean;

  // Flags
  feedEnableSearch: boolean;
  feedEnableCheckout: boolean;

  // Status
  status: ProductStatus;
  syncStatus: SyncStatus;
  lastSyncedAt?: string | null;
}
```

---

### PHASE 6: Frontend - 3-Column UI (Days 9-12)

#### Task 6.1: Product Detail Page Structure

**File**: `apps/web/src/app/shops/[id]/products/[pid]/page.tsx`

**Complete redesign with category accordion + 3-column view**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { OPENAI_FEED_SPEC, CATEGORY_CONFIG, getFieldsByCategory } from '@productsynch/shared/openai-feed-spec';
import { Accordion } from '@/components/ui/accordion';
import { SpecFieldCard } from '@/components/product/SpecFieldCard';
import { EditableFieldRow } from '@/components/product/EditableFieldRow';
import { AIFieldRow } from '@/components/product/AIFieldRow';

export default function ProductDetailPage({ params }: { params: { id: string; pid: string } }) {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch product with 3-column data
    fetchProduct(params.id, params.pid);
  }, [params]);

  if (loading) return <div>Loading...</div>;

  // Group fields by category
  const categories = Object.keys(CATEGORY_CONFIG).map(cat => ({
    id: cat as OpenAIFieldCategory,
    label: CATEGORY_CONFIG[cat as OpenAIFieldCategory].label,
    order: CATEGORY_CONFIG[cat as OpenAIFieldCategory].order,
    fields: getFieldsByCategory(cat as OpenAIFieldCategory),
  })).sort((a, b) => a.order - b.order);

  return (
    <div className="container mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">
          {product.effectiveValues.title || 'Product Details'}
        </h1>
        <div className="flex gap-2 mt-2">
          <Button onClick={handleEnrich}>Generate AI Suggestions</Button>
          <Button onClick={handleValidate}>Validate Feed</Button>
        </div>
      </header>

      {/* Category Accordion */}
      <Accordion type="multiple" defaultValue={['basic_product_data']}>
        {categories.map(category => (
          <AccordionItem key={category.id} value={category.id}>
            <AccordionTrigger>
              <div className="flex items-center justify-between w-full">
                <span>{category.label}</span>
                <span className="text-sm text-gray-500">
                  {category.fields.length} fields
                </span>
              </div>
            </AccordionTrigger>

            <AccordionContent>
              <div className="space-y-4">
                {category.fields.map(spec => (
                  <div key={spec.attribute} className="grid grid-cols-3 gap-4 border-b pb-4">

                    {/* COLUMN 1: OpenAI Spec */}
                    <SpecFieldCard spec={spec} />

                    {/* COLUMN 2: WooCommerce Data (Auto + Edit) */}
                    <EditableFieldRow
                      spec={spec}
                      autoFilledValue={product.autoFilled[spec.attribute]}
                      editedValue={product.edited[spec.attribute]}
                      effectiveValue={product.effectiveValues[spec.attribute]}
                      onEdit={handleEdit}
                      validationErrors={product.validation.errors[spec.attribute]}
                    />

                    {/* COLUMN 3: AI Enrichment (only if enrichable) */}
                    {spec.isAiEnrichable ? (
                      <AIFieldRow
                        spec={spec}
                        aiValue={product.aiValues[spec.attribute]}
                        isSelected={product.selectedSources[spec.attribute] === 'ai'}
                        onSelectAI={() => handleSelectSource(spec.attribute, 'ai')}
                      />
                    ) : (
                      <div className="flex items-center justify-center text-gray-400">
                        <span className="text-sm">Not AI-enrichable</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
```

#### Task 6.2: SpecFieldCard Component

**File**: `apps/web/src/components/product/SpecFieldCard.tsx` (NEW)

```typescript
interface SpecFieldCardProps {
  spec: OpenAIFieldSpec;
}

export function SpecFieldCard({ spec }: SpecFieldCardProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold text-sm mb-2">{spec.attribute}</h3>

      <dl className="space-y-1 text-xs">
        <dt className="text-gray-600">Data Type:</dt>
        <dd className="font-mono">{spec.dataType}</dd>

        {spec.supportedValues && (
          <>
            <dt className="text-gray-600">Supported Values:</dt>
            <dd className="font-mono text-xs">{spec.supportedValues}</dd>
          </>
        )}

        <dt className="text-gray-600">Requirement:</dt>
        <dd>
          <Badge variant={spec.requirement === 'Required' ? 'destructive' : 'secondary'}>
            {spec.requirement}
          </Badge>
        </dd>

        <dt className="text-gray-600">Description:</dt>
        <dd className="text-gray-700">{spec.description}</dd>

        <dt className="text-gray-600">Example:</dt>
        <dd className="font-mono text-gray-600">{spec.example}</dd>

        {spec.dependencies && (
          <>
            <dt className="text-gray-600">Dependencies:</dt>
            <dd className="text-xs text-orange-600">{spec.dependencies}</dd>
          </>
        )}

        {spec.validationRules.length > 0 && (
          <>
            <dt className="text-gray-600">Validation Rules:</dt>
            <dd>
              <ul className="list-disc list-inside text-xs">
                {spec.validationRules.map((rule, i) => (
                  <li key={i}>{rule}</li>
                ))}
              </ul>
            </dd>
          </>
        )}

        {spec.wooCommerceMapping && (
          <>
            <dt className="text-gray-600">WooCommerce Mapping:</dt>
            <dd className="font-mono text-xs text-blue-600">
              {spec.wooCommerceMapping.field}
              {spec.wooCommerceMapping.transform && ` → ${spec.wooCommerceMapping.transform}()`}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
```

#### Task 6.3: EditableFieldRow Component

**File**: `apps/web/src/components/product/EditableFieldRow.tsx` (NEW)

```typescript
interface EditableFieldRowProps {
  spec: OpenAIFieldSpec;
  autoFilledValue: any;
  editedValue: any;
  effectiveValue: any;
  onEdit: (attribute: string, value: any) => void;
  validationErrors?: string[];
}

export function EditableFieldRow({
  spec,
  autoFilledValue,
  editedValue,
  effectiveValue,
  onEdit,
  validationErrors,
}: EditableFieldRowProps) {

  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(effectiveValue || '');

  const handleSave = () => {
    onEdit(spec.attribute, value);
    setIsEditing(false);
  };

  return (
    <div className="p-4 bg-white rounded-lg border">
      <div className="mb-2 text-xs text-gray-500">
        {autoFilledValue && (
          <div>Auto-filled from: {spec.wooCommerceMapping?.field}</div>
        )}
      </div>

      {isEditing ? (
        <>
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mb-2"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-2">
            <div className="font-mono text-sm">{effectiveValue || <span className="text-gray-400">Empty</span>}</div>
            {editedValue && (
              <div className="text-xs text-blue-600 mt-1">✏️ Manually edited</div>
            )}
          </div>
          <Button size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
        </>
      )}

      {/* Validation Errors */}
      {validationErrors && validationErrors.length > 0 && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
          <ul className="text-xs text-red-600">
            {validationErrors.map((err, i) => <li key={i}>⚠️ {err}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
```

#### Task 6.4: AIFieldRow Component

**File**: `apps/web/src/components/product/AIFieldRow.tsx` (NEW)

```typescript
interface AIFieldRowProps {
  spec: OpenAIFieldSpec;
  aiValue: any;
  isSelected: boolean;
  onSelectAI: () => void;
}

export function AIFieldRow({ spec, aiValue, isSelected, onSelectAI }: AIFieldRowProps) {
  if (!aiValue) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-dashed flex items-center justify-center">
        <span className="text-sm text-gray-400">
          Click "Generate AI Suggestions" to enrich
        </span>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border-2 ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
      <div className="mb-2">
        <Badge variant={isSelected ? 'default' : 'outline'}>
          {isSelected ? '✓ AI Selected' : 'AI Suggestion'}
        </Badge>
      </div>

      <div className="font-mono text-sm mb-3">{aiValue}</div>

      <Button
        size="sm"
        variant={isSelected ? 'outline' : 'default'}
        onClick={onSelectAI}
      >
        {isSelected ? 'Selected' : 'Use This'}
      </Button>
    </div>
  );
}
```

---

### PHASE 7: Testing & Validation (Days 13-14)

#### Test Cases

1. **Auto-Fill Testing**:
   - Import WooCommerce product
   - Verify all 63 fields auto-filled correctly
   - Check transform functions work

2. **Validation Testing**:
   - Test required field validation
   - Test character limit validation
   - Test enum validation
   - Test URL validation

3. **Editing Testing**:
   - Edit non-enrichable field → saves to edited
   - Edit enrichable field → saves to edited
   - Verify effective value = edited ?? autoFilled

4. **AI Enrichment Testing**:
   - Generate AI for 4 enrichable fields
   - Select AI source → verify final value uses AI
   - Select WooCommerce source → verify uses edited/autoFilled

5. **Feed Generation Testing**:
   - Generate feed with all 63 attributes
   - Verify final values respect source selection
   - Verify feed passes OpenAI validation

---

## 3. Implementation Timeline

| Phase | Days | Deliverable |
|-------|------|-------------|
| Phase 1: Core Data Structure | 1-2 | OpenAI spec file + DB schema |
| Phase 2: Auto-Fill Engine | 3-4 | Transform functions + AutoFillService |
| Phase 3: Validation Engine | 5 | ValidationService |
| Phase 4: Backend API | 6-7 | Updated endpoints + feed service |
| Phase 5: Frontend Shared Config | 8 | Shared types + spec |
| Phase 6: Frontend 3-Column UI | 9-12 | Complete UI with all components |
| Phase 7: Testing | 13-14 | End-to-end testing |
| **Total** | **14 days** | **Complete V2 implementation** |

---

## 4. Key Decisions & Simplifications

### 4.1 JSON Storage for 63 Attributes

**Decision**: Store `openaiAutoFilled` and `openaiEdited` as JSON columns instead of 63+ individual columns

**Rationale**:
- Avoids database bloat
- Flexible for future spec changes
- Easy to compute effective values
- Separates auto-filled from edited

### 4.2 Only 4 AI-Enrichable Fields

**Decision**: AI enrichment ONLY for title, description, product_category, q_and_a

**Rationale**:
- Most fields are just data mappings
- AI adds value where human creativity helps
- Reduces API costs
- Simpler UI (3rd column only for 4 fields)

### 4.3 Transform Function Registry

**Decision**: Use named transform functions instead of inline logic

**Rationale**:
- Reusable across fields
- Easy to test
- Clear mapping in spec
- Extensible

### 4.4 Category Accordion UI

**Decision**: Group 63 fields into 15 collapsible categories

**Rationale**:
- Prevents overwhelming user with 63 fields at once
- Logical organization
- Can expand/collapse as needed
- Focus on most important fields first

---

## 5. Success Criteria

- [ ] All 63 OpenAI feed attributes defined in spec file
- [ ] Auto-fill correctly maps WooCommerce data to all fields
- [ ] Validation engine catches all spec violations
- [ ] Users can manually edit ANY field
- [ ] AI enrichment works for 4 enrichable fields
- [ ] Source selection (AI vs WooCommerce) works
- [ ] 3-column UI displays all metadata clearly
- [ ] Category accordion organizes fields logically
- [ ] Feed generation produces valid OpenAI JSON
- [ ] No data loss during product sync

---

## 6. Files to Create/Modify

### New Files (Backend):
1. `apps/api/src/config/openai-feed-spec.ts` - Complete spec (main deliverable)
2. `apps/api/src/services/woocommerce/transforms.ts` - Transform functions
3. `apps/api/src/services/autoFillService.ts` - Auto-fill logic
4. `apps/api/src/services/validationService.ts` - Validation engine

### Modified Files (Backend):
5. `apps/api/prisma/schema.prisma` - Update Product model
6. `apps/api/src/controllers/productController.ts` - New endpoints
7. `apps/api/src/workers/productSyncWorker.ts` - Use AutoFillService
8. `apps/api/src/services/feedService.ts` - Use effective values

### New Files (Frontend):
9. `packages/shared/src/openai-feed-spec.ts` - Shared spec
10. `apps/web/src/components/product/SpecFieldCard.tsx` - Column 1 display
11. `apps/web/src/components/product/EditableFieldRow.tsx` - Column 2 display
12. `apps/web/src/components/product/AIFieldRow.tsx` - Column 3 display

### Modified Files (Frontend):
13. `packages/shared/src/index.ts` - Update Product type
14. `apps/web/src/lib/api.ts` - New API functions
15. `apps/web/src/app/shops/[id]/products/[pid]/page.tsx` - Complete redesign

**Total: 15 files** (4 new backend, 4 new frontend, 7 modified)

---

**End of Implementation Plan V2**
