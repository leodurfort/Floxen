/**
 * Product data index - aggregates all product definitions
 */

import { ProductDefinition } from '@/types/product';
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
 * All products as a flat array
 */
export const ALL_PRODUCTS: ProductDefinition[] = Object.values(
  PRODUCTS_BY_CATEGORY
).flat();

/**
 * Get products by type
 */
export function getProductsByType(type: 'simple' | 'variable' | 'grouped'): ProductDefinition[] {
  return ALL_PRODUCTS.filter((p) => p.type === type);
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
