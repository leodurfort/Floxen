# Implementation Plan: Complete OpenAI Feed Specification Support

## Overview

Extend ProductSynch to support all OpenAI Product Feed attributes as defined in the Technical Specification V2, while maintaining the 3-column enrichment pattern where applicable.

**Current State**: 5 enrichable fields with 3-column UI (title, description, category, keywords, q_and_a)

**Target State**: Full OpenAI feed specification with 70+ attributes organized by 15 categories, with intelligent categorization of which fields are enrichable vs. fixed.

---

## 1. OpenAI Feed Attributes Analysis

### 1.1 Attribute Categories (15 Categories)

Based on the Technical Specification V2 (Section 7.1), here are the attribute categories:

#### **Category 1: Flags** (Configuration - Shop/Product Level)
- `enable_search` - Boolean toggle
- `enable_checkout` - Boolean toggle

**Implementation**: Product-level toggles (already implemented)

---

#### **Category 2: Basic Product Data** (Partially Enrichable)
- `id` - **Fixed** (generated: `{shopId}-{wooProductId}`)
- `title` - **✓ Enrichable** (Manual + AI)
- `description` - **✓ Enrichable** (Manual + AI)
- `link` - **Fixed** (WooCommerce permalink)

**Implementation**:
- id, link: Auto-generated from WooCommerce
- title, description: Already implemented with 3-column UI

---

#### **Category 3: Identifiers** (Fixed - WooCommerce)
- `gtin` - Global Trade Item Number (8-14 digits)
- `mpn` - Manufacturer Part Number
- `sku` - Stock Keeping Unit (mapped from WooCommerce SKU)

**Implementation**:
- Direct mapping from WooCommerce product data
- Add fields to database schema
- Display as read-only in UI

---

#### **Category 4: Item Information** (Partially Enrichable)
- `product_category` - **✓ Enrichable** (Manual + AI)
- `brand` - **✓ Enrichable** (Manual + AI) - NEW
- `condition` - **Semi-enrichable** (Enum: new, refurbished, used) - NEW
- `weight` - **Fixed** (WooCommerce shipping weight) - NEW
- `size` - **Fixed** (WooCommerce attributes) - NEW
- `color` - **Fixed** (WooCommerce attributes) - NEW
- `material` - **Fixed** (WooCommerce attributes) - NEW
- `age_group` - **Semi-enrichable** (Enum: adult, kids, infant) - NEW
- `gender` - **Semi-enrichable** (Enum: male, female, unisex) - NEW

**Implementation**:
- Extend enrichable fields to include `brand`, `condition`, `age_group`, `gender`
- Extract `weight`, `size`, `color`, `material` from WooCommerce attributes
- Add UI for semi-enrichable fields (dropdown selectors)

---

#### **Category 5: Media** (Fixed - WooCommerce)
- `image_link` - Primary product image (HTTPS, JPEG/PNG)
- `additional_image_link` - Array of additional images
- `video_link` - Product video URL - NEW

**Implementation**:
- Direct mapping from WooCommerce images array
- Extract video from WooCommerce product media
- Display image gallery in UI (read-only)

---

#### **Category 6: Pricing** (Fixed - WooCommerce)
- `price` - Regular price in "XX.XX USD" format
- `sale_price` - Sale price (optional)
- `sale_price_effective_date` - Sale date range - NEW
- `cost_of_goods_sold` - COGS for profit tracking - NEW

**Implementation**:
- Direct mapping from WooCommerce
- Format validation: ensure "XX.XX CURRENCY" format
- Parse sale date from WooCommerce sale schedule

---

#### **Category 7: Availability** (Fixed - WooCommerce)
- `availability` - Enum: in_stock, out_of_stock, preorder
- `inventory_quantity` - Current stock level
- `availability_date` - Future availability date - NEW

**Implementation**:
- Map WooCommerce stock status to OpenAI enum
- Direct mapping of stock quantity
- Parse backorder dates for `availability_date`

---

#### **Category 8: Shipping** (Shop-level Configuration + WooCommerce)
- `shipping` - Shipping cost and methods - NEW
- `shipping_weight` - Package weight - NEW
- `shipping_length` - Package dimensions - NEW
- `shipping_width` - Package dimensions - NEW
- `shipping_height` - Package dimensions - NEW
- `shipping_label` - Custom shipping label - NEW
- `max_handling_time` - Days to ship - NEW
- `min_handling_time` - Days to ship - NEW

**Implementation**:
- Add shop-level default shipping configuration
- Extract dimensions from WooCommerce product
- Allow product-level shipping overrides

---

#### **Category 9: Taxes** (Shop-level Configuration)
- `tax` - Tax information by region - NEW
- `tax_category` - Product tax category - NEW

**Implementation**:
- Shop-level tax configuration
- Map WooCommerce tax class to tax category

---

#### **Category 10: Merchant Information** (Shop-level Configuration)
- `seller_name` - Merchant business name
- `seller_url` - Merchant website
- `seller_privacy_policy` - Privacy policy URL (required for checkout)
- `seller_tos` - Terms of service URL (required for checkout)
- `contact_email` - Customer support email - NEW
- `contact_phone` - Customer support phone - NEW

**Implementation**:
- Already partially implemented (seller_name, seller_url, etc.)
- Add contact_email, contact_phone to Shop model
- Shop settings page for editing

---

#### **Category 11: Return Policy** (Shop-level Configuration)
- `return_policy` - Return policy URL
- `return_window` - Return window in days
- `return_policy_label` - Short return policy summary - NEW
- `return_address` - Physical return address - NEW

**Implementation**:
- Already partially implemented (return_policy, return_window)
- Add return_policy_label and return_address to Shop model

---

#### **Category 12: Product Variants** (Fixed - WooCommerce)
- `item_group_id` - Parent product ID for variants - NEW
- `variant_attributes` - Size, color, etc. - NEW

**Implementation**:
- Map WooCommerce variable products to item_group_id
- Flatten variants into separate feed items
- Extract variant attributes from WooCommerce

---

#### **Category 13: Reviews & Ratings** (Fixed - WooCommerce + Future API)
- `product_review_count` - Total reviews
- `product_review_rating` - Average rating (0-5)
- `product_review_link` - Link to reviews page - NEW

**Implementation**:
- Extract from WooCommerce product reviews
- Calculate average rating
- Generate review link from permalink

---

#### **Category 14: Q&A** (✓ Enrichable)
- `q_and_a` - **✓ Enrichable** (Manual + AI) - Formatted Q&A text

**Implementation**:
- Already implemented with 3-column UI
- Current format: Array of {q, a} objects, converted to plain text for feed

---

#### **Category 15: Custom Attributes** (✓ Enrichable)
- `ai_keywords` - **✓ Enrichable** (Manual + AI) - Search keywords array
- `custom_label_0` through `custom_label_4` - **Semi-enrichable** - Custom tags - NEW
- `product_highlight` - **✓ Enrichable** - Key product features array - NEW
- `product_detail` - **✓ Enrichable** - Detailed specifications array - NEW

**Implementation**:
- keywords already implemented
- Add product_highlight (bullet points, AI can suggest)
- Add product_detail (specs like "Battery: Li-ion", AI can extract)
- Add custom_labels for merchant-specific categorization

---

## 2. Field Classification Summary

### 2.1 Enrichable Fields (3-Column UI Support)

**Tier 1 - Already Implemented:**
1. `title` ✓
2. `description` ✓
3. `category` ✓
4. `keywords` ✓ (ai_keywords in feed)
5. `q_and_a` ✓

**Tier 2 - New Enrichable Fields:**
6. `brand` - AI can suggest brand based on product data
7. `product_highlight` - AI-generated bullet points of key features
8. `product_detail` - AI-extracted specifications

**Tier 3 - Semi-Enrichable (Dropdown + AI Suggestion):**
9. `condition` - Enum dropdown (new, refurbished, used)
10. `age_group` - Enum dropdown (adult, kids, infant)
11. `gender` - Enum dropdown (male, female, unisex)
12. `custom_label_0` to `custom_label_4` - Free text tags

**Total Enrichable Fields: 16**

### 2.2 Fixed Fields (WooCommerce → OpenAI Mapping)

**Auto-Generated:**
- `id`, `link`

**Direct Mapping:**
- `gtin`, `mpn`, `sku`
- `image_link`, `additional_image_link`, `video_link`
- `price`, `sale_price`, `sale_price_effective_date`
- `availability`, `inventory_quantity`, `availability_date`
- `weight`, `size`, `color`, `material`
- `shipping_*` (dimensions, weight)
- `item_group_id`, `variant_attributes`
- `product_review_count`, `product_review_rating`

**Total Fixed Fields: ~35**

### 2.3 Shop-Level Configuration Fields

**Merchant Settings:**
- `seller_name`, `seller_url`, `seller_privacy_policy`, `seller_tos`
- `contact_email`, `contact_phone`

**Shipping Settings:**
- `shipping` (default rates), `max_handling_time`, `min_handling_time`

**Tax Settings:**
- `tax`, `tax_category`

**Return Policy Settings:**
- `return_policy`, `return_window`, `return_policy_label`, `return_address`

**Total Shop Config Fields: ~15**

### 2.4 Product-Level Toggles

- `enable_search`
- `enable_checkout`

**Total Toggle Fields: 2**

---

## 3. Database Schema Changes

### 3.1 Shop Model Extensions

```prisma
model Shop {
  // ... existing fields ...

  // NEW: Extended Merchant Info
  contactEmail        String?     @map("contact_email")
  contactPhone        String?     @map("contact_phone")

  // NEW: Extended Return Policy
  returnPolicyLabel   String?     @map("return_policy_label")
  returnAddress       String?     @map("return_address")

  // NEW: Shipping Defaults
  defaultShippingCost Decimal?    @map("default_shipping_cost") @db.Decimal(10, 2)
  maxHandlingTime     Int?        @map("max_handling_time")
  minHandlingTime     Int?        @map("min_handling_time")

  // NEW: Tax Settings
  taxCategory         String?     @map("tax_category")
  taxRatesByRegion    Json?       @map("tax_rates_by_region")

  // ... rest of fields ...
}
```

### 3.2 Product Model Extensions

```prisma
model Product {
  // ... existing WooCommerce fields ...

  // NEW: WooCommerce Extended Identifiers
  wooGtin             String?     @map("woo_gtin")
  wooMpn              String?     @map("woo_mpn")
  wooBrand            String?     @map("woo_brand")
  wooCondition        String?     @map("woo_condition")
  wooWeight           String?     @map("woo_weight")
  wooSize             Json?       @map("woo_size")
  wooColor            Json?       @map("woo_color")
  wooMaterial         String?     @map("woo_material")
  wooAgeGroup         String?     @map("woo_age_group")
  wooGender           String?     @map("woo_gender")

  // NEW: WooCommerce Media
  wooVideoLink        String?     @map("woo_video_link")

  // NEW: WooCommerce Pricing
  wooSalePriceStart   DateTime?   @map("woo_sale_price_start")
  wooSalePriceEnd     DateTime?   @map("woo_sale_price_end")
  wooCogs             Decimal?    @map("woo_cogs") @db.Decimal(10, 2)

  // NEW: WooCommerce Availability
  wooAvailabilityDate DateTime?   @map("woo_availability_date")

  // NEW: WooCommerce Shipping
  wooShippingWeight   String?     @map("woo_shipping_weight")
  wooShippingLength   String?     @map("woo_shipping_length")
  wooShippingWidth    String?     @map("woo_shipping_width")
  wooShippingHeight   String?     @map("woo_shipping_height")

  // NEW: WooCommerce Variants
  wooParentId         Int?        @map("woo_parent_id")
  wooVariantAttributes Json?      @map("woo_variant_attributes")

  // NEW: WooCommerce Reviews
  wooReviewCount      Int?        @map("woo_review_count")
  wooReviewRating     Decimal?    @map("woo_review_rating") @db.Decimal(3, 2)

  // ... existing AI enrichment fields ...

  // NEW: AI Enrichment Extended
  aiBrand             String?     @map("ai_brand")
  aiProductHighlight  String[]    @map("ai_product_highlight")
  aiProductDetail     Json?       @map("ai_product_detail")
  aiCondition         String?     @map("ai_condition")
  aiAgeGroup          String?     @map("ai_age_group")
  aiGender            String?     @map("ai_gender")

  // ... existing manual override fields ...

  // NEW: Manual Override Extended
  manualBrand         String?     @map("manual_brand")
  manualProductHighlight String[] @map("manual_product_highlight")
  manualProductDetail Json?       @map("manual_product_detail")
  manualCondition     String?     @map("manual_condition")
  manualAgeGroup      String?     @map("manual_age_group")
  manualGender        String?     @map("manual_gender")
  manualCustomLabels  String[]    @map("manual_custom_labels")

  // EXISTING: selectedSources (extend to include new fields)
  selectedSources     Json?       @default("{}") @map("selected_sources")

  // ... rest of fields ...
}
```

**Migration Strategy:**
```bash
# Create migration
cd apps/api
npx prisma migrate dev --name add_full_openai_feed_fields
npx prisma generate
```

### 3.3 Updated SelectedSources Type

```typescript
// packages/shared/src/index.ts

export interface SelectedSources {
  // Tier 1 - Already implemented
  title?: FieldSource;
  description?: FieldSource;
  category?: FieldSource;
  keywords?: FieldSource;
  q_and_a?: FieldSource;

  // Tier 2 - New enrichable
  brand?: FieldSource;
  product_highlight?: FieldSource;
  product_detail?: FieldSource;

  // Tier 3 - Semi-enrichable
  condition?: FieldSource;
  age_group?: FieldSource;
  gender?: FieldSource;
}
```

---

## 4. Backend Implementation Plan

### 4.1 Update FeedValueResolver

**File**: `apps/api/src/services/feedValueResolver.ts`

**Changes**: Extend resolver to handle all enrichable fields

```typescript
export class FeedValueResolver {

  // EXISTING METHODS
  resolveTitle(): string { /* ... */ }
  resolveDescription(): string | null { /* ... */ }
  resolveCategory(): string | null { /* ... */ }
  resolveKeywords(): string[] { /* ... */ }
  resolveQAndA(): Array<{q: string, a: string}> | null { /* ... */ }

  // NEW METHODS - Tier 2 Enrichable
  resolveBrand(): string | null {
    const source = this.selectedSources.brand || 'manual';
    if (source === 'ai' && this.product.aiBrand) return this.product.aiBrand;
    if (source === 'manual' && this.product.manualBrand) return this.product.manualBrand;
    return this.product.wooBrand || null;
  }

  resolveProductHighlight(): string[] {
    const source = this.selectedSources.product_highlight || 'manual';
    if (source === 'ai' && this.product.aiProductHighlight?.length) {
      return this.product.aiProductHighlight;
    }
    if (source === 'manual' && this.product.manualProductHighlight?.length) {
      return this.product.manualProductHighlight;
    }
    return [];
  }

  resolveProductDetail(): Array<{attribute: string, value: string}> | null {
    const source = this.selectedSources.product_detail || 'manual';
    if (source === 'ai' && this.product.aiProductDetail) {
      return this.product.aiProductDetail as any;
    }
    if (source === 'manual' && this.product.manualProductDetail) {
      return this.product.manualProductDetail as any;
    }
    return null;
  }

  // NEW METHODS - Tier 3 Semi-Enrichable
  resolveCondition(): 'new' | 'refurbished' | 'used' {
    const source = this.selectedSources.condition || 'manual';
    if (source === 'ai' && this.product.aiCondition) {
      return this.product.aiCondition as any;
    }
    if (source === 'manual' && this.product.manualCondition) {
      return this.product.manualCondition as any;
    }
    return this.product.wooCondition as any || 'new';
  }

  resolveAgeGroup(): 'adult' | 'kids' | 'infant' | null {
    const source = this.selectedSources.age_group || 'manual';
    if (source === 'ai' && this.product.aiAgeGroup) return this.product.aiAgeGroup as any;
    if (source === 'manual' && this.product.manualAgeGroup) return this.product.manualAgeGroup as any;
    return this.product.wooAgeGroup as any || null;
  }

  resolveGender(): 'male' | 'female' | 'unisex' | null {
    const source = this.selectedSources.gender || 'manual';
    if (source === 'ai' && this.product.aiGender) return this.product.aiGender as any;
    if (source === 'manual' && this.product.manualGender) return this.product.manualGender as any;
    return this.product.wooGender as any || null;
  }

  // FIXED FIELD ACCESSORS
  getGtin(): string | undefined {
    return this.product.wooGtin || undefined;
  }

  getMpn(): string | undefined {
    return this.product.wooMpn || this.product.wooSku || undefined;
  }

  getImages(): { primary: string; additional: string[] } {
    const images = this.product.wooImages as any;
    if (!images || !Array.isArray(images) || images.length === 0) {
      return { primary: '', additional: [] };
    }
    return {
      primary: images[0]?.src || '',
      additional: images.slice(1).map((img: any) => img.src).filter(Boolean),
    };
  }

  getVideoLink(): string | undefined {
    return this.product.wooVideoLink || undefined;
  }

  getShippingDimensions(): {
    weight?: string;
    length?: string;
    width?: string;
    height?: string;
  } {
    return {
      weight: this.product.wooShippingWeight || undefined,
      length: this.product.wooShippingLength || undefined,
      width: this.product.wooShippingWidth || undefined,
      height: this.product.wooShippingHeight || undefined,
    };
  }

  getReviews(): { count: number; rating: number } {
    return {
      count: this.product.wooReviewCount || 0,
      rating: this.product.wooReviewRating ? parseFloat(this.product.wooReviewRating.toString()) : 0,
    };
  }

  // COMPLETE RESOLUTION
  resolveAll(): ResolvedValues {
    const images = this.getImages();
    const shipping = this.getShippingDimensions();
    const reviews = this.getReviews();

    return {
      // Enrichable fields
      title: this.resolveTitle(),
      description: this.resolveDescription(),
      category: this.resolveCategory(),
      keywords: this.resolveKeywords(),
      qAndA: this.resolveQAndA(),
      brand: this.resolveBrand(),
      productHighlight: this.resolveProductHighlight(),
      productDetail: this.resolveProductDetail(),
      condition: this.resolveCondition(),
      ageGroup: this.resolveAgeGroup(),
      gender: this.resolveGender(),

      // Fixed fields
      gtin: this.getGtin(),
      mpn: this.getMpn(),
      imageLink: images.primary,
      additionalImageLink: images.additional,
      videoLink: this.getVideoLink(),
      weight: this.product.wooWeight || undefined,
      size: this.product.wooSize as any,
      color: this.product.wooColor as any,
      material: this.product.wooMaterial || undefined,
      shippingWeight: shipping.weight,
      shippingLength: shipping.length,
      shippingWidth: shipping.width,
      shippingHeight: shipping.height,
      reviewCount: reviews.count,
      reviewRating: reviews.rating,
      customLabels: this.product.manualCustomLabels || [],
    };
  }
}
```

### 4.2 Update Feed Service

**File**: `apps/api/src/services/feedService.ts`

**Changes**: Use resolved values to generate complete OpenAI feed

```typescript
export function generateFeedPayload(shop: Shop, products: Product[]) {
  const items = products
    .filter(p => p.status !== 'EXCLUDED' && p.feedEnableSearch)
    .map((p) => {
      const resolver = new FeedValueResolver(p);
      const resolved = resolver.resolveAll();
      const images = resolver.getImages();

      return {
        // Flags
        enable_search: p.feedEnableSearch ? 'true' : 'false',
        enable_checkout: p.feedEnableCheckout ? 'true' : 'false',

        // Basic
        id: `${shop.id}-${p.wooProductId}`,
        title: resolved.title,
        description: resolved.description || '',
        link: p.wooPermalink || '',

        // Identifiers
        gtin: resolved.gtin,
        mpn: resolved.mpn,

        // Item Info
        product_category: resolved.category || '',
        brand: resolved.brand || shop.shopName,
        condition: resolved.condition,
        weight: resolved.weight,
        size: resolved.size,
        color: resolved.color,
        material: resolved.material,
        age_group: resolved.ageGroup,
        gender: resolved.gender,

        // Media
        image_link: images.primary,
        additional_image_link: images.additional.length > 0 ? images.additional : undefined,
        video_link: resolved.videoLink,

        // Pricing
        price: formatPrice(p.wooPrice, shop.shopCurrency),
        sale_price: p.wooSalePrice ? formatPrice(p.wooSalePrice, shop.shopCurrency) : undefined,
        sale_price_effective_date: formatSaleDateRange(p.wooSalePriceStart, p.wooSalePriceEnd),

        // Availability
        availability: mapAvailability(p.wooStockStatus),
        inventory_quantity: p.wooStockQuantity || 0,
        availability_date: p.wooAvailabilityDate?.toISOString(),

        // Shipping
        shipping_weight: resolved.shippingWeight,
        shipping_length: resolved.shippingLength,
        shipping_width: resolved.shippingWidth,
        shipping_height: resolved.shippingHeight,
        max_handling_time: shop.maxHandlingTime,
        min_handling_time: shop.minHandlingTime,

        // Tax
        tax_category: shop.taxCategory,

        // Merchant
        seller_name: shop.sellerName || shop.shopName,
        seller_url: shop.sellerUrl || shop.wooStoreUrl,
        seller_privacy_policy: shop.sellerPrivacyPolicy,
        seller_tos: shop.sellerTos,
        contact_email: shop.contactEmail,
        contact_phone: shop.contactPhone,

        // Returns
        return_policy: shop.returnPolicy || `${shop.wooStoreUrl}/returns`,
        return_window: shop.returnWindow || 30,
        return_policy_label: shop.returnPolicyLabel,
        return_address: shop.returnAddress,

        // Reviews
        product_review_count: resolved.reviewCount,
        product_review_rating: resolved.reviewRating,
        product_review_link: p.wooPermalink ? `${p.wooPermalink}#reviews` : undefined,

        // Q&A
        q_and_a: formatQAndA(resolved.qAndA),

        // Custom Attributes
        ai_keywords: resolved.keywords,
        product_highlight: resolved.productHighlight,
        product_detail: resolved.productDetail,
        custom_label_0: resolved.customLabels[0],
        custom_label_1: resolved.customLabels[1],
        custom_label_2: resolved.customLabels[2],
        custom_label_3: resolved.customLabels[3],
        custom_label_4: resolved.customLabels[4],

        // Variants
        item_group_id: p.wooParentId ? `${shop.id}-${p.wooParentId}` : undefined,
        variant_attributes: p.wooVariantAttributes as any,
      };
    });

  return {
    version: '1.0',
    items,
  };
}
```

### 4.3 Update AI Enrichment Service

**File**: `apps/api/src/services/aiEnrichment.ts`

**Changes**: Extend AI prompt to generate suggestions for new fields

```typescript
export interface EnrichmentResult {
  // Existing
  title: string;
  description: string;
  keywords: string[];
  qAndA: Array<{ q: string; a: string }>;
  suggestedCategory: string;

  // NEW
  brand?: string;
  productHighlight?: string[];
  productDetail?: Array<{attribute: string, value: string}>;
  condition?: 'new' | 'refurbished' | 'used';
  ageGroup?: 'adult' | 'kids' | 'infant';
  gender?: 'male' | 'female' | 'unisex';
}

function buildPrompt(product: Product): string {
  const currentTitle = product.manualTitle || product.wooTitle;
  const currentDescription = product.manualDescription || product.wooDescription || 'No description';

  return `Enhance this product listing for ChatGPT shopping discovery:

CURRENT PRODUCT DATA:
- Title: ${currentTitle}
- Description: ${currentDescription}
- Price: ${product.wooPrice ?? 'N/A'}
- SKU: ${product.wooSku || 'None'}
- Categories: ${JSON.stringify(product.wooCategories)}
- Attributes: ${JSON.stringify(product.wooAttributes)}
- Existing Brand: ${product.wooBrand || 'None'}
- Existing Condition: ${product.wooCondition || 'Unknown'}

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
  "suggested_category": "Main Category > Subcategory",
  "brand": "Brand name if identifiable from product data",
  "product_highlight": [
    "Key feature 1 (bullet point)",
    "Key feature 2 (bullet point)",
    "Key feature 3 (bullet point)"
  ],
  "product_detail": [
    {"attribute": "Material", "value": "Stainless Steel"},
    {"attribute": "Dimensions", "value": "10 x 5 x 3 inches"},
    {"attribute": "Battery", "value": "Li-ion rechargeable"}
  ],
  "condition": "new",
  "age_group": "adult",
  "gender": "unisex"
}`;
}
```

### 4.4 Update WooCommerce Data Extractor

**File**: `apps/api/src/services/woocommerce/transformer.ts` (NEW)

**Purpose**: Extract all relevant fields from WooCommerce API response

```typescript
export function transformWooProduct(wooProd: any): Partial<Product> {
  return {
    wooProductId: wooProd.id,
    wooTitle: wooProd.name,
    wooDescription: stripHtml(wooProd.description),
    wooSku: wooProd.sku,
    wooPrice: wooProd.price,
    wooSalePrice: wooProd.sale_price || null,
    wooSalePriceStart: wooProd.date_on_sale_from ? new Date(wooProd.date_on_sale_from) : null,
    wooSalePriceEnd: wooProd.date_on_sale_to ? new Date(wooProd.date_on_sale_to) : null,
    wooStockStatus: wooProd.stock_status,
    wooStockQuantity: wooProd.stock_quantity,
    wooCategories: wooProd.categories,
    wooImages: wooProd.images,
    wooAttributes: wooProd.attributes,
    wooPermalink: wooProd.permalink,

    // NEW: Identifiers
    wooGtin: extractMetaField(wooProd, 'gtin'),
    wooMpn: extractMetaField(wooProd, 'mpn'),
    wooBrand: extractAttribute(wooProd, 'brand'),

    // NEW: Item Info
    wooCondition: extractMetaField(wooProd, 'condition') || 'new',
    wooWeight: wooProd.weight,
    wooSize: extractAttribute(wooProd, 'size'),
    wooColor: extractAttribute(wooProd, 'color'),
    wooMaterial: extractAttribute(wooProd, 'material'),
    wooAgeGroup: extractAttribute(wooProd, 'age_group'),
    wooGender: extractAttribute(wooProd, 'gender'),

    // NEW: Media
    wooVideoLink: extractMetaField(wooProd, 'video_url'),

    // NEW: Shipping
    wooShippingWeight: wooProd.weight,
    wooShippingLength: wooProd.dimensions?.length,
    wooShippingWidth: wooProd.dimensions?.width,
    wooShippingHeight: wooProd.dimensions?.height,

    // NEW: Variants
    wooParentId: wooProd.parent_id || null,
    wooVariantAttributes: wooProd.attributes,

    // NEW: Reviews
    wooReviewCount: wooProd.rating_count || 0,
    wooReviewRating: wooProd.average_rating || 0,

    wooRawJson: wooProd,
  };
}

function extractMetaField(wooProd: any, key: string): string | null {
  return wooProd.meta_data?.find((m: any) => m.key === key)?.value || null;
}

function extractAttribute(wooProd: any, name: string): any {
  const attr = wooProd.attributes?.find((a: any) => a.name.toLowerCase() === name.toLowerCase());
  return attr?.options || null;
}
```

### 4.5 Add New API Endpoints

**File**: `apps/api/src/controllers/productController.ts`

**Changes**: Extend validation schemas for new fields

```typescript
const updateManualFieldSchema = z.object({
  field: z.enum([
    'title', 'description', 'category', 'keywords', 'q_and_a',
    'brand', 'product_highlight', 'product_detail',
    'condition', 'age_group', 'gender', 'custom_labels'
  ]),
  value: z.union([
    z.string().max(5000),
    z.array(z.string()).max(10),
    z.array(z.object({ q: z.string(), a: z.string() })).min(3).max(5),
    z.array(z.object({ attribute: z.string(), value: z.string() })).max(20),
  ]),
});

const updateSelectedSourceSchema = z.object({
  field: z.enum([
    'title', 'description', 'category', 'keywords', 'q_and_a',
    'brand', 'product_highlight', 'product_detail',
    'condition', 'age_group', 'gender'
  ]),
  source: z.enum(['manual', 'ai']),
});
```

**File**: `apps/api/src/controllers/shopController.ts`

**NEW**: Add shop settings update endpoint for extended merchant/shipping/tax config

```typescript
export async function updateShopSettings(req: Request, res: Response) {
  const { id } = req.params;
  const schema = z.object({
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().optional(),
    returnPolicyLabel: z.string().optional(),
    returnAddress: z.string().optional(),
    maxHandlingTime: z.number().int().min(0).optional(),
    minHandlingTime: z.number().int().min(0).optional(),
    taxCategory: z.string().optional(),
  });

  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const shop = await prisma.shop.update({
    where: { id },
    data: parse.data,
  });

  res.json({ shop });
}
```

---

## 5. Frontend Implementation Plan

### 5.1 Redesign Product Detail Page

**File**: `apps/web/src/app/shops/[id]/products/[pid]/page.tsx`

**Current Structure**: 3-column UI for 5 fields

**New Structure**: Tabbed interface with grouped fields

```
┌─────────────────────────────────────────────────────────────────┐
│ Product: [Title]                 [Generate AI Suggestions]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Tabs: [ Core Content ] [ Item Details ] [ Media ] [ Advanced ]  │
│                                                                  │
│ ┌─ Core Content Tab (Default) ─────────────────────────────────┐│
│ │                                                               ││
│ │ For each enrichable field (title, description, etc.):        ││
│ │                                                               ││
│ │ ┌─────────────┬─────────────────┬────────────────────────┐  ││
│ │ │ OpenAI Req  │ WooCommerce/    │ AI Suggestion          │  ││
│ │ │ (reference) │ Manual Edit     │ (read-only)            │  ││
│ │ ├─────────────┼─────────────────┼────────────────────────┤  ││
│ │ │ Title *     │ [Editable text] │ [AI generated text]    │  ││
│ │ │ max 150     │ [Edit] [Use ✓]  │ [Use This]             │  ││
│ │ └─────────────┴─────────────────┴────────────────────────┘  ││
│ │                                                               ││
│ │ [Repeat for description, category, keywords, Q&A]            ││
│ │                                                               ││
│ └───────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌─ Item Details Tab ─────────────────────────────────────────┐  │
│ │                                                             │  │
│ │ Brand (Enrichable 3-column UI)                             │  │
│ │ Product Highlights (Enrichable bullet list)                │  │
│ │ Product Details (Enrichable key-value pairs)               │  │
│ │ Condition (Dropdown: new/refurbished/used + AI suggest)    │  │
│ │ Age Group (Dropdown: adult/kids/infant + AI suggest)       │  │
│ │ Gender (Dropdown: male/female/unisex + AI suggest)         │  │
│ │ Custom Labels (5 free-text tags)                           │  │
│ │                                                             │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌─ Media Tab ──────────────────────────────────────────────────┐│
│ │                                                               ││
│ │ Images (Read-only gallery from WooCommerce)                  ││
│ │ Video Link (Read-only from WooCommerce)                      ││
│ │                                                               ││
│ └───────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌─ Advanced Tab ───────────────────────────────────────────────┐│
│ │                                                               ││
│ │ Identifiers (GTIN, MPN, SKU) - Read-only                     ││
│ │ Pricing - Read-only from WooCommerce                         ││
│ │ Availability - Read-only from WooCommerce                    ││
│ │ Shipping Dimensions - Read-only from WooCommerce             ││
│ │ Reviews - Read-only from WooCommerce                         ││
│ │ Variants - Read-only from WooCommerce                        ││
│ │                                                               ││
│ │ Feed Preview - Final values that will appear in feed         ││
│ │                                                               ││
│ └───────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Implementation**:

```typescript
type TabId = 'core' | 'details' | 'media' | 'advanced';

const ProductDetailPage = () => {
  const [activeTab, setActiveTab] = useState<TabId>('core');
  const [product, setProduct] = useState<Product | null>(null);
  const [resolvedValues, setResolvedValues] = useState<any>(null);

  return (
    <div>
      <Header>
        <h1>{product?.wooTitle}</h1>
        <Button onClick={handleEnrich}>Generate AI Suggestions</Button>
      </Header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="core">Core Content</TabsTrigger>
          <TabsTrigger value="details">Item Details</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="core">
          <ThreeColumnField field="title" product={product} />
          <ThreeColumnField field="description" product={product} />
          <ThreeColumnField field="category" product={product} />
          <ThreeColumnField field="keywords" product={product} />
          <ThreeColumnField field="q_and_a" product={product} />
        </TabsContent>

        <TabsContent value="details">
          <ThreeColumnField field="brand" product={product} />
          <ThreeColumnArrayField field="product_highlight" product={product} />
          <ThreeColumnKeyValueField field="product_detail" product={product} />
          <EnumFieldWithAI field="condition" options={['new', 'refurbished', 'used']} />
          <EnumFieldWithAI field="age_group" options={['adult', 'kids', 'infant']} />
          <EnumFieldWithAI field="gender" options={['male', 'female', 'unisex']} />
          <CustomLabelsField product={product} />
        </TabsContent>

        <TabsContent value="media">
          <ImageGallery images={product?.wooImages} />
          <VideoPlayer url={product?.wooVideoLink} />
        </TabsContent>

        <TabsContent value="advanced">
          <ReadOnlySection title="Identifiers">
            <Field label="GTIN" value={product?.wooGtin} />
            <Field label="MPN" value={product?.wooMpn} />
            <Field label="SKU" value={product?.wooSku} />
          </ReadOnlySection>

          <ReadOnlySection title="Pricing">
            <Field label="Price" value={product?.wooPrice} />
            <Field label="Sale Price" value={product?.wooSalePrice} />
          </ReadOnlySection>

          <ReadOnlySection title="Shipping">
            <Field label="Weight" value={product?.wooShippingWeight} />
            <Field label="Dimensions" value={`${product?.wooShippingLength} x ${product?.wooShippingWidth} x ${product?.wooShippingHeight}`} />
          </ReadOnlySection>

          <FeedPreviewSection resolved={resolvedValues} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

### 5.2 New UI Components

**Component 1: EnumFieldWithAI**

```typescript
// Dropdown selector with AI suggestion
const EnumFieldWithAI = ({ field, options }) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <Label>OpenAI Requirement</Label>
        <p className="text-sm text-gray-500">Enum: {options.join(', ')}</p>
      </div>

      <div>
        <Label>Manual Selection</Label>
        <Select value={manualValue} onValueChange={handleManualChange}>
          {options.map(opt => <SelectItem value={opt}>{opt}</SelectItem>)}
        </Select>
        <Button onClick={() => selectSource('manual')}>Use This</Button>
      </div>

      <div>
        <Label>AI Suggestion</Label>
        <p className="text-sm">{aiValue || 'Not enriched yet'}</p>
        <Button onClick={() => selectSource('ai')} disabled={!aiValue}>Use This</Button>
      </div>
    </div>
  );
};
```

**Component 2: ThreeColumnArrayField**

```typescript
// For product_highlight (bullet points)
const ThreeColumnArrayField = ({ field, product }) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <Label>OpenAI Requirement</Label>
        <p>Array of bullet points (3-5 items)</p>
      </div>

      <div>
        <Label>Manual Edits</Label>
        <ul>
          {manualHighlights.map((item, i) => (
            <li key={i}>
              <Input value={item} onChange={(e) => updateHighlight(i, e.target.value)} />
            </li>
          ))}
        </ul>
        <Button onClick={addHighlight}>Add Item</Button>
        <Button onClick={() => selectSource('manual')}>Use This</Button>
      </div>

      <div>
        <Label>AI Suggestions</Label>
        <ul>
          {aiHighlights?.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
        <Button onClick={() => selectSource('ai')}>Use This</Button>
      </div>
    </div>
  );
};
```

**Component 3: ThreeColumnKeyValueField**

```typescript
// For product_detail (specifications)
const ThreeColumnKeyValueField = ({ field, product }) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <Label>OpenAI Requirement</Label>
        <p>Array of attribute-value pairs</p>
      </div>

      <div>
        <Label>Manual Specifications</Label>
        <Table>
          {manualDetails.map((detail, i) => (
            <TableRow key={i}>
              <TableCell>
                <Input placeholder="Attribute" value={detail.attribute} />
              </TableCell>
              <TableCell>
                <Input placeholder="Value" value={detail.value} />
              </TableCell>
            </TableRow>
          ))}
        </Table>
        <Button onClick={addDetail}>Add Row</Button>
        <Button onClick={() => selectSource('manual')}>Use This</Button>
      </div>

      <div>
        <Label>AI Extracted</Label>
        <Table>
          {aiDetails?.map((detail, i) => (
            <TableRow key={i}>
              <TableCell>{detail.attribute}</TableCell>
              <TableCell>{detail.value}</TableCell>
            </TableRow>
          ))}
        </Table>
        <Button onClick={() => selectSource('ai')}>Use This</Button>
      </div>
    </div>
  );
};
```

### 5.3 Shop Settings Page

**File**: `apps/web/src/app/shops/[id]/settings/page.tsx`

**Add Sections**:

```typescript
const ShopSettingsPage = () => {
  return (
    <div>
      <h1>Shop Settings</h1>

      <Section title="Merchant Information">
        <FormField name="sellerName" label="Business Name" />
        <FormField name="contactEmail" label="Support Email" />
        <FormField name="contactPhone" label="Support Phone" />
        <FormField name="sellerUrl" label="Website URL" />
        <FormField name="sellerPrivacyPolicy" label="Privacy Policy URL" />
        <FormField name="sellerTos" label="Terms of Service URL" />
      </Section>

      <Section title="Shipping Configuration">
        <FormField name="minHandlingTime" label="Min Handling Time (days)" type="number" />
        <FormField name="maxHandlingTime" label="Max Handling Time (days)" type="number" />
      </Section>

      <Section title="Return Policy">
        <FormField name="returnPolicy" label="Return Policy URL" />
        <FormField name="returnWindow" label="Return Window (days)" type="number" />
        <FormField name="returnPolicyLabel" label="Short Summary" />
        <FormField name="returnAddress" label="Physical Return Address" />
      </Section>

      <Section title="Tax Configuration">
        <FormField name="taxCategory" label="Default Tax Category" />
      </Section>

      <Button onClick={handleSave}>Save Settings</Button>
    </div>
  );
};
```

### 5.4 Update API Client

**File**: `apps/web/src/lib/api.ts`

**Add Functions**:

```typescript
export async function updateShopSettings(shopId: string, settings: Partial<Shop>, token: string) {
  return request<{ shop: Shop }>(`/api/v1/shops/${shopId}/settings`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(settings),
  });
}
```

---

## 6. Implementation Phases

### Phase 1: Database & Core Backend (Days 1-3)

**Tasks**:
1. ✅ Extend Prisma schema with all new fields
2. ✅ Create and apply migration
3. ✅ Update FeedValueResolver with all resolver methods
4. ✅ Update feedService.ts to generate complete feed
5. ✅ Create WooCommerce transformer for extracting all fields
6. ✅ Test feed generation locally

**Deliverables**:
- Migration complete
- Feed generator produces valid OpenAI feed with all 70 attributes
- API endpoints support new fields

---

### Phase 2: AI Enrichment Extension (Days 4-5)

**Tasks**:
1. ✅ Update AI enrichment prompt to include new fields
2. ✅ Extend EnrichmentResult interface
3. ✅ Update validation schemas for new enrichable fields
4. ✅ Test AI enrichment with new fields

**Deliverables**:
- AI can suggest brand, highlights, details, condition, age_group, gender
- Validation prevents invalid data

---

### Phase 3: Frontend - Core Content Tab (Days 6-8)

**Tasks**:
1. ✅ Implement tabbed UI structure
2. ✅ Keep existing 3-column UI for Tier 1 fields
3. ✅ Test editing and source selection

**Deliverables**:
- Tabbed product detail page
- Core content tab functional with all Tier 1 fields

---

### Phase 4: Frontend - Item Details Tab (Days 9-11)

**Tasks**:
1. ✅ Implement 3-column UI for brand
2. ✅ Build ThreeColumnArrayField for product_highlight
3. ✅ Build ThreeColumnKeyValueField for product_detail
4. ✅ Build EnumFieldWithAI for condition, age_group, gender
5. ✅ Build CustomLabelsField

**Deliverables**:
- Item Details tab complete with all Tier 2 & 3 fields
- All fields editable and source-selectable

---

### Phase 5: Frontend - Media & Advanced Tabs (Days 12-13)

**Tasks**:
1. ✅ Build Media tab with image gallery and video player
2. ✅ Build Advanced tab with read-only sections
3. ✅ Build Feed Preview component showing final resolved values

**Deliverables**:
- Media tab displays WooCommerce images/video
- Advanced tab shows all fixed fields
- Feed preview shows actual feed output

---

### Phase 6: Shop Settings Extension (Days 14-15)

**Tasks**:
1. ✅ Add shop settings page sections
2. ✅ Implement update API endpoint
3. ✅ Test shop-level configuration

**Deliverables**:
- Shop settings page supports all new config fields
- Settings persist and appear in feed

---

### Phase 7: Testing & Polish (Days 16-18)

**Tasks**:
1. ✅ End-to-end testing (WooCommerce → enrichment → feed → preview)
2. ✅ Validation testing (character limits, required fields)
3. ✅ UI polish (loading states, error handling)
4. ✅ Performance testing with large product catalogs

**Deliverables**:
- All features working end-to-end
- No validation errors
- Smooth UX

---

### Phase 8: Documentation & Deployment (Days 19-20)

**Tasks**:
1. ✅ Update API documentation
2. ✅ Create user guide for new fields
3. ✅ Deploy to staging
4. ✅ Deploy to production

**Deliverables**:
- Complete documentation
- Live in production

---

## 7. Risk Mitigation

### 7.1 Data Migration Risk

**Risk**: Existing products don't have new fields populated

**Mitigation**:
- All new fields are nullable/optional
- Fallback logic in FeedValueResolver ensures feed generation works
- Run backfill job to extract new fields from existing wooRawJson

### 7.2 Performance Risk

**Risk**: Generating feeds with 70 attributes is slow

**Mitigation**:
- Pagination when fetching products
- Background job for feed generation (already implemented)
- Cache resolved values per product

### 7.3 UI Complexity Risk

**Risk**: Too many fields overwhelms users

**Mitigation**:
- Tabbed interface organizes fields logically
- Most fields are auto-populated from WooCommerce (read-only)
- Only 16 fields are enrichable (user focuses on these)

### 7.4 AI Enrichment Quality Risk

**Risk**: AI suggestions for new fields are poor quality

**Mitigation**:
- Users can always override with manual edits
- Preview feed before publishing
- Iteratively refine prompts based on feedback

---

## 8. Success Criteria

- [ ] All 70 OpenAI feed attributes supported
- [ ] 16 enrichable fields with 3-column UI
- [ ] Fixed fields auto-populated from WooCommerce
- [ ] Shop settings control merchant/shipping/tax/return fields
- [ ] Feed validation passes OpenAI requirements
- [ ] AI enrichment suggests high-quality values
- [ ] Product detail page loads in <2s
- [ ] Feed generation completes in <30s for 1000 products
- [ ] No data loss during migration
- [ ] User documentation complete

---

## 9. File Changes Summary

### Backend Files (Modified/Created)

1. `apps/api/prisma/schema.prisma` - Extend Shop and Product models
2. `apps/api/src/services/feedValueResolver.ts` - Add resolver methods
3. `apps/api/src/services/feedService.ts` - Generate complete feed
4. `apps/api/src/services/aiEnrichment.ts` - Extend enrichment
5. `apps/api/src/services/woocommerce/transformer.ts` - NEW - Extract all fields
6. `apps/api/src/controllers/productController.ts` - Extend validation
7. `apps/api/src/controllers/shopController.ts` - Add settings endpoint
8. `apps/api/src/routes/shop.ts` - Add settings route

### Frontend Files (Modified/Created)

9. `packages/shared/src/index.ts` - Extend types
10. `apps/web/src/lib/api.ts` - Add updateShopSettings function
11. `apps/web/src/app/shops/[id]/products/[pid]/page.tsx` - Complete redesign with tabs
12. `apps/web/src/app/shops/[id]/settings/page.tsx` - Extend shop settings
13. `apps/web/src/components/product/EnumFieldWithAI.tsx` - NEW
14. `apps/web/src/components/product/ThreeColumnArrayField.tsx` - NEW
15. `apps/web/src/components/product/ThreeColumnKeyValueField.tsx` - NEW
16. `apps/web/src/components/product/ImageGallery.tsx` - NEW
17. `apps/web/src/components/product/FeedPreview.tsx` - NEW

**Total Files to Modify/Create: 17**

---

## 10. Next Steps

**Immediate Action**: Confirm implementation plan with user, then proceed with Phase 1 (Database & Core Backend).

**Questions for User**:
1. Are there any specific OpenAI attributes missing from this analysis?
2. Should we prioritize certain enrichable fields over others in Phase 4?
3. Do you want bulk editing capabilities (edit multiple products at once) in future?
4. Should we add import/export functionality for product data?

---

**End of Implementation Plan**
