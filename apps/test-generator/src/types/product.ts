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
  weight?: string;
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };
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
