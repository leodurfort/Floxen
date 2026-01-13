/**
 * Product types supported by WooCommerce
 */
export type ProductType = 'simple' | 'variable' | 'grouped';

/**
 * How the brand is stored in WooCommerce
 * - taxonomy: Uses the pa_brand taxonomy (like WooCommerce Brands plugin)
 * - attribute: Uses a visible product attribute named "Brand"
 * - meta: Uses product meta_data with key "_brand"
 * - none: No brand information stored
 */
export type BrandStorageMethod = 'taxonomy' | 'attribute' | 'meta' | 'none';

/**
 * How GTIN is stored in WooCommerce
 * - _gtin: meta_data key "_gtin"
 * - gtin: meta_data key "gtin"
 * - global_unique_id: WooCommerce native field (WC 8.4+)
 */
export type GtinStorageMethod = '_gtin' | 'gtin' | 'global_unique_id';

/**
 * GTIN type for validation
 */
export type GtinType = 'UPC-A' | 'EAN-13' | 'GTIN-14' | 'ISBN-13';

/**
 * Gender values
 */
export type Gender = 'male' | 'female' | 'unisex';

/**
 * Age group values
 */
export type AgeGroup = 'adult' | 'kids' | 'toddler' | 'infant' | 'newborn';

/**
 * Size system values
 */
export type SizeSystem = 'US' | 'UK' | 'EU' | 'AU' | 'BR' | 'CN' | 'JP';

/**
 * Pricing trend direction (PRD Field #28)
 */
export type PricingTrend = 'up' | 'down' | 'stable';

/**
 * Pickup method (PRD Field #33)
 */
export type PickupMethod = 'in_store' | 'curbside' | 'ship_to_store';

/**
 * Geo availability status
 */
export type GeoAvailabilityStatus = 'in_stock' | 'out_of_stock' | 'preorder';

/**
 * Shipping info structure (PRD Field #48)
 */
export interface ShippingInfo {
  country: string;
  price: string;
  service?: string;
}

/**
 * Q&A entry structure (PRD Field #65)
 */
export interface QAndAEntry {
  question: string;
  answer: string;
}

/**
 * Raw review data structure (PRD Field #66)
 */
export interface RawReviewEntry {
  reviewer: string;
  rating: number;
  text: string;
  date: string;
}

/**
 * Geo price entry (PRD Field #69)
 */
export interface GeoPriceEntry {
  country: string;
  price: string;
  currency: string;
}

/**
 * Geo availability entry (PRD Field #70)
 */
export interface GeoAvailabilityEntry {
  country: string;
  availability: GeoAvailabilityStatus;
}

/**
 * Product status in WooCommerce
 */
export type ProductStatus = 'draft' | 'pending' | 'private' | 'publish';

/**
 * Stock status
 */
export type StockStatus = 'instock' | 'outofstock' | 'onbackorder';

/**
 * Product attribute definition
 */
export interface ProductAttribute {
  name: string;
  options: string[];
  visible: boolean;
  variation: boolean;
}

/**
 * Sale date range for products on sale
 */
export interface SaleDateRange {
  from: string; // ISO date string
  to: string; // ISO date string
}

/**
 * Product variation definition
 */
export interface VariationDefinition {
  sku: string;
  regularPrice: string;
  salePrice?: string;
  stockQuantity?: number;
  stockStatus?: StockStatus;
  attributes: Record<string, string>;
  weight?: string;
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };
  // Variation-specific identifiers (EC-VAR-14)
  gtin?: string;
  gtinType?: GtinType;
  gtinStorageMethod?: GtinStorageMethod;
  mpn?: string;
  // Sale dates for variations
  saleDates?: SaleDateRange;
}

/**
 * Base product definition (shared by all product types)
 */
export interface BaseProductDefinition {
  sku: string;
  name: string;
  description: string;
  shortDescription: string;
  categories: string[]; // Category slugs
  brand: string;
  brandStorageMethod: BrandStorageMethod; // How brand is stored in WooCommerce (assigned at aggregation)

  // Physical attributes (EC-DIM-01 to EC-DIM-10)
  weight?: string;
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };

  // Product identifiers (EC-GTIN-01 to EC-GTIN-09)
  gtin?: string;
  gtinType?: GtinType;
  gtinStorageMethod?: GtinStorageMethod;
  mpn?: string; // Manufacturer Part Number

  // Product attributes for OpenAI feed
  material?: string;
  gender?: Gender;
  ageGroup?: AgeGroup;
  sizeSystem?: SizeSystem;

  // Sale dates (EC-PRC-08 to EC-PRC-10)
  saleDates?: SaleDateRange;

  // Product relationships (EC-REL-01 to EC-REL-06)
  relatedSkus?: string[];
  crossSellSkus?: string[];
  upsellSkus?: string[];

  // Optional fields for comprehensive coverage
  videoLink?: string;
  model3dLink?: string;
  unitPricingMeasure?: string; // e.g., "100ml"
  unitPricingBaseMeasure?: string; // e.g., "1L"
  deliveryEstimate?: string; // e.g., "3-5 business days"
  warning?: string;
  warningUrl?: string;
  ageRestriction?: number;

  // PRD Section 9.1 - Additional Required Fields
  pricingTrend?: PricingTrend; // Field #28 - 6% coverage
  availabilityDate?: string; // Field #30 - 16% coverage (ISO date)
  expirationDate?: string; // Field #32 - 2% coverage (ISO date)
  pickupMethod?: PickupMethod; // Field #33 - 5% coverage
  pickupSla?: string; // Field #34 - 5% coverage (e.g., "2 hours")
  shippingInfo?: ShippingInfo; // Field #48 - 20% coverage
  popularityScore?: number; // Field #56 - 30% coverage (0-100)
  returnRate?: number; // Field #57 - 10% coverage (0-100 percentage)
  qAndA?: QAndAEntry[]; // Field #65 - 10% coverage
  rawReviewData?: RawReviewEntry[]; // Field #66 - 6% coverage
  geoPrice?: GeoPriceEntry[]; // Field #69 - 4% coverage
  geoAvailability?: GeoAvailabilityEntry[]; // Field #70 - 4% coverage

  // Media
  images?: string[];
  tags?: string[];
}

/**
 * Simple product definition
 */
export interface SimpleProductDefinition extends BaseProductDefinition {
  type: 'simple';
  regularPrice: string;
  salePrice?: string;
  stockQuantity?: number;
  stockStatus?: StockStatus;
  manageStock?: boolean;
}

/**
 * Variable product definition
 */
export interface VariableProductDefinition extends BaseProductDefinition {
  type: 'variable';
  attributes: ProductAttribute[];
  variations: VariationDefinition[];
}

/**
 * Grouped product definition
 */
export interface GroupedProductDefinition extends BaseProductDefinition {
  type: 'grouped';
  groupedProductSkus: string[]; // SKUs of child products
}

/**
 * Union type for all product definitions
 */
export type ProductDefinition =
  | SimpleProductDefinition
  | VariableProductDefinition
  | GroupedProductDefinition;
