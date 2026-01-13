/**
 * T-Shirt product definitions
 * 50 total: 15 simple, 30 variable, 5 grouped
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

const CATEGORY = 't-shirts';

// Standard attributes for variable t-shirts
const TSHIRT_ATTRIBUTES: ProductAttribute[] = [
  { name: 'Size', options: SIZES.CLOTHING, visible: true, variation: true },
  { name: 'Color', options: COLORS.slice(0, 5), visible: true, variation: true },
];

/**
 * Generate all t-shirt products
 */
export function generateTShirts(): ProductDefinition[] {
  const products: ProductDefinition[] = [];

  // Simple products (15)
  for (let i = 0; i < 15; i++) {
    const edgeCaseOverride = getEdgeCaseOverride(CATEGORY, i);
    products.push(createSimpleProduct(CATEGORY, i, edgeCaseOverride));
  }

  // Variable products (30)
  for (let i = 15; i < 45; i++) {
    const basePrice = randomPrice(CATEGORY);
    products.push(
      createVariableProduct(
        CATEGORY,
        i,
        TSHIRT_ATTRIBUTES,
        (baseSku, attrs) => createClothingVariations(baseSku, attrs, basePrice)
      )
    );
  }

  // Grouped products (5) - bundle simple products together
  const simpleSkus = products
    .filter((p) => p.type === 'simple')
    .map((p) => p.sku);

  for (let i = 0; i < 5; i++) {
    const childSkus = simpleSkus.slice(i * 3, i * 3 + 3);
    if (childSkus.length >= 2) {
      products.push(createGroupedProduct(CATEGORY, 45 + i, childSkus));
    }
  }

  return products;
}

export const TSHIRT_PRODUCTS = generateTShirts();
