/**
 * Hoodie product definitions
 * 40 total: 12 simple, 25 variable, 3 grouped
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

const CATEGORY = 'hoodies';

const HOODIE_ATTRIBUTES: ProductAttribute[] = [
  { name: 'Size', options: SIZES.CLOTHING, visible: true, variation: true },
  { name: 'Color', options: COLORS.slice(0, 4), visible: true, variation: true },
];

export function generateHoodies(): ProductDefinition[] {
  const products: ProductDefinition[] = [];

  // Simple products (12)
  for (let i = 0; i < 12; i++) {
    const edgeCaseOverride = getEdgeCaseOverride(CATEGORY, i);
    products.push(createSimpleProduct(CATEGORY, i, edgeCaseOverride));
  }

  // Variable products (25)
  for (let i = 12; i < 37; i++) {
    const basePrice = randomPrice(CATEGORY);
    products.push(
      createVariableProduct(
        CATEGORY,
        i,
        HOODIE_ATTRIBUTES,
        (baseSku, attrs) => createClothingVariations(baseSku, attrs, basePrice)
      )
    );
  }

  // Grouped products (3)
  const simpleSkus = products
    .filter((p) => p.type === 'simple')
    .map((p) => p.sku);

  for (let i = 0; i < 3; i++) {
    const childSkus = simpleSkus.slice(i * 4, i * 4 + 4);
    if (childSkus.length >= 2) {
      products.push(createGroupedProduct(CATEGORY, 37 + i, childSkus));
    }
  }

  return products;
}

export const HOODIE_PRODUCTS = generateHoodies();
