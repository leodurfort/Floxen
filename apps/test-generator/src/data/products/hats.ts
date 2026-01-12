/**
 * Hat product definitions
 * 45 total: 25 simple, 15 variable, 5 grouped
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

const CATEGORY = 'hats';

const HAT_ATTRIBUTES: ProductAttribute[] = [
  { name: 'Size', options: SIZES.HAT, visible: true, variation: true },
  { name: 'Color', options: COLORS.slice(0, 5), visible: true, variation: true },
];

function createHatVariations(
  baseSku: string,
  attrs: ProductAttribute[],
  basePrice: string
): VariationDefinition[] {
  const variations: VariationDefinition[] = [];
  const sizes = attrs.find((a) => a.name === 'Size')?.options || SIZES.HAT;
  const colors = attrs.find((a) => a.name === 'Color')?.options || COLORS.slice(0, 4);

  sizes.forEach((size) => {
    colors.forEach((color) => {
      const stock = randomStockStatus();
      variations.push({
        sku: `${baseSku}-${size.replace('/', '')}-${color.substring(0, 3).toUpperCase()}`,
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

export function generateHats(): ProductDefinition[] {
  const products: ProductDefinition[] = [];

  // Simple products (25)
  for (let i = 0; i < 25; i++) {
    products.push(createSimpleProduct(CATEGORY, i));
  }

  // Variable products (15)
  for (let i = 25; i < 40; i++) {
    const basePrice = randomPrice(CATEGORY);
    products.push(
      createVariableProduct(
        CATEGORY,
        i,
        HAT_ATTRIBUTES,
        (baseSku, attrs) => createHatVariations(baseSku, attrs, basePrice)
      )
    );
  }

  // Grouped products (5)
  const simpleSkus = products
    .filter((p) => p.type === 'simple')
    .map((p) => p.sku);

  for (let i = 0; i < 5; i++) {
    const childSkus = simpleSkus.slice(i * 5, i * 5 + 5);
    if (childSkus.length >= 2) {
      products.push(createGroupedProduct(CATEGORY, 40 + i, childSkus));
    }
  }

  return products;
}

export const HAT_PRODUCTS = generateHats();
