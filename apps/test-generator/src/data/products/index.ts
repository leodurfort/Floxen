/**
 * Product data index - aggregates all product definitions
 */

import { ProductDefinition, BrandStorageMethod } from '@/types/product';
import { TSHIRT_PRODUCTS } from './t-shirts';
import { HOODIE_PRODUCTS } from './hoodies';
import { JACKET_PRODUCTS } from './jackets';
import { PANTS_PRODUCTS } from './pants';
import { SHORTS_PRODUCTS } from './shorts';
import { SNEAKER_PRODUCTS } from './sneakers';
import { BOOT_PRODUCTS } from './boots';
import { SANDAL_PRODUCTS } from './sandals';
import { HAT_PRODUCTS } from './hats';
import { BAG_PRODUCTS } from './bags';
import { BELT_PRODUCTS } from './belts';

/**
 * Brand storage method distribution for test coverage:
 * - 40% taxonomy (pa_brand) - EC-BRD-01
 * - 30% attribute (visible Brand attribute) - EC-BRD-02
 * - 20% meta (_brand meta_data) - EC-BRD-03
 * - 10% none (no brand) - EC-BRD-04
 */
const BRAND_STORAGE_DISTRIBUTION: BrandStorageMethod[] = [
  'taxonomy', 'taxonomy', 'taxonomy', 'taxonomy', // 40%
  'attribute', 'attribute', 'attribute',           // 30%
  'meta', 'meta',                                  // 20%
  'none',                                          // 10%
];

/**
 * Get brand storage method based on global product index
 */
function getBrandStorageMethod(index: number): BrandStorageMethod {
  return BRAND_STORAGE_DISTRIBUTION[index % BRAND_STORAGE_DISTRIBUTION.length];
}

/**
 * All products organized by category
 */
export const PRODUCTS_BY_CATEGORY: Record<string, ProductDefinition[]> = {
  't-shirts': TSHIRT_PRODUCTS,
  hoodies: HOODIE_PRODUCTS,
  jackets: JACKET_PRODUCTS,
  pants: PANTS_PRODUCTS,
  shorts: SHORTS_PRODUCTS,
  sneakers: SNEAKER_PRODUCTS,
  boots: BOOT_PRODUCTS,
  sandals: SANDAL_PRODUCTS,
  hats: HAT_PRODUCTS,
  bags: BAG_PRODUCTS,
  belts: BELT_PRODUCTS,
};

/**
 * All products as a flat array with proper brand storage method distribution
 * Each product gets its brandStorageMethod assigned based on its global index
 */
export const ALL_PRODUCTS: ProductDefinition[] = Object.values(
  PRODUCTS_BY_CATEGORY
).flat().map((product, index) => ({
  ...product,
  brandStorageMethod: getBrandStorageMethod(index),
}));

/**
 * Get products by type
 */
export function getProductsByType(type: 'simple' | 'variable' | 'grouped'): ProductDefinition[] {
  return ALL_PRODUCTS.filter((p) => p.type === type);
}

/**
 * Get products by brand storage method
 */
export function getProductsByBrandStorage(method: BrandStorageMethod): ProductDefinition[] {
  return ALL_PRODUCTS.filter((p) => p.brandStorageMethod === method);
}

/**
 * Product counts summary
 */
export const PRODUCT_COUNTS = {
  total: ALL_PRODUCTS.length,
  simple: getProductsByType('simple').length,
  variable: getProductsByType('variable').length,
  grouped: getProductsByType('grouped').length,
  variations: ALL_PRODUCTS.filter((p) => p.type === 'variable').reduce(
    (sum, p) => sum + (p.type === 'variable' ? p.variations.length : 0),
    0
  ),
  byCategory: Object.fromEntries(
    Object.entries(PRODUCTS_BY_CATEGORY).map(([cat, products]) => [
      cat,
      products.length,
    ])
  ),
  byBrandStorage: {
    taxonomy: getProductsByBrandStorage('taxonomy').length,
    attribute: getProductsByBrandStorage('attribute').length,
    meta: getProductsByBrandStorage('meta').length,
    none: getProductsByBrandStorage('none').length,
  },
};

// Re-export individual product arrays
export {
  TSHIRT_PRODUCTS,
  HOODIE_PRODUCTS,
  JACKET_PRODUCTS,
  PANTS_PRODUCTS,
  SHORTS_PRODUCTS,
  SNEAKER_PRODUCTS,
  BOOT_PRODUCTS,
  SANDAL_PRODUCTS,
  HAT_PRODUCTS,
  BAG_PRODUCTS,
  BELT_PRODUCTS,
};
