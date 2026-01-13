/**
 * Shorts product definitions
 * 40 total: 15 simple, 20 variable, 5 grouped
 */

import { ProductDefinition, ProductAttribute } from '@/types/product';
import {
  createSimpleProduct,
  createVariableProduct,
  createGroupedProduct,
  createClothingVariations,
  randomPrice,
  SIZES,
  COLORS,
} from '../product-generator-helpers';
import { getEdgeCaseOverride } from './edge-cases';

const CATEGORY = 'shorts';

const SHORTS_ATTRIBUTES: ProductAttribute[] = [
  { name: 'Size', options: SIZES.CLOTHING, visible: true, variation: true },
  { name: 'Color', options: COLORS.slice(0, 4), visible: true, variation: true },
];

export function generateShorts(): ProductDefinition[] {
  const products: ProductDefinition[] = [];

  // Simple products (15)
  for (let i = 0; i < 15; i++) {
    const edgeCaseOverride = getEdgeCaseOverride(CATEGORY, i);
    products.push(createSimpleProduct(CATEGORY, i, edgeCaseOverride));
  }

  // Variable products (20)
  for (let i = 15; i < 35; i++) {
    const basePrice = randomPrice(CATEGORY);
    products.push(
      createVariableProduct(
        CATEGORY,
        i,
        SHORTS_ATTRIBUTES,
        (baseSku, attrs) => createClothingVariations(baseSku, attrs, basePrice)
      )
    );
  }

  // Grouped products (5)
  const simpleSkus = products
    .filter((p) => p.type === 'simple')
    .map((p) => p.sku);

  for (let i = 0; i < 5; i++) {
    const childSkus = simpleSkus.slice(i * 3, i * 3 + 3);
    if (childSkus.length >= 2) {
      products.push(createGroupedProduct(CATEGORY, 35 + i, childSkus));
    }
  }

  return products;
}

export const SHORTS_PRODUCTS = generateShorts();
