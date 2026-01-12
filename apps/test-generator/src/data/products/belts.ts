/**
 * Belt product definitions
 * 70 total: 31 simple, 35 variable, 4 grouped
 */

import { ProductDefinition, ProductAttribute, VariationDefinition } from '@/types/product';
import {
  createSimpleProduct,
  createVariableProduct,
  createGroupedProduct,
  randomPrice,
  maybeSalePrice,
  randomStockStatus,
  SIZES,
  COLORS,
} from '../product-generator-helpers';

const CATEGORY = 'belts';

const BELT_ATTRIBUTES: ProductAttribute[] = [
  { name: 'Size', options: SIZES.BELT, visible: true, variation: true },
  { name: 'Color', options: ['Black', 'Brown', 'Tan', 'Navy'], visible: true, variation: true },
];

function createBeltVariations(
  baseSku: string,
  attrs: ProductAttribute[],
  basePrice: string
): VariationDefinition[] {
  const variations: VariationDefinition[] = [];
  const sizes = attrs.find((a) => a.name === 'Size')?.options || SIZES.BELT;
  const colors = attrs.find((a) => a.name === 'Color')?.options || ['Black', 'Brown'];

  sizes.forEach((size) => {
    colors.forEach((color) => {
      const stock = randomStockStatus();
      variations.push({
        sku: `${baseSku}-${size.charAt(0)}-${color.substring(0, 3).toUpperCase()}`,
        regularPrice: basePrice,
        salePrice: maybeSalePrice(basePrice),
        stockQuantity: stock.quantity,
        stockStatus: stock.status,
        attributes: { Size: size, Color: color },
      });
    });
  });

  return variations;
}

export function generateBelts(): ProductDefinition[] {
  const products: ProductDefinition[] = [];

  // Simple products (31)
  for (let i = 0; i < 31; i++) {
    products.push(createSimpleProduct(CATEGORY, i));
  }

  // Variable products (35)
  for (let i = 31; i < 66; i++) {
    const basePrice = randomPrice(CATEGORY);
    products.push(
      createVariableProduct(
        CATEGORY,
        i,
        BELT_ATTRIBUTES,
        (baseSku, attrs) => createBeltVariations(baseSku, attrs, basePrice)
      )
    );
  }

  // Grouped products (4)
  const simpleSkus = products
    .filter((p) => p.type === 'simple')
    .map((p) => p.sku);

  for (let i = 0; i < 4; i++) {
    const childSkus = simpleSkus.slice(i * 7, i * 7 + 7);
    if (childSkus.length >= 2) {
      products.push(createGroupedProduct(CATEGORY, 66 + i, childSkus));
    }
  }

  return products;
}

export const BELT_PRODUCTS = generateBelts();
