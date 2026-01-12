/**
 * Jacket product definitions
 * 40 total: 10 simple, 25 variable, 5 grouped
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

const CATEGORY = 'jackets';

const JACKET_ATTRIBUTES: ProductAttribute[] = [
  { name: 'Size', options: SIZES.CLOTHING, visible: true, variation: true },
  { name: 'Color', options: COLORS.slice(0, 4), visible: true, variation: true },
];

export function generateJackets(): ProductDefinition[] {
  const products: ProductDefinition[] = [];

  // Simple products (10)
  for (let i = 0; i < 10; i++) {
    products.push(createSimpleProduct(CATEGORY, i));
  }

  // Variable products (25)
  for (let i = 10; i < 35; i++) {
    const basePrice = randomPrice(CATEGORY);
    products.push(
      createVariableProduct(
        CATEGORY,
        i,
        JACKET_ATTRIBUTES,
        (baseSku, attrs) => createClothingVariations(baseSku, attrs, basePrice)
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
      products.push(createGroupedProduct(CATEGORY, 35 + i, childSkus));
    }
  }

  return products;
}

export const JACKET_PRODUCTS = generateJackets();
