/**
 * Sandal product definitions
 * 40 total: 18 simple, 17 variable, 5 grouped
 */

import { ProductDefinition, ProductAttribute } from '@/types/product';
import {
  createSimpleProduct,
  createVariableProduct,
  createGroupedProduct,
  createShoeVariations,
  randomPrice,
  SIZES,
} from '../product-generator-helpers';

const CATEGORY = 'sandals';

const SANDAL_ATTRIBUTES: ProductAttribute[] = [
  { name: 'Size', options: SIZES.SHOES_US.slice(0, 6), visible: true, variation: true },
  { name: 'Color', options: ['Black', 'Brown', 'Navy', 'Tan'], visible: true, variation: true },
];

export function generateSandals(): ProductDefinition[] {
  const products: ProductDefinition[] = [];

  // Simple products (18)
  for (let i = 0; i < 18; i++) {
    products.push(createSimpleProduct(CATEGORY, i));
  }

  // Variable products (17)
  for (let i = 18; i < 35; i++) {
    const basePrice = randomPrice(CATEGORY);
    products.push(
      createVariableProduct(
        CATEGORY,
        i,
        SANDAL_ATTRIBUTES,
        (baseSku, attrs) => createShoeVariations(baseSku, attrs, basePrice)
      )
    );
  }

  // Grouped products (5)
  const simpleSkus = products
    .filter((p) => p.type === 'simple')
    .map((p) => p.sku);

  for (let i = 0; i < 5; i++) {
    const childSkus = simpleSkus.slice(i * 3, i * 3 + 4);
    if (childSkus.length >= 2) {
      products.push(createGroupedProduct(CATEGORY, 35 + i, childSkus));
    }
  }

  return products;
}

export const SANDAL_PRODUCTS = generateSandals();
