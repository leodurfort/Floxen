/**
 * Boot product definitions
 * 40 total: 12 simple, 23 variable, 5 grouped
 */

import { ProductDefinition, ProductAttribute } from '@/types/product';
import {
  createSimpleProduct,
  createVariableProduct,
  createGroupedProduct,
  createShoeVariations,
  randomPrice,
  SIZES,
  COLORS,
} from '../product-generator-helpers';
import { getEdgeCaseOverride } from './edge-cases';

const CATEGORY = 'boots';

const BOOT_ATTRIBUTES: ProductAttribute[] = [
  { name: 'Size', options: SIZES.SHOES_US, visible: true, variation: true },
  { name: 'Color', options: ['Black', 'Brown', 'Tan', 'Gray'], visible: true, variation: true },
];

export function generateBoots(): ProductDefinition[] {
  const products: ProductDefinition[] = [];

  // Simple products (12)
  for (let i = 0; i < 12; i++) {
    const edgeCaseOverride = getEdgeCaseOverride(CATEGORY, i);
    products.push(createSimpleProduct(CATEGORY, i, edgeCaseOverride));
  }

  // Variable products (23)
  for (let i = 12; i < 35; i++) {
    const basePrice = randomPrice(CATEGORY);
    products.push(
      createVariableProduct(
        CATEGORY,
        i,
        BOOT_ATTRIBUTES,
        (baseSku, attrs) => createShoeVariations(baseSku, attrs, basePrice)
      )
    );
  }

  // Grouped products (5)
  const simpleSkus = products
    .filter((p) => p.type === 'simple')
    .map((p) => p.sku);

  for (let i = 0; i < 5; i++) {
    const childSkus = simpleSkus.slice(i * 2, i * 2 + 3);
    if (childSkus.length >= 2) {
      products.push(createGroupedProduct(CATEGORY, 35 + i, childSkus));
    }
  }

  return products;
}

export const BOOT_PRODUCTS = generateBoots();
