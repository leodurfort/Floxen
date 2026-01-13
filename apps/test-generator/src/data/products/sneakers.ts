/**
 * Sneaker product definitions
 * 45 total: 10 simple, 30 variable, 5 grouped
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

const CATEGORY = 'sneakers';

const SNEAKER_ATTRIBUTES: ProductAttribute[] = [
  { name: 'Size', options: SIZES.SHOES_US, visible: true, variation: true },
  { name: 'Color', options: COLORS.slice(0, 4), visible: true, variation: true },
];

export function generateSneakers(): ProductDefinition[] {
  const products: ProductDefinition[] = [];

  // Simple products (10)
  for (let i = 0; i < 10; i++) {
    const edgeCaseOverride = getEdgeCaseOverride(CATEGORY, i);
    products.push(createSimpleProduct(CATEGORY, i, edgeCaseOverride));
  }

  // Variable products (30)
  for (let i = 10; i < 40; i++) {
    const basePrice = randomPrice(CATEGORY);
    products.push(
      createVariableProduct(
        CATEGORY,
        i,
        SNEAKER_ATTRIBUTES,
        (baseSku, attrs) => createShoeVariations(baseSku, attrs, basePrice)
      )
    );
  }

  // Grouped products (5)
  const simpleSkus = products
    .filter((p) => p.type === 'simple')
    .map((p) => p.sku);

  for (let i = 0; i < 5; i++) {
    const childSkus = simpleSkus.slice(i * 2, i * 2 + 2);
    if (childSkus.length >= 2) {
      products.push(createGroupedProduct(CATEGORY, 40 + i, childSkus));
    }
  }

  return products;
}

export const SNEAKER_PRODUCTS = generateSneakers();
